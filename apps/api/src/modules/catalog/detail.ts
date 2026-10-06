import type { TrackDetail } from "@musicdb/contracts";
import { assets, releases, releaseTracks, trackLikes, trackRatings, tracks } from "@musicdb/db";
import { and, eq, sql } from "drizzle-orm";
import type { Deps, SessionUser } from "../../context";
import { notFound } from "../../http/errors";
import { hydrateTracks, publishedTracks, releaseColumns, selectTracks, toReleaseRef } from "./hydrate";

export async function loadTrackDetail(
  deps: Deps,
  id: string,
  user: SessionUser | null,
  opts: { includeHidden?: boolean } = {},
): Promise<TrackDetail> {
  const db = deps.db;
  const [row] = await selectTracks(db).where(
    opts.includeHidden ? eq(tracks.id, id) : and(eq(tracks.id, id), publishedTracks),
  );
  if (!row) throw notFound("track");
  const [[track], releaseRows, [extra], viewer] = await Promise.all([
    hydrateTracks(db, [row]),
    db
      .select(releaseColumns)
      .from(releaseTracks)
      .innerJoin(releases, eq(releases.id, releaseTracks.releaseId))
      .where(eq(releaseTracks.trackId, id))
      .orderBy(sql`${releases.releaseDate} asc nulls last`),
    db
      .select({ waveform: assets.waveform })
      .from(tracks)
      .leftJoin(assets, eq(assets.id, tracks.audioAssetId))
      .where(eq(tracks.id, id)),
    user
      ? Promise.all([
          db
            .select({ one: sql<number>`1` })
            .from(trackLikes)
            .where(and(eq(trackLikes.userId, user.id), eq(trackLikes.trackId, id))),
          db
            .select({ score: trackRatings.score })
            .from(trackRatings)
            .where(and(eq(trackRatings.userId, user.id), eq(trackRatings.trackId, id))),
        ]).then(([liked, rating]) => ({ liked: liked.length > 0, rating: rating[0]?.score ?? null }))
      : Promise.resolve(null),
  ]);
  return {
    ...track!,
    trackNumber: row.trackNumber,
    discNumber: row.discNumber,
    releases: releaseRows.map(toReleaseRef),
    likeCount: row.likeCount,
    waveform: extra?.waveform ?? null,
    viewer,
  };
}
