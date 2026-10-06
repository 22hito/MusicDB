import { endpoints, type PlaylistDetail } from "@musicdb/contracts";
import {
  type DbOrTx,
  indexEntities,
  playlistFollows,
  playlistItems,
  playlists,
  removeFromIndex,
  tracks,
  userFollows,
} from "@musicdb/db";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import type { Deps, SessionUser } from "../../context";
import { offsetPage, readOffset } from "../../http/cursor";
import { implement } from "../../http/endpoint";
import { badRequest, forbidden, notFound } from "../../http/errors";
import { hydratePlaylists, iso, loadTracks, loadUserRefs, publishedTracks } from "../catalog/hydrate";
import { imageUrlFromUpload } from "../me/routes";

const MAX_ITEMS = 10_000;

export async function areFriends(db: DbOrTx, a: string, b: string) {
  const rows = await db
    .select({ follower: userFollows.followerId })
    .from(userFollows)
    .where(
      sql`(${userFollows.followerId} = ${a} and ${userFollows.followeeId} = ${b}) or (${userFollows.followerId} = ${b} and ${userFollows.followeeId} = ${a})`,
    );
  return rows.length === 2;
}

async function loadPlaylist(db: DbOrTx, id: string) {
  const [p] = await db.select().from(playlists).where(eq(playlists.id, id));
  if (!p) throw notFound("playlist");
  return p;
}

async function access(deps: Deps, p: typeof playlists.$inferSelect, user: SessionUser | null) {
  const isOwner = !!user && user.id === p.ownerId;
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const canView = p.visibility !== "private" || isOwner || isStaff;
  const canEdit = isOwner || (!!user && p.collaborative && (await areFriends(deps.db, user.id, p.ownerId)));
  return { isOwner, canView, canEdit };
}

async function requireEdit(deps: Deps, id: string, user: SessionUser) {
  const p = await loadPlaylist(deps.db, id);
  const a = await access(deps, p, user);
  if (!a.canView) throw notFound("playlist");
  if (!a.canEdit) throw forbidden("playlist_readonly", "Цей плейлист може змінювати лише власник");
  return { playlist: p, ...a };
}

/** Перераховує кількість і тривалість, оновлює updatedAt і пошуковий індекс. */
async function touch(deps: Deps, id: string) {
  await deps.db.execute(sql`
    update ${playlists} p set
      track_count = (select count(*) from ${playlistItems} i where i.playlist_id = p.id),
      duration_ms = coalesce((select sum(t.duration_ms) from ${playlistItems} i join ${tracks} t on t.id = i.track_id where i.playlist_id = p.id), 0),
      updated_at = now()
    where p.id = ${id}`);
  const p = await loadPlaylist(deps.db, id);
  if (p.visibility === "public") await indexEntities(deps.db, "playlist", [id]);
  else await removeFromIndex(deps.db, "playlist", [id]);
}

async function lastPosition(db: DbOrTx, playlistId: string) {
  const [last] = await db
    .select({ position: playlistItems.position })
    .from(playlistItems)
    .where(eq(playlistItems.playlistId, playlistId))
    .orderBy(desc(playlistItems.position))
    .limit(1);
  return last?.position ?? null;
}

async function positionsAfter(
  db: DbOrTx,
  playlistId: string,
  afterItemId: string | null | undefined,
  n: number,
) {
  if (afterItemId === undefined) return generateNKeysBetween(await lastPosition(db, playlistId), null, n);
  let before: string | null = null;
  if (afterItemId !== null) {
    const [anchor] = await db
      .select({ position: playlistItems.position })
      .from(playlistItems)
      .where(and(eq(playlistItems.id, afterItemId), eq(playlistItems.playlistId, playlistId)));
    if (!anchor) throw badRequest("anchor_not_found", "Елемент, після якого вставляти, не знайдено");
    before = anchor.position;
  }
  const [next] = await db
    .select({ position: playlistItems.position })
    .from(playlistItems)
    .where(
      and(eq(playlistItems.playlistId, playlistId), before ? gt(playlistItems.position, before) : undefined),
    )
    .orderBy(asc(playlistItems.position))
    .limit(1);
  return generateNKeysBetween(before, next?.position ?? null, n);
}

async function insertItems(
  deps: Deps,
  playlistId: string,
  trackIds: string[],
  addedBy: string,
  afterItemId?: string | null,
) {
  const existing = await deps.db
    .select({ id: tracks.id })
    .from(tracks)
    .where(and(inArray(tracks.id, [...new Set(trackIds)]), publishedTracks));
  const valid = new Set(existing.map((t) => t.id));
  const ids = trackIds.filter((id) => valid.has(id));
  if (ids.length === 0) return [];
  const [{ n } = { n: 0 }] = await deps.db
    .select({ n: sql<number>`count(*)::int` })
    .from(playlistItems)
    .where(eq(playlistItems.playlistId, playlistId));
  if (n + ids.length > MAX_ITEMS)
    throw badRequest("playlist_full", `У плейлисті може бути до ${MAX_ITEMS} треків`);
  const positions = await positionsAfter(deps.db, playlistId, afterItemId, ids.length);
  return deps.db
    .insert(playlistItems)
    .values(ids.map((trackId, i) => ({ playlistId, trackId, position: positions[i]!, addedBy })))
    .returning();
}

export const playlistRoutes = [
  implement(endpoints.playlists.create, async ({ deps, user, body }) => {
    const [p] = await deps.db
      .insert(playlists)
      .values({
        ownerId: user.id,
        title: body.title,
        description: body.description ?? null,
        visibility: body.visibility,
      })
      .returning();
    if (body.trackIds.length) await insertItems(deps, p!.id, body.trackIds, user.id);
    await touch(deps, p!.id);
    deps.realtime.publish(user.id, { type: "library.changed", scope: "playlists" });
    const [hydrated] = await hydratePlaylists(deps.db, [await loadPlaylist(deps.db, p!.id)]);
    return hydrated!;
  }),

  implement(endpoints.playlists.browse, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select()
      .from(playlists)
      .where(
        and(
          eq(playlists.visibility, "public"),
          sql`${playlists.trackCount} >= ${Math.max(1, query.minTracks)}`,
          sql`exists (select 1 from users u where u.id = ${playlists.ownerId} and u.deleted_at is null)`,
        ),
      )
      .orderBy(
        ...(query.sort === "recent"
          ? [desc(playlists.updatedAt)]
          : [desc(playlists.followerCount), desc(playlists.trackCount), desc(playlists.updatedAt)]),
        asc(playlists.id),
      )
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return { items: await hydratePlaylists(deps.db, page.items), nextCursor: page.nextCursor };
  }),

  implement(endpoints.playlists.get, async ({ deps, user, params }) => {
    const p = await loadPlaylist(deps.db, params.id);
    const a = await access(deps, p, user);
    if (!a.canView) throw notFound("playlist");
    const items = await deps.db
      .select()
      .from(playlistItems)
      .where(eq(playlistItems.playlistId, p.id))
      .orderBy(asc(playlistItems.position))
      .limit(MAX_ITEMS);
    const [[hydrated], trackList, adders, following] = await Promise.all([
      hydratePlaylists(deps.db, [p]),
      loadTracks(
        deps.db,
        items.map((i) => i.trackId),
      ),
      loadUserRefs(
        deps.db,
        items.map((i) => i.addedBy),
      ),
      user
        ? deps.db
            .select({ one: sql<number>`1` })
            .from(playlistFollows)
            .where(and(eq(playlistFollows.userId, user.id), eq(playlistFollows.playlistId, p.id)))
        : Promise.resolve([]),
    ]);
    const byId = new Map(trackList.map((t) => [t.id, t]));
    const detail: PlaylistDetail = {
      ...hydrated!,
      items: items.flatMap((i) => {
        const track = byId.get(i.trackId);
        if (!track) return [];
        return [
          {
            id: i.id,
            track,
            addedAt: iso(i.addedAt),
            addedBy: i.addedBy ? (adders.get(i.addedBy) ?? null) : null,
          },
        ];
      }),
      viewer: user ? { isOwner: a.isOwner, canEdit: a.canEdit, following: following.length > 0 } : null,
    };
    return detail;
  }),

  implement(endpoints.playlists.update, async ({ deps, user, params, body }) => {
    const { playlist, isOwner } = await requireEdit(deps, params.id, user);
    const patch: Partial<typeof playlists.$inferInsert> = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    // Видимість, спільний доступ і обкладинку змінює лише власник.
    if (isOwner) {
      if (body.visibility !== undefined) patch.visibility = body.visibility;
      if (body.collaborative !== undefined) patch.collaborative = body.collaborative;
      if (body.coverUploadId !== undefined) {
        patch.coverUrl = body.coverUploadId ? await imageUrlFromUpload(deps, user, body.coverUploadId) : null;
      }
    }
    if (Object.keys(patch).length)
      await deps.db.update(playlists).set(patch).where(eq(playlists.id, playlist.id));
    await touch(deps, playlist.id);
    deps.realtime.publish(playlist.ownerId, { type: "playlist.changed", playlistId: playlist.id });
    const [hydrated] = await hydratePlaylists(deps.db, [await loadPlaylist(deps.db, playlist.id)]);
    return hydrated!;
  }),

  implement(endpoints.playlists.delete, async ({ deps, user, params }) => {
    const p = await loadPlaylist(deps.db, params.id);
    if (p.ownerId !== user.id && user.role !== "admin") throw forbidden();
    await deps.db.delete(playlists).where(eq(playlists.id, p.id));
    await removeFromIndex(deps.db, "playlist", [p.id]);
    deps.realtime.publish(p.ownerId, { type: "library.changed", scope: "playlists" });
  }),

  implement(endpoints.playlists.addItems, async ({ deps, user, params, body }) => {
    const { playlist } = await requireEdit(deps, params.id, user);
    const inserted = await insertItems(deps, playlist.id, body.trackIds, user.id, body.afterItemId);
    await touch(deps, playlist.id);
    deps.realtime.publish(playlist.ownerId, { type: "playlist.changed", playlistId: playlist.id });
    const trackList = await loadTracks(
      deps.db,
      inserted.map((i) => i.trackId),
    );
    const byId = new Map(trackList.map((t) => [t.id, t]));
    const adder = { id: user.id, username: null, name: user.name, image: user.image };
    return {
      items: inserted.flatMap((i) => {
        const track = byId.get(i.trackId);
        return track ? [{ id: i.id, track, addedAt: iso(i.addedAt), addedBy: adder }] : [];
      }),
    };
  }),

  implement(endpoints.playlists.removeItem, async ({ deps, user, params }) => {
    const { playlist } = await requireEdit(deps, params.id, user);
    const removed = await deps.db
      .delete(playlistItems)
      .where(and(eq(playlistItems.id, params.itemId), eq(playlistItems.playlistId, playlist.id)))
      .returning({ id: playlistItems.id });
    if (removed.length === 0) throw notFound("playlist_item");
    await touch(deps, playlist.id);
    deps.realtime.publish(playlist.ownerId, { type: "playlist.changed", playlistId: playlist.id });
  }),

  implement(endpoints.playlists.moveItem, async ({ deps, user, params, body }) => {
    const { playlist } = await requireEdit(deps, params.id, user);
    if (body.afterItemId === params.itemId) return;
    const [item] = await deps.db
      .select({ id: playlistItems.id })
      .from(playlistItems)
      .where(and(eq(playlistItems.id, params.itemId), eq(playlistItems.playlistId, playlist.id)));
    if (!item) throw notFound("playlist_item");
    let position: string;
    if (body.afterItemId === null) {
      const [first] = await deps.db
        .select({ position: playlistItems.position })
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, playlist.id))
        .orderBy(asc(playlistItems.position))
        .limit(1);
      position = generateKeyBetween(null, first?.position ?? null);
    } else {
      [position] = (await positionsAfter(deps.db, playlist.id, body.afterItemId, 1)) as [string];
    }
    await deps.db.update(playlistItems).set({ position }).where(eq(playlistItems.id, item.id));
    await deps.db.update(playlists).set({ updatedAt: new Date() }).where(eq(playlists.id, playlist.id));
    deps.realtime.publish(playlist.ownerId, { type: "playlist.changed", playlistId: playlist.id });
  }),

  implement(endpoints.playlists.follow, async ({ deps, user, params }) => {
    const p = await loadPlaylist(deps.db, params.id);
    if (p.visibility === "private" || p.ownerId === user.id)
      throw badRequest("cannot_follow", "Цей плейлист не можна зберегти");
    const inserted = await deps.db
      .insert(playlistFollows)
      .values({ userId: user.id, playlistId: p.id })
      .onConflictDoNothing()
      .returning({ id: playlistFollows.playlistId });
    if (inserted.length) {
      await deps.db
        .update(playlists)
        .set({ followerCount: sql`${playlists.followerCount} + 1` })
        .where(eq(playlists.id, p.id));
    }
    deps.realtime.publish(user.id, { type: "library.changed", scope: "playlists" });
  }),

  implement(endpoints.playlists.unfollow, async ({ deps, user, params }) => {
    const removed = await deps.db
      .delete(playlistFollows)
      .where(and(eq(playlistFollows.userId, user.id), eq(playlistFollows.playlistId, params.id)))
      .returning({ id: playlistFollows.playlistId });
    if (removed.length) {
      await deps.db
        .update(playlists)
        .set({ followerCount: sql`greatest(${playlists.followerCount} - 1, 0)` })
        .where(eq(playlists.id, params.id));
    }
    deps.realtime.publish(user.id, { type: "library.changed", scope: "playlists" });
  }),
];
