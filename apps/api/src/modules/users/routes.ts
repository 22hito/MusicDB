import { endpoints, type Profile, type UserCard } from "@musicdb/contracts";
import { artists, type DbOrTx, indexEntities, playlists, userBlocks, userFollows, users } from "@musicdb/db";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { Deps, SessionUser } from "../../context";
import { offsetPage, readOffset } from "../../http/cursor";
import { implement } from "../../http/endpoint";
import { badRequest, notFound } from "../../http/errors";
import {
  artistColumns,
  hydratePlaylists,
  iso,
  loadTracks,
  rowsOf,
  toArtist,
  toUserRef,
} from "../catalog/hydrate";
import { isBlockedBetween, notify } from "../social/notify";

async function findUser(db: DbOrTx, idOrUsername: string) {
  const [u] = await db
    .select()
    .from(users)
    .where(
      and(
        or(eq(users.id, idOrUsername), eq(users.username, idOrUsername.toLowerCase())),
        isNull(users.deletedAt),
      ),
    );
  if (!u || u.banned) throw notFound("user");
  return u;
}

async function relation(db: DbOrTx, viewerId: string, targetId: string) {
  const rows = await db
    .select({ f: userFollows.followerId, t: userFollows.followeeId })
    .from(userFollows)
    .where(
      or(
        and(eq(userFollows.followerId, viewerId), eq(userFollows.followeeId, targetId)),
        and(eq(userFollows.followerId, targetId), eq(userFollows.followeeId, viewerId)),
      ),
    );
  return {
    following: rows.some((r) => r.f === viewerId),
    followsYou: rows.some((r) => r.f === targetId),
  };
}

/** Косинусна схожість ваг виконавців двох людей (0–100) або null, якщо даних замало. */
export async function tasteMatch(db: DbOrTx, a: string, b: string): Promise<number | null> {
  const res = await db.execute(sql`
    with w as (
      select user_id, artist_id, sum(weight)::float w from (
        select l.user_id, ta.artist_id, 1.0 weight from track_likes l join track_artists ta on ta.track_id = l.track_id
          where l.user_id in (${a}, ${b})
        union all
        select p.user_id, ta.artist_id, 0.3 from plays p join track_artists ta on ta.track_id = p.track_id
          where p.user_id in (${a}, ${b}) and p.played_at > now() - interval '180 days'
      ) x group by user_id, artist_id
    ),
    n as (select user_id, sqrt(sum(w * w)) n, count(*) c from w group by user_id)
    select (select sum(x.w * y.w) from w x join w y on y.artist_id = x.artist_id and x.user_id = ${a} and y.user_id = ${b})::float dot,
      (select n from n where user_id = ${a})::float na, (select n from n where user_id = ${b})::float nb,
      (select c from n where user_id = ${a})::int ca, (select c from n where user_id = ${b})::int cb`);
  const [r] = rowsOf<{
    dot: number | null;
    na: number | null;
    nb: number | null;
    ca: number | null;
    cb: number | null;
  }>(res);
  if (!r?.na || !r.nb || (r.ca ?? 0) < 3 || (r.cb ?? 0) < 3) return null;
  return Math.round(Math.min(1, (r.dot ?? 0) / (r.na * r.nb)) * 100);
}

async function cards(deps: Deps, ids: string[], viewer: SessionUser | null): Promise<UserCard[]> {
  if (ids.length === 0) return [];
  const rows = await deps.db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      image: users.image,
      followerCount: users.followerCount,
    })
    .from(users)
    .where(inArray(users.id, ids));
  let following = new Set<string>();
  let followers = new Set<string>();
  if (viewer) {
    const rel = await deps.db
      .select({ f: userFollows.followerId, t: userFollows.followeeId })
      .from(userFollows)
      .where(
        or(
          and(eq(userFollows.followerId, viewer.id), inArray(userFollows.followeeId, ids)),
          and(inArray(userFollows.followerId, ids), eq(userFollows.followeeId, viewer.id)),
        ),
      );
    following = new Set(rel.filter((r) => r.f === viewer.id).map((r) => r.t));
    followers = new Set(rel.filter((r) => r.t === viewer.id).map((r) => r.f));
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    if (!r) return [];
    return [
      {
        ...toUserRef(r),
        followerCount: r.followerCount,
        viewer: viewer ? { following: following.has(id), followsYou: followers.has(id) } : null,
      },
    ];
  });
}

async function adjustFollowCounts(db: DbOrTx, followerId: string, followeeId: string, delta: 1 | -1) {
  await db
    .update(users)
    .set({ followingCount: sql`greatest(${users.followingCount} + ${delta}, 0)` })
    .where(eq(users.id, followerId));
  await db
    .update(users)
    .set({ followerCount: sql`greatest(${users.followerCount} + ${delta}, 0)` })
    .where(eq(users.id, followeeId));
}

export const userRoutes = [
  implement(endpoints.users.common, async ({ deps, user, params }) => {
    const db = deps.db;
    const target = await findUser(db, params.id);
    if (target.id === user.id) return { items: [] };
    if (await isBlockedBetween(db, user.id, target.id)) throw notFound("user");
    const rel = await relation(db, user.id, target.id);
    // Приватний профіль: спільне бачать лише друзі (взаємна підписка).
    if (target.isPrivate && !(rel.following && rel.followsYou)) return { items: [] };
    const side = (id: string) => sql`(
      select track_id, max(w) w from (
        select track_id, 2 w from track_likes where user_id = ${id}
        union all
        select track_id, 1 from plays where user_id = ${id} and played_at > now() - interval '365 days'
      ) s group by track_id)`;
    const rows = rowsOf<{ id: string }>(
      await db.execute(sql`
        select t.id from ${side(user.id)} a join ${side(target.id)} b using (track_id)
        join tracks t on t.id = a.track_id and t.status = 'published'
        order by a.w + b.w desc, t.play_count desc, t.id limit 50`),
    );
    return {
      items: await loadTracks(
        db,
        rows.map((r) => r.id),
      ),
    };
  }),

  implement(endpoints.users.get, async ({ deps, user, params }) => {
    const db = deps.db;
    const target = await findUser(db, params.id);
    const isSelf = user?.id === target.id;
    if (user && !isSelf && (await isBlockedBetween(db, user.id, target.id))) {
      const [blockedByMe] = await db
        .select({ x: userBlocks.blockerId })
        .from(userBlocks)
        .where(and(eq(userBlocks.blockerId, user.id), eq(userBlocks.blockedId, target.id)));
      if (!blockedByMe) throw notFound("user");
    }
    const rel =
      user && !isSelf ? await relation(db, user.id, target.id) : { following: false, followsYou: false };
    const canSeeActivity = isSelf || !target.isPrivate || (rel.following && rel.followsYou);

    const [ownPlaylists, topArtistRows, recentRes, match, blocked] = await Promise.all([
      db
        .select()
        .from(playlists)
        .where(and(eq(playlists.ownerId, target.id), isSelf ? undefined : eq(playlists.visibility, "public")))
        .orderBy(desc(playlists.updatedAt))
        .limit(24),
      canSeeActivity
        ? db.execute(sql`
            select ta.artist_id, count(*) n from plays p join track_artists ta on ta.track_id = p.track_id
            where p.user_id = ${target.id} and p.played_at > now() - interval '90 days' and ta.position = 0
            group by ta.artist_id order by n desc limit 8`)
        : Promise.resolve([]),
      canSeeActivity
        ? db.execute(sql`
            select track_id from (select track_id, max(played_at) last from plays where user_id = ${target.id} group by track_id) x
            order by last desc limit 10`)
        : Promise.resolve([]),
      user && !isSelf ? tasteMatch(db, user.id, target.id) : Promise.resolve(null),
      user && !isSelf
        ? db
            .select({ x: userBlocks.blockerId })
            .from(userBlocks)
            .where(and(eq(userBlocks.blockerId, user.id), eq(userBlocks.blockedId, target.id)))
        : Promise.resolve([]),
    ]);
    const artistIds = rowsOf<{ artist_id: string }>(topArtistRows).map((r) => r.artist_id);
    const artistRows = artistIds.length
      ? await db.select(artistColumns).from(artists).where(inArray(artists.id, artistIds))
      : [];
    const artistOrder = new Map(artistIds.map((id, i) => [id, i]));

    const profile: Profile = {
      id: target.id,
      username: target.username,
      name: target.name,
      image: target.image,
      bio: target.bio,
      isPrivate: target.isPrivate,
      followerCount: target.followerCount,
      followingCount: target.followingCount,
      publicPlaylists: await hydratePlaylists(db, ownPlaylists),
      topArtists: artistRows
        .map(toArtist)
        .sort((a, b) => (artistOrder.get(a.id) ?? 0) - (artistOrder.get(b.id) ?? 0)),
      recentlyPlayed: await loadTracks(
        db,
        rowsOf<{ track_id: string }>(recentRes).map((r) => r.track_id),
      ),
      createdAt: iso(target.createdAt),
      viewer: user ? { isSelf, ...rel, blocked: blocked.length > 0, tasteMatch: match } : null,
    };
    return profile;
  }),

  implement(endpoints.users.playlists, async ({ deps, user, params, query }) => {
    const target = await findUser(deps.db, params.id);
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select()
      .from(playlists)
      .where(
        and(
          eq(playlists.ownerId, target.id),
          user?.id === target.id ? undefined : eq(playlists.visibility, "public"),
        ),
      )
      .orderBy(desc(playlists.updatedAt))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return { items: await hydratePlaylists(deps.db, page.items), nextCursor: page.nextCursor };
  }),

  implement(endpoints.users.followers, async ({ deps, user, params, query }) => {
    const target = await findUser(deps.db, params.id);
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select({ id: userFollows.followerId })
      .from(userFollows)
      .where(eq(userFollows.followeeId, target.id))
      .orderBy(desc(userFollows.createdAt))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return {
      items: await cards(
        deps,
        page.items.map((r) => r.id),
        user,
      ),
      nextCursor: page.nextCursor,
    };
  }),

  implement(endpoints.users.following, async ({ deps, user, params, query }) => {
    const target = await findUser(deps.db, params.id);
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select({ id: userFollows.followeeId })
      .from(userFollows)
      .where(eq(userFollows.followerId, target.id))
      .orderBy(desc(userFollows.createdAt))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return {
      items: await cards(
        deps,
        page.items.map((r) => r.id),
        user,
      ),
      nextCursor: page.nextCursor,
    };
  }),

  implement(endpoints.users.follow, async ({ deps, user, params }) => {
    const target = await findUser(deps.db, params.id);
    if (target.id === user.id) throw badRequest("cannot_follow_self", "Не можна підписатися на себе");
    if (await isBlockedBetween(deps.db, user.id, target.id))
      throw badRequest("blocked", "Підписка недоступна");
    const inserted = await deps.db
      .insert(userFollows)
      .values({ followerId: user.id, followeeId: target.id })
      .onConflictDoNothing()
      .returning({ id: userFollows.followeeId });
    if (inserted.length) {
      await adjustFollowCounts(deps.db, user.id, target.id, 1);
      await indexEntities(deps.db, "user", [target.id]);
      await notify(deps, [target.id], {
        type: "follow",
        actorId: user.id,
        entityType: "user",
        entityId: user.id,
      });
    }
  }),

  implement(endpoints.users.unfollow, async ({ deps, user, params }) => {
    const target = await findUser(deps.db, params.id);
    const removed = await deps.db
      .delete(userFollows)
      .where(and(eq(userFollows.followerId, user.id), eq(userFollows.followeeId, target.id)))
      .returning({ id: userFollows.followeeId });
    if (removed.length) await adjustFollowCounts(deps.db, user.id, target.id, -1);
  }),

  implement(endpoints.users.block, async ({ deps, user, params }) => {
    const target = await findUser(deps.db, params.id);
    if (target.id === user.id) throw badRequest("cannot_block_self", "Не можна заблокувати себе");
    await deps.db.transaction(async (tx) => {
      await tx.insert(userBlocks).values({ blockerId: user.id, blockedId: target.id }).onConflictDoNothing();
      // Блокування розриває підписки в обидва боки.
      for (const [a, b] of [
        [user.id, target.id],
        [target.id, user.id],
      ] as const) {
        const removed = await tx
          .delete(userFollows)
          .where(and(eq(userFollows.followerId, a), eq(userFollows.followeeId, b)))
          .returning({ id: userFollows.followeeId });
        if (removed.length) await adjustFollowCounts(tx, a, b, -1);
      }
    });
  }),

  implement(endpoints.users.unblock, async ({ deps, user, params }) => {
    await deps.db
      .delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, user.id), eq(userBlocks.blockedId, params.id)));
  }),
];
