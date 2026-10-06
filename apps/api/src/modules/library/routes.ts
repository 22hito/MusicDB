import { endpoints, type PlayContext } from "@musicdb/contracts";
import {
  artistFollows,
  artists,
  playlistFollows,
  playlists,
  plays,
  releaseSaves,
  releases,
  trackLikes,
  tracks,
} from "@musicdb/db";
import { and, count, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "../../http/cursor";
import { implement } from "../../http/endpoint";
import { notFound } from "../../http/errors";
import {
  artistColumns,
  hydratePlaylists,
  hydrateReleases,
  iso,
  loadTracks,
  publishedTracks,
  releaseColumns,
  toArtist,
} from "../catalog/hydrate";

type TimeCursor = { t: string; id: string };

async function ensureTrack(db: Parameters<typeof loadTracks>[0], id: string) {
  const [row] = await db
    .select({ id: tracks.id, durationMs: tracks.durationMs })
    .from(tracks)
    .where(and(eq(tracks.id, id), publishedTracks));
  if (!row) throw notFound("track");
  return row;
}

export const libraryRoutes = [
  implement(endpoints.library.overview, async ({ deps, user }) => {
    const db = deps.db;
    const [ownPlaylists, followed, followedArtists, savedReleases, [liked]] = await Promise.all([
      db.select().from(playlists).where(eq(playlists.ownerId, user.id)).orderBy(desc(playlists.updatedAt)),
      db
        .select({ p: playlists })
        .from(playlistFollows)
        .innerJoin(playlists, eq(playlists.id, playlistFollows.playlistId))
        .where(and(eq(playlistFollows.userId, user.id), sql`${playlists.visibility} <> 'private'`))
        .orderBy(desc(playlistFollows.createdAt)),
      db
        .select(artistColumns)
        .from(artistFollows)
        .innerJoin(artists, eq(artists.id, artistFollows.artistId))
        .where(eq(artistFollows.userId, user.id))
        .orderBy(desc(artistFollows.createdAt)),
      db
        .select(releaseColumns)
        .from(releaseSaves)
        .innerJoin(releases, eq(releases.id, releaseSaves.releaseId))
        .where(eq(releaseSaves.userId, user.id))
        .orderBy(desc(releaseSaves.createdAt)),
      db.select({ n: count() }).from(trackLikes).where(eq(trackLikes.userId, user.id)),
    ]);
    return {
      likedCount: liked?.n ?? 0,
      playlists: await hydratePlaylists(db, [...ownPlaylists, ...followed.map((f) => f.p)]),
      artists: followedArtists.map(toArtist),
      releases: await hydrateReleases(db, savedReleases),
    };
  }),

  implement(endpoints.library.likedTracks, async ({ deps, user, query }) => {
    const cursor = decodeCursor<TimeCursor>(query.cursor);
    const rows = await deps.db
      .select({ trackId: trackLikes.trackId, createdAt: trackLikes.createdAt })
      .from(trackLikes)
      .where(
        and(
          eq(trackLikes.userId, user.id),
          cursor
            ? or(
                lt(trackLikes.createdAt, new Date(cursor.t)),
                and(eq(trackLikes.createdAt, new Date(cursor.t)), gt(trackLikes.trackId, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(trackLikes.createdAt), trackLikes.trackId)
      .limit(query.limit + 1);
    const pageRows = rows.slice(0, query.limit);
    const hydrated = await loadTracks(
      deps.db,
      pageRows.map((r) => r.trackId),
    );
    const byId = new Map(hydrated.map((t) => [t.id, t]));
    const last = pageRows.at(-1);
    return {
      items: pageRows.flatMap((r) => {
        const track = byId.get(r.trackId);
        return track ? [{ track, likedAt: iso(r.createdAt) }] : [];
      }),
      nextCursor:
        rows.length > query.limit && last ? encodeCursor({ t: iso(last.createdAt), id: last.trackId }) : null,
    };
  }),

  implement(endpoints.library.likedIds, async ({ deps, user }) => {
    const rows = await deps.db
      .select({ id: trackLikes.trackId })
      .from(trackLikes)
      .where(eq(trackLikes.userId, user.id));
    return { ids: rows.map((r) => r.id) };
  }),

  implement(endpoints.library.likeTrack, async ({ deps, user, params }) => {
    await ensureTrack(deps.db, params.id);
    const inserted = await deps.db
      .insert(trackLikes)
      .values({ userId: user.id, trackId: params.id })
      .onConflictDoNothing()
      .returning({ id: trackLikes.trackId });
    if (inserted.length) {
      await deps.db
        .update(tracks)
        .set({ likeCount: sql`${tracks.likeCount} + 1` })
        .where(eq(tracks.id, params.id));
    }
    deps.realtime.publish(user.id, { type: "library.changed", scope: "likes" });
  }),

  implement(endpoints.library.unlikeTrack, async ({ deps, user, params }) => {
    const removed = await deps.db
      .delete(trackLikes)
      .where(and(eq(trackLikes.userId, user.id), eq(trackLikes.trackId, params.id)))
      .returning({ id: trackLikes.trackId });
    if (removed.length) {
      await deps.db
        .update(tracks)
        .set({ likeCount: sql`greatest(${tracks.likeCount} - 1, 0)` })
        .where(eq(tracks.id, params.id));
    }
    deps.realtime.publish(user.id, { type: "library.changed", scope: "likes" });
  }),

  implement(endpoints.library.saveRelease, async ({ deps, user, params }) => {
    const [r] = await deps.db.select({ id: releases.id }).from(releases).where(eq(releases.id, params.id));
    if (!r) throw notFound("release");
    await deps.db
      .insert(releaseSaves)
      .values({ userId: user.id, releaseId: params.id })
      .onConflictDoNothing();
    deps.realtime.publish(user.id, { type: "library.changed", scope: "releases" });
  }),

  implement(endpoints.library.unsaveRelease, async ({ deps, user, params }) => {
    await deps.db
      .delete(releaseSaves)
      .where(and(eq(releaseSaves.userId, user.id), eq(releaseSaves.releaseId, params.id)));
    deps.realtime.publish(user.id, { type: "library.changed", scope: "releases" });
  }),

  implement(endpoints.library.followArtist, async ({ deps, user, params }) => {
    const [a] = await deps.db.select({ id: artists.id }).from(artists).where(eq(artists.id, params.id));
    if (!a) throw notFound("artist");
    const inserted = await deps.db
      .insert(artistFollows)
      .values({ userId: user.id, artistId: params.id })
      .onConflictDoNothing()
      .returning({ id: artistFollows.artistId });
    if (inserted.length) {
      await deps.db
        .update(artists)
        .set({ followerCount: sql`${artists.followerCount} + 1` })
        .where(eq(artists.id, params.id));
    }
    deps.realtime.publish(user.id, { type: "library.changed", scope: "follows" });
  }),

  implement(endpoints.library.unfollowArtist, async ({ deps, user, params }) => {
    const removed = await deps.db
      .delete(artistFollows)
      .where(and(eq(artistFollows.userId, user.id), eq(artistFollows.artistId, params.id)))
      .returning({ id: artistFollows.artistId });
    if (removed.length) {
      await deps.db
        .update(artists)
        .set({ followerCount: sql`greatest(${artists.followerCount} - 1, 0)` })
        .where(eq(artists.id, params.id));
    }
    deps.realtime.publish(user.id, { type: "library.changed", scope: "follows" });
  }),

  implement(endpoints.library.history, async ({ deps, user, query }) => {
    const cursor = decodeCursor<{ id: number }>(query.cursor);
    const rows = await deps.db
      .select({
        id: plays.id,
        trackId: plays.trackId,
        playedAt: plays.playedAt,
        contextType: plays.contextType,
        contextId: plays.contextId,
      })
      .from(plays)
      .where(and(eq(plays.userId, user.id), cursor ? lt(plays.id, cursor.id) : undefined))
      .orderBy(desc(plays.id))
      .limit(query.limit + 1);
    const pageRows = rows.slice(0, query.limit);
    const hydrated = await loadTracks(
      deps.db,
      pageRows.map((r) => r.trackId),
    );
    const byId = new Map(hydrated.map((t) => [t.id, t]));
    const last = pageRows.at(-1);
    return {
      items: pageRows.flatMap((r) => {
        const track = byId.get(r.trackId);
        if (!track) return [];
        const context = r.contextType
          ? ({ type: r.contextType, ...(r.contextId ? { id: r.contextId } : {}) } as PlayContext)
          : null;
        return [{ track, playedAt: iso(r.playedAt), context }];
      }),
      nextCursor: rows.length > query.limit && last ? encodeCursor({ id: last.id }) : null,
    };
  }),

  implement(endpoints.library.clearHistory, async ({ deps, user }) => {
    // Історія належить користувачу; лічильники прослуховувань треків лишаються.
    await deps.db.update(plays).set({ userId: null }).where(eq(plays.userId, user.id));
  }),

  implement(endpoints.library.reportPlay, async ({ deps, user, body }) => {
    const track = await ensureTrack(deps.db, body.trackId);
    const threshold = track.durationMs > 0 ? Math.min(30_000, track.durationMs / 2) : 30_000;
    if (body.msPlayed < threshold) return { counted: false };

    if (user) {
      // Повторне зарахування того самого треку можливе не раніше, ніж через половину його тривалості.
      const since = new Date(Date.now() - Math.max(threshold, track.durationMs / 2));
      const [recent] = await deps.db
        .select({ id: plays.id })
        .from(plays)
        .where(and(eq(plays.userId, user.id), eq(plays.trackId, body.trackId), gt(plays.playedAt, since)))
        .limit(1);
      if (recent) return { counted: false };
    }

    await deps.db.insert(plays).values({
      userId: user?.id ?? null,
      trackId: body.trackId,
      contextType: body.context?.type ?? null,
      contextId: body.context?.id ?? null,
      msPlayed: body.msPlayed,
      platform: body.platform,
    });
    await deps.db
      .update(tracks)
      .set({ playCount: sql`${tracks.playCount} + 1` })
      .where(eq(tracks.id, body.trackId));
    return { counted: true };
  }),
];
