/**
 * «Машина часу»: каталог за роками релізу. Рік пісні — дата релізу треку, а якщо її немає — основного релізу.
 * Шкала — кількість пісень у кожному році й десятилітті; «епоха» — головне за рік чи десятиліття.
 */
import type { Era, Timeline } from "@musicdb/contracts";
import { artists, type DbOrTx, genres, releases } from "@musicdb/db";
import { inArray, sql } from "drizzle-orm";
import { badRequest } from "../../http/errors";
import {
  artistColumns,
  hydrateReleases,
  loadTracks,
  releaseColumns,
  rowsOf,
  toArtist,
} from "../catalog/hydrate";

/** Рік пісні як SQL-вираз (аліаси: t — tracks, r — основний реліз). */
const yearOf = sql`extract(year from coalesce(t.release_date, r.release_date))::int`;
const base = sql`from tracks t left join releases r on r.id = t.primary_release_id where t.status = 'published'`;

export async function timeline(db: DbOrTx): Promise<Timeline> {
  const rows = rowsOf<{ year: number; n: number }>(
    await db.execute(sql`
      select year, count(*)::int n from (select ${yearOf} as year ${base}) y
      where year between 1900 and extract(year from now())::int + 1
      group by year order by year`),
  );
  const decades = new Map<
    number,
    { decade: number; tracks: number; years: { year: number; tracks: number }[] }
  >();
  for (const r of rows) {
    const decade = Math.floor(r.year / 10) * 10;
    const d = decades.get(decade) ?? { decade, tracks: 0, years: [] };
    d.tracks += r.n;
    d.years.push({ year: r.year, tracks: r.n });
    decades.set(decade, d);
  }
  return { decades: [...decades.values()] };
}

export async function era(db: DbOrTx, from: number, to: number): Promise<Era> {
  if (to < from || to - from > 9)
    throw badRequest("invalid_range", "Діапазон — один рік або одне десятиліття");
  const inRange = sql`${yearOf} between ${from} and ${to}`;
  const [count, trackRows, releaseRows, artistRows, genreRows] = await Promise.all([
    db.execute(sql`select count(*)::int n ${base} and ${inRange}`),
    // Головні пісні: прослуховування, оцінки, з обкладинкою; далі — стабільно-випадково, щоб не лише за алфавітом.
    db.execute(sql`
      select t.id ${base} and ${inRange}
      order by t.play_count desc, t.rating_count desc, (r.cover_url is null), md5(t.id || ${String(from)}) limit 40`),
    db.execute(sql`
      select rel.id from releases rel
        join release_tracks rt on rt.release_id = rel.id
        join tracks t on t.id = rt.track_id and t.status = 'published'
      where extract(year from rel.release_date)::int between ${from} and ${to}
      group by rel.id, rel.type, rel.track_count
      order by sum(t.play_count) desc, (rel.type = 'album') desc, rel.track_count desc, md5(rel.id) limit 12`),
    db.execute(sql`
      select ta.artist_id id, count(*)::int n from track_artists ta
        join tracks t on t.id = ta.track_id left join releases r on r.id = t.primary_release_id
      where t.status = 'published' and ${inRange}
      group by 1 order by 2 desc, 1 limit 10`),
    db.execute(sql`
      select tg.genre_id id, count(*)::int n from track_genres tg
        join tracks t on t.id = tg.track_id left join releases r on r.id = t.primary_release_id
      where t.status = 'published' and ${inRange}
      group by 1 order by 2 desc, 1 limit 10`),
  ]);
  const trackIds = rowsOf<{ id: string }>(trackRows).map((r) => r.id);
  const releaseIds = rowsOf<{ id: string }>(releaseRows).map((r) => r.id);
  const artistCounts = rowsOf<{ id: string; n: number }>(artistRows);
  const genreCounts = rowsOf<{ id: string; n: number }>(genreRows);

  const [tracksOut, releaseList, artistList, genreList] = await Promise.all([
    loadTracks(db, trackIds),
    releaseIds.length ? db.select(releaseColumns).from(releases).where(inArray(releases.id, releaseIds)) : [],
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
  const order = <T extends { id: string }>(ids: string[], list: T[]) =>
    ids.flatMap((id) => list.filter((x) => x.id === id));
  return {
    from,
    to,
    trackCount: rowsOf<{ n: number }>(count)[0]?.n ?? 0,
    tracks: tracksOut,
    releases: await hydrateReleases(db, order(releaseIds, releaseList)),
    artists: order(
      artistCounts.map((a) => a.id),
      artistList,
    ).map((a) => ({ ...toArtist(a), eraTracks: artistCounts.find((x) => x.id === a.id)?.n ?? 0 })),
    genres: order(
      genreCounts.map((g) => g.id),
      genreList,
    ).map((g) => ({ ...g, tracks: genreCounts.find((x) => x.id === g.id)?.n ?? 0 })),
  };
}
