/**
 * Альбоми для пісень без альбому й обкладинки для альбомів без неї.
 *
 * Пісню беремо, лише коли її вже підтверджено: збережений id Deezer дає той самий ISRC, що в нас (ISRC
 * записувався тільки після збігу Deezer і MusicBrainz). Альбом — той, у якому Deezer видає цей запис;
 * назву підтверджує Apple або MusicBrainz (для синглу з назвою пісні досить того, що це сингл). Якщо
 * джерела називають альбом інакше — не створюємо. Обкладинка — з Deezer для цього альбому.
 */
import { type Database, type ExternalIds, newId } from "@musicdb/db";
import { sql } from "drizzle-orm";
import { rows } from "./db";
import { albumKey, artistKey, fullDate } from "./rules";
import { deezer, itunes, musicbrainz } from "./sources";

export type OrphanRow = {
  id: string;
  title: string;
  isrc: string;
  duration_ms: number;
  external_ids: ExternalIds;
  artists: { id: string; name: string }[] | null;
};

export async function loadOrphans(db: Database, limit: number, ids?: string[]) {
  const only = ids?.length
    ? sql`and t.id in (${sql.join(
        ids.map((i) => sql`${i}`),
        sql`, `,
      )})`
    : sql``;
  return rows<OrphanRow>(
    await db.execute(sql`
      select t.id, t.title, t.isrc, t.duration_ms, t.external_ids,
        (select json_agg(json_build_object('id', a.id, 'name', a.name) order by ta.position)
          from track_artists ta join artists a on a.id = ta.artist_id where ta.track_id = t.id) as artists
      from tracks t
      where t.status = 'published' and t.primary_release_id is null and t.isrc is not null
        and coalesce(t.external_ids, '{}'::jsonb) ? 'deezer' ${only}
      order by t.play_count desc, t.id
      limit ${limit}`),
  );
}

export type ReleaseResult = {
  outcome: "linked" | "created" | "unmatched" | "unconfirmed" | "conflict";
  releaseId?: string;
  album?: { deezer: number; title: string; type: string; date: string | null; cover: string | null };
  confirmedBy?: string[];
  names?: Record<string, string | null>;
};

const TYPE: Record<string, "album" | "single" | "ep" | "compilation"> = {
  album: "album",
  single: "single",
  ep: "ep",
  compile: "compilation",
};

/** Один альбом Deezer створюється один раз, навіть якщо його пісні звіряються паралельно. */
const creating = new Map<number, Promise<string>>();

export async function linkRelease(db: Database, row: OrphanRow, dry: boolean): Promise<ReleaseResult> {
  const primary = row.artists?.[0];
  if (!primary) return { outcome: "unmatched" };
  const dz = await deezer.track(row.external_ids.deezer!);
  if (!dz || dz.isrc !== row.isrc) return { outcome: "unmatched" };
  const album = await deezer.album(dz.album.id);
  if (!album?.title) return { outcome: "unmatched" };
  const key = albumKey(album.title);
  const type = TYPE[album.record_type ?? ""] ?? "album";
  const info = {
    deezer: album.id,
    title: album.title,
    type,
    date: fullDate(album.release_date),
    cover: album.cover_xl ?? null,
  };

  // Підтвердження назви
  const confirmedBy: string[] = [];
  const names: Record<string, string | null> = { deezer: album.title };
  if (type === "single" && key === albumKey(row.title)) confirmedBy.push("single");
  if (!confirmedBy.length) {
    const ap = await itunes.find(primary.name, row.title, row.duration_ms);
    names.itunes = ap?.collectionName ?? null;
    if (ap?.collectionName && albumKey(ap.collectionName) === key) confirmedBy.push("itunes");
  }
  if (!confirmedBy.length) {
    const mb = await musicbrainz.byIsrc(row.isrc, row.title, primary.name);
    const titles = mb ? await musicbrainz.releaseTitles(mb.id) : [];
    names.musicbrainz = titles.slice(0, 3).join(" / ") || null;
    if (titles.some((t) => albumKey(t) === key)) confirmedBy.push("musicbrainz");
  }
  if (!confirmedBy.length) {
    const known = Object.entries(names).some(([k, v]) => k !== "deezer" && v);
    return { outcome: known ? "conflict" : "unconfirmed", album: info, names };
  }
  if (dry) return { outcome: "created", album: info, confirmedBy, names };

  // Наявний альбом: той самий id Deezer або та сама назва в основного виконавця
  const [existing] = rows<{ id: string }>(
    await db.execute(sql`
      select r.id from releases r
      where r.external_ids->>'deezer' = ${String(album.id)}
        or (exists (select 1 from release_artists ra where ra.release_id = r.id and ra.artist_id = ${primary.id})
            and lower(r.title) = lower(${album.title}))
      order by (r.external_ids->>'deezer' = ${String(album.id)}) desc nulls last
      limit 1`),
  );
  let releaseId = existing?.id;
  let outcome: ReleaseResult["outcome"] = "linked";
  if (!releaseId) {
    let pending = creating.get(album.id);
    if (!pending) {
      pending = (async () => {
        const id = newId();
        await db.execute(sql`
          insert into releases (id, title, type, release_date, cover_url, label, upc, external_ids)
          values (${id}, ${album.title}, ${type}, ${info.date}, ${info.cover}, ${album.label ?? null},
            ${album.upc ?? null}, ${JSON.stringify({ deezer: String(album.id) })}::jsonb)`);
        await db.execute(sql`insert into release_artists (release_id, artist_id, position)
          values (${id}, ${primary.id}, 0) on conflict do nothing`);
        return id;
      })();
      creating.set(album.id, pending);
      outcome = "created";
    }
    releaseId = await pending;
  } else if (info.cover) {
    await db.execute(
      sql`update releases set cover_url = ${info.cover} where id = ${releaseId} and cover_url is null`,
    );
  }
  await db.execute(sql`insert into release_tracks (release_id, track_id, position, disc)
    values (${releaseId}, ${row.id}, ${dz.track_position ?? 0}, ${dz.disk_number ?? 1}) on conflict do nothing`);
  await db.execute(
    sql`update tracks set primary_release_id = ${releaseId} where id = ${row.id} and primary_release_id is null`,
  );
  // Відмітка в звірці пісні: що додано й чим підтверджено
  await db.execute(sql`update catalog_checks set applied = applied || jsonb_build_object('release',
      jsonb_build_object('from', null, 'to', ${album.title}::text, 'sources', ${JSON.stringify(["deezer", ...confirmedBy])}::jsonb))
    where entity_type = 'track' and entity_id = ${row.id}`);
  return { outcome, releaseId, album: info, confirmedBy, names };
}

/** Альбоми без обкладинки: обкладинка Deezer, якщо альбом, у якому Deezer видає їхню пісню, так само називається. */
export async function fillCovers(db: Database, dry: boolean) {
  const list = rows<{ id: string; title: string; deezer_track: string; artist: string | null }>(
    await db.execute(sql`
      select r.id, r.title, (
        select t.external_ids->>'deezer' from tracks t
        where t.primary_release_id = r.id and coalesce(t.external_ids, '{}'::jsonb) ? 'deezer'
        order by t.play_count desc limit 1) as deezer_track,
        (select a.name from release_artists ra join artists a on a.id = ra.artist_id
          where ra.release_id = r.id order by ra.position limit 1) as artist
      from releases r where r.cover_url is null`),
  );
  const done: { id: string; title: string; cover: string }[] = [];
  for (const r of list) {
    if (!r.deezer_track) continue;
    const dz = await deezer.track(r.deezer_track);
    if (!dz) continue;
    const album = await deezer.album(dz.album.id);
    if (!album?.cover_xl || albumKey(album.title) !== albumKey(r.title)) continue;
    if (r.artist && artistKey(dz.artist.name) !== artistKey(r.artist)) continue;
    if (!dry) {
      await db.execute(sql`update releases set cover_url = ${album.cover_xl},
        external_ids = coalesce(external_ids, '{}'::jsonb) || ${JSON.stringify({ deezer: String(album.id) })}::jsonb
        where id = ${r.id} and cover_url is null`);
    }
    done.push({ id: r.id, title: r.title, cover: album.cover_xl });
  }
  return { checked: list.length, filled: done };
}
