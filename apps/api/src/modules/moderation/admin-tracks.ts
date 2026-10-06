/**
 * Пісні для адмінської панелі редагування: пошук за назвою чи виконавцем, фільтри статусу/джерела
 * й «чого бракує» (відео, жанри, тривалість, текст, альбом, дата) — щоб доводити каталог до ладу.
 */
import type { AdminTrackDetail, AdminTrackRow } from "@musicdb/contracts";
import type { DbOrTx } from "@musicdb/db";
import { type SQL, sql } from "drizzle-orm";
import { iso, rowsOf } from "../catalog/hydrate";

type Row = {
  id: string;
  title: string;
  artists: string[] | null;
  genres: string[] | null;
  release_title: string | null;
  release_date: string | null;
  cover_url: string | null;
  duration_ms: number;
  explicit: boolean;
  isrc: string | null;
  youtube_video_id: string | null;
  has_audio: boolean;
  has_lyrics: boolean;
  status: AdminTrackRow["status"];
  source: AdminTrackRow["source"];
  play_count: number | string;
  updated_at: Date | string;
  lyrics?: string | null;
  lyrics_synced?: string | null;
};

const columns = sql`
  t.id, t.title, t.duration_ms, t.explicit, t.isrc, t.release_date::text as release_date,
  t.youtube_video_id, (t.audio_asset_id is not null) as has_audio,
  (t.lyrics is not null or t.lyrics_synced is not null) as has_lyrics,
  t.status, t.source, t.play_count, t.updated_at,
  r.title as release_title, r.cover_url,
  (select array_agg(a.name order by ta.position) from track_artists ta join artists a on a.id = ta.artist_id
    where ta.track_id = t.id) as artists,
  (select array_agg(g.name order by tg.position) from track_genres tg join genres g on g.id = tg.genre_id
    where tg.track_id = t.id) as genres`;

function toRow(r: Row): AdminTrackRow {
  return {
    id: r.id,
    title: r.title,
    artists: r.artists ?? [],
    genres: r.genres ?? [],
    releaseTitle: r.release_title,
    releaseDate: r.release_date,
    coverUrl: r.cover_url,
    durationMs: Number(r.duration_ms),
    explicit: r.explicit,
    isrc: r.isrc,
    youtubeVideoId: r.youtube_video_id,
    hasAudio: r.has_audio,
    hasLyrics: r.has_lyrics,
    status: r.status,
    source: r.source,
    playCount: Number(r.play_count),
    updatedAt: iso(new Date(r.updated_at)),
  };
}

export async function listAdminTracks(
  db: DbOrTx,
  query: {
    q?: string | undefined;
    status: "all" | "published" | "hidden";
    source: "all" | "catalog" | "community";
    missing?: "video" | "genres" | "duration" | "lyrics" | "release" | "date" | undefined;
    check?: "conflict" | "unchecked" | "unmatched" | "resolved" | undefined;
    sort: "recent" | "popular" | "title";
    limit: number;
  },
  offset: number,
) {
  const where: SQL[] = [sql`t.status <> 'removed'`];
  if (query.status !== "all") where.push(sql`t.status = ${query.status}`);
  if (query.source !== "all") where.push(sql`t.source = ${query.source}`);
  if (query.q) {
    const term = `%${query.q}%`;
    where.push(sql`(t.title ilike ${term} or t.id = ${query.q} or exists (
      select 1 from track_artists ta join artists a on a.id = ta.artist_id
      where ta.track_id = t.id and a.name ilike ${term}))`);
  }
  switch (query.missing) {
    case "video":
      where.push(sql`t.youtube_video_id is null and t.audio_asset_id is null`);
      break;
    case "genres":
      where.push(sql`not exists (select 1 from track_genres tg where tg.track_id = t.id)`);
      break;
    case "duration":
      where.push(sql`t.duration_ms = 0`);
      break;
    case "lyrics":
      where.push(sql`t.lyrics is null and t.lyrics_synced is null`);
      break;
    case "release":
      where.push(sql`t.primary_release_id is null`);
      break;
    case "date":
      where.push(sql`t.release_date is null and (r.release_date is null)`);
      break;
  }
  if (query.check === "unchecked")
    where.push(
      sql`not exists (select 1 from catalog_checks c where c.entity_type = 'track' and c.entity_id = t.id)`,
    );
  else if (query.check)
    where.push(sql`exists (select 1 from catalog_checks c where c.entity_type = 'track' and c.entity_id = t.id
      and c.status = ${query.check})`);
  const order =
    query.sort === "popular"
      ? sql`t.play_count desc, t.id`
      : query.sort === "title"
        ? sql`lower(t.title), t.id`
        : sql`t.updated_at desc, t.id`;
  const filter = sql.join(where, sql` and `);
  const res = await db.execute(sql`
    select ${columns}
    from tracks t left join releases r on r.id = t.primary_release_id
    where ${filter}
    order by ${order}
    limit ${query.limit + 1} offset ${offset}`);
  const totalRes = await db.execute(sql`
    select count(*)::int as n from tracks t left join releases r on r.id = t.primary_release_id where ${filter}`);
  const rows = rowsOf<Row>(res).map(toRow);
  return { rows, total: Number(rowsOf<{ n: number }>(totalRes)[0]?.n ?? 0) };
}

type CheckRow = {
  status: string;
  checked_at: Date | string;
  applied: Record<string, { from: unknown; to: unknown; sources: string[] }>;
  conflicts: Record<string, Record<string, unknown>>;
  external_ids: Record<string, string> | null;
  resolved_by: string | null;
};

export async function loadAdminTrack(db: DbOrTx, id: string): Promise<AdminTrackDetail | null> {
  const res = await db.execute(sql`
    select ${columns}, t.lyrics, t.lyrics_synced
    from tracks t left join releases r on r.id = t.primary_release_id
    where t.id = ${id} and t.status <> 'removed'`);
  const r = rowsOf<Row>(res)[0];
  if (!r) return null;
  const chk = rowsOf<CheckRow>(
    await db.execute(sql`select c.status, c.checked_at, c.applied, c.conflicts, t.external_ids,
        case when c.status = 'resolved' then coalesce(u.display_username, u.name) end as resolved_by
      from catalog_checks c join tracks t on t.id = c.entity_id
        left join users u on u.id = c.sources->'manual'->>'by'
      where c.entity_type = 'track' and c.entity_id = ${id}`),
  )[0];
  return {
    ...toRow(r),
    lyrics: r.lyrics ?? null,
    lyricsSynced: r.lyrics_synced ?? null,
    check: chk
      ? {
          status: chk.status,
          checkedAt: iso(new Date(chk.checked_at)),
          ids: chk.external_ids ?? {},
          applied: chk.applied ?? {},
          conflicts: chk.conflicts ?? {},
          resolvedBy: chk.resolved_by,
        }
      : null,
  };
}

/**
 * Адмін виправив дані вручну — пісня зникає зі списку розбіжностей (статус resolved, звірка її більше
 * не чіпає). Попередній статус зберігається в sources.manual, щоб можна було повернути.
 * false — що було до позначки. Повертає false, якщо пісню ще не звіряли.
 */
export async function setTrackCheckResolved(db: DbOrTx, id: string, userId: string, resolved: boolean) {
  const res = resolved
    ? await db.execute(sql`update catalog_checks set status = 'resolved', checked_at = now(),
        sources = sources || jsonb_build_object('manual',
          jsonb_build_object('prev', status, 'by', ${userId}::text, 'at', now()))
        where entity_type = 'track' and entity_id = ${id} and status <> 'verified'
        returning entity_id`)
    : await db.execute(sql`update catalog_checks
        set status = coalesce(sources->'manual'->>'prev', 'conflict'), sources = sources - 'manual'
        where entity_type = 'track' and entity_id = ${id} and status = 'resolved'
        returning entity_id`);
  return rowsOf(res).length > 0;
}
