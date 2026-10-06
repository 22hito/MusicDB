/**
 * Особиста статистика прослуховувань (у дусі Last.fm і stats.fm): підсумки й топи за період,
 * розподіл за годинами й днями тижня (у часовому поясі користувача), активність за останній рік і серія днів.
 */
import type { MyStats } from "@musicdb/contracts";
import { artists, type DbOrTx, genres } from "@musicdb/db";
import { inArray, sql } from "drizzle-orm";
import { artistColumns, loadTracks, rowsOf, toArtist } from "../catalog/hydrate";

const DAYS = { week: 7, month: 30, year: 365, all: null } as const;

/** Перевіряє назву часового поясу на боці Postgres; невідома — UTC. */
async function safeZone(db: DbOrTx, tz: string | undefined): Promise<string> {
  if (!tz || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(tz)) return "UTC";
  try {
    await db.execute(sql`select now() at time zone ${tz}`);
    return tz;
  } catch {
    return "UTC";
  }
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export async function myStats(
  db: DbOrTx,
  userId: string,
  period: keyof typeof DAYS,
  tzInput?: string,
): Promise<MyStats> {
  const tz = await safeZone(db, tzInput);
  const days = DAYS[period];
  const win = days ? sql`and p.played_at > now() - make_interval(days => ${days})` : sql``;
  const mine = sql`p.user_id = ${userId} ${win}`;

  const [totalsRes, artistRes, trackRes, genreRes, hourRes, dowRes, dailyRes, todayRes] = await Promise.all([
    db.execute(sql`
      select count(*)::int plays, coalesce(sum(p.ms_played), 0)::float ms, count(distinct p.track_id)::int tracks,
        (select count(distinct ta.artist_id)::int from plays p join track_artists ta on ta.track_id = p.track_id where ${mine}) artists
      from plays p where ${mine}`),
    db.execute(sql`
      select ta.artist_id id, count(*)::int n from plays p join track_artists ta on ta.track_id = p.track_id
      where ${mine} group by 1 order by 2 desc, 1 limit 10`),
    db.execute(sql`
      select p.track_id id, count(*)::int n from plays p where ${mine} group by 1 order by 2 desc, 1 limit 10`),
    db.execute(sql`
      select tg.genre_id id, count(*)::int n from plays p join track_genres tg on tg.track_id = p.track_id
      where ${mine} group by 1 order by 2 desc, 1 limit 8`),
    db.execute(sql`
      select extract(hour from p.played_at at time zone ${tz})::int h, count(*)::int n
      from plays p where ${mine} group by 1`),
    db.execute(sql`
      select (extract(isodow from p.played_at at time zone ${tz})::int - 1) d, count(*)::int n
      from plays p where ${mine} group by 1`),
    db.execute(sql`
      select to_char((p.played_at at time zone ${tz})::date, 'YYYY-MM-DD') as day, count(*)::int n
      from plays p where p.user_id = ${userId} and p.played_at > now() - interval '400 days' group by 1`),
    db.execute(sql`select to_char((now() at time zone ${tz})::date, 'YYYY-MM-DD') today`),
  ]);

  const totals = rowsOf<{ plays: number; ms: number; tracks: number; artists: number }>(totalsRes)[0];
  const artistCounts = rowsOf<{ id: string; n: number }>(artistRes);
  const trackCounts = rowsOf<{ id: string; n: number }>(trackRes);
  const genreCounts = rowsOf<{ id: string; n: number }>(genreRes);

  const [artistRows, trackRows, genreRows] = await Promise.all([
    artistCounts.length
      ? db
          .select(artistColumns)
          .from(artists)
          .where(
            inArray(
              artists.id,
              artistCounts.map((a) => a.id),
            ),
          )
      : [],
    loadTracks(
      db,
      trackCounts.map((x) => x.id),
    ),
    genreCounts.length
      ? db
          .select({ id: genres.id, name: genres.name, slug: genres.slug })
          .from(genres)
          .where(
            inArray(
              genres.id,
              genreCounts.map((g) => g.id),
            ),
          )
      : [],
  ]);

  const byHour = Array.from({ length: 24 }, () => 0);
  for (const r of rowsOf<{ h: number; n: number }>(hourRes)) byHour[r.h] = r.n;
  const byWeekday = Array.from({ length: 7 }, () => 0);
  for (const r of rowsOf<{ d: number; n: number }>(dowRes)) byWeekday[r.d] = r.n;

  // Активність за останні 365 днів (з нулями) і серія днів поспіль до сьогодні.
  const perDay = new Map(rowsOf<{ day: string; n: number }>(dailyRes).map((r) => [r.day, r.n]));
  const today = new Date(`${rowsOf<{ today: string }>(todayRes)[0]?.today ?? isoDay(new Date())}T00:00:00Z`);
  const daily: { date: string; plays: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const date = isoDay(new Date(today.getTime() - i * 86400_000));
    daily.push({ date, plays: perDay.get(date) ?? 0 });
  }
  let streakDays = 0;
  // Якщо сьогодні ще не слухали — серія не обривається, рахуємо від учора.
  let cursor = perDay.has(isoDay(today)) ? 0 : 1;
  while (perDay.has(isoDay(new Date(today.getTime() - cursor * 86400_000)))) {
    streakDays++;
    cursor++;
  }

  const byArtist = new Map(artistRows.map((a) => [a.id, a]));
  const byTrack = new Map(trackRows.map((t) => [t.id, t]));
  const byGenre = new Map(genreRows.map((g) => [g.id, g]));
  return {
    period,
    totals: {
      plays: totals?.plays ?? 0,
      minutes: Math.round((totals?.ms ?? 0) / 60000),
      tracks: totals?.tracks ?? 0,
      artists: totals?.artists ?? 0,
    },
    streakDays,
    topArtists: artistCounts.flatMap((a) => {
      const row = byArtist.get(a.id);
      return row ? [{ artist: toArtist(row), plays: a.n }] : [];
    }),
    topTracks: trackCounts.flatMap((x) => {
      const track = byTrack.get(x.id);
      return track ? [{ track, plays: x.n }] : [];
    }),
    topGenres: genreCounts.flatMap((g) => {
      const genre = byGenre.get(g.id);
      return genre ? [{ genre, plays: g.n }] : [];
    }),
    byHour,
    byWeekday,
    daily,
  };
}
