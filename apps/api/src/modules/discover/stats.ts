/** Лічильники каталогу для карток статистики (пісні, жанри, альбоми, сингли, виконавці). */
import type { CatalogStats } from "@musicdb/contracts";
import type { DbOrTx } from "@musicdb/db";
import { sql } from "drizzle-orm";
import { rowsOf } from "../catalog/hydrate";

export async function catalogStats(
  db: DbOrTx,
  opts: { source?: "catalog" | "community" | undefined; playable: "any" | "audio" },
): Promise<CatalogStats> {
  const filter = sql`t.status = 'published'
    ${opts.source ? sql`and t.source = ${opts.source}` : sql``}
    ${opts.playable === "audio" ? sql`and exists (select 1 from assets a where a.id = t.audio_asset_id and a.status = 'ready')` : sql``}`;
  const [row] = rowsOf<CatalogStats>(
    await db.execute(sql`
      with t as (select t.id from tracks t where ${filter})
      select
        (select count(*)::int from t) tracks,
        (select count(distinct tg.genre_id)::int from track_genres tg join t on t.id = tg.track_id) genres,
        (select count(distinct r.id)::int from releases r join release_tracks rt on rt.release_id = r.id join t on t.id = rt.track_id where r.type = 'album') albums,
        (select count(distinct r.id)::int from releases r join release_tracks rt on rt.release_id = r.id join t on t.id = rt.track_id where r.type in ('single', 'ep')) singles,
        (select count(distinct ta.artist_id)::int from track_artists ta join t on t.id = ta.track_id) artists`),
  );
  return row ?? { tracks: 0, genres: 0, albums: 0, singles: 0, artists: 0 };
}
