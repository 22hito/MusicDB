import { endpoints } from "@musicdb/contracts";
import { type DbOrTx, trackRatings, tracks, users } from "@musicdb/db";
import { and, desc, eq, isNotNull, lt, or, sql } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "../../http/cursor";
import { implement } from "../../http/endpoint";
import { notFound } from "../../http/errors";
import { iso, publishedTracks, rowsOf, toUserRef } from "../catalog/hydrate";

async function refreshTrackRating(db: DbOrTx, trackId: string) {
  await db.execute(sql`
    update ${tracks} set
      rating_count = (select count(*) from ${trackRatings} where track_id = ${trackId}),
      rating_sum = coalesce((select sum(score) from ${trackRatings} where track_id = ${trackId}), 0)
    where id = ${trackId}`);
}

export const ratingRoutes = [
  implement(endpoints.ratings.list, async ({ deps, params, query }) => {
    const db = deps.db;
    const [track] = await db
      .select({ id: tracks.id, n: tracks.ratingCount, s: tracks.ratingSum })
      .from(tracks)
      .where(and(eq(tracks.id, params.id), publishedTracks));
    if (!track) throw notFound("track");
    const cursor = decodeCursor<{ t: string; u: string }>(query.cursor);
    const rows = await db
      .select({
        r: trackRatings,
        u: { id: users.id, username: users.username, name: users.name, image: users.image },
      })
      .from(trackRatings)
      .innerJoin(users, eq(users.id, trackRatings.userId))
      .where(
        and(
          eq(trackRatings.trackId, params.id),
          query.withReview ? isNotNull(trackRatings.review) : undefined,
          cursor
            ? or(
                lt(trackRatings.updatedAt, new Date(cursor.t)),
                and(
                  eq(trackRatings.updatedAt, new Date(cursor.t)),
                  sql`${trackRatings.userId} > ${cursor.u}`,
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(trackRatings.updatedAt), trackRatings.userId)
      .limit(query.limit + 1);
    const histRes = await db.execute(sql`
      select least(score / 10, 9)::int as bucket, count(*)::int as n from ${trackRatings}
      where track_id = ${params.id} group by 1`);
    const histogram = Array.from({ length: 10 }, () => 0);
    for (const h of rowsOf<{ bucket: number; n: number }>(histRes)) histogram[h.bucket] = h.n;
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map(({ r, u }) => ({
        user: toUserRef(u),
        score: r.score,
        review: r.review,
        createdAt: iso(r.createdAt),
        updatedAt: iso(r.updatedAt),
      })),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ t: iso(last.r.updatedAt), u: last.r.userId })
          : null,
      summary: {
        average: track.n > 0 ? Math.round((track.s / track.n) * 10) / 10 : null,
        count: track.n,
        histogram,
      },
    };
  }),

  implement(endpoints.ratings.put, async ({ deps, user, params, body }) => {
    const [track] = await deps.db
      .select({ id: tracks.id })
      .from(tracks)
      .where(and(eq(tracks.id, params.id), publishedTracks));
    if (!track) throw notFound("track");
    const review = body.review?.trim() ? body.review.trim() : null;
    const [row] = await deps.db
      .insert(trackRatings)
      .values({ userId: user.id, trackId: params.id, score: body.score, review })
      .onConflictDoUpdate({
        target: [trackRatings.userId, trackRatings.trackId],
        set: { score: body.score, review, updatedAt: new Date() },
      })
      .returning();
    await refreshTrackRating(deps.db, params.id);
    const [u] = await deps.db
      .select({ id: users.id, username: users.username, name: users.name, image: users.image })
      .from(users)
      .where(eq(users.id, user.id));
    return {
      user: toUserRef(u!),
      score: row!.score,
      review: row!.review,
      createdAt: iso(row!.createdAt),
      updatedAt: iso(row!.updatedAt),
    };
  }),

  implement(endpoints.ratings.delete, async ({ deps, user, params }) => {
    await deps.db
      .delete(trackRatings)
      .where(and(eq(trackRatings.userId, user.id), eq(trackRatings.trackId, params.id)));
    await refreshTrackRating(deps.db, params.id);
  }),
];
