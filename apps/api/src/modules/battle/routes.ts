import { endpoints } from "@musicdb/contracts";
import { battleWins, type DbOrTx, tracks } from "@musicdb/db";
import { and, eq, sql } from "drizzle-orm";
import { implement } from "../../http/endpoint";
import { notFound } from "../../http/errors";
import { publishedTracks } from "../catalog/hydrate";

/** Скільки разів пісня ставала чемпіоном: усього й у цього користувача. */
async function winStats(db: DbOrTx, trackId: string, userId: string | null) {
  const [row] = await db
    .select({
      wins: sql<number>`count(*)::int`,
      mine: userId
        ? sql<number>`count(*) filter (where ${battleWins.userId} = ${userId})::int`
        : sql<number>`0`,
    })
    .from(battleWins)
    .where(eq(battleWins.trackId, trackId));
  return { trackId, wins: Number(row?.wins ?? 0), mine: Number(row?.mine ?? 0) };
}

export const battleRoutes = [
  implement(endpoints.battle.recordWin, async ({ deps, user, body }) => {
    const [track] = await deps.db
      .select({ id: tracks.id })
      .from(tracks)
      .where(and(eq(tracks.id, body.trackId), publishedTracks));
    if (!track) throw notFound("track");
    // Той самий турнір (оновили сторінку, повторили запит) — не зараховуємо вдруге.
    await deps.db
      .insert(battleWins)
      .values({
        trackId: body.trackId,
        userId: user.id,
        battleKey: body.battleKey,
        poolSize: body.poolSize,
        poolTitle: body.poolTitle ?? null,
      })
      .onConflictDoNothing({ target: [battleWins.userId, battleWins.battleKey] });
    return winStats(deps.db, body.trackId, user.id);
  }),

  implement(endpoints.battle.wins, async ({ deps, user, params }) => {
    return winStats(deps.db, params.id, user?.id ?? null);
  }),
];
