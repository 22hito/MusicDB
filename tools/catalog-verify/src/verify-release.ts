/**
 * Альбоми для пісень без альбому й обкладинки для альбомів без неї. Досить одного офіційного джерела
 * (рішення 2026-10-07): Deezer або Apple Music.
 *
 * Пісню на платформі визнаємо своєю, коли збігся ISRC або назва, основний виконавець і тривалість (±3 с).
 * Альбом — той, у якому платформа видає саме цей запис (Deezer — за збереженим id, інакше Apple за пошуком).
 * Обкладинка альбому без неї — з альбому з тією самою назвою й виконавцем на Deezer, інакше в Apple.
 */
import { type Database, type ExternalIds, newId } from "@musicdb/db";
import { sql } from "drizzle-orm";
import { rows } from "./db";
import { albumKey, artistKey, fullDate, sameArtist, sameTitle } from "./rules";
import { deezer, itunes } from "./sources";

export type OrphanRow = {
  id: string;
  title: string;
  isrc: string | null;
  duration_ms: number;
  external_ids: ExternalIds | null;
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
      where t.status = 'published' and t.primary_release_id is null ${only}
      order by t.play_count desc, t.id
      limit ${limit}`),
  );
}

type Kind = "album" | "single" | "ep" | "compilation";
type Album = {
  source: "deezer" | "itunes";
  extId: string;
  title: string;
  type: Kind;
  date: string | null;
  cover: string | null;
  label: string | null;
  upc: string | null;
  position: number;
  disc: number;
};

export type ReleaseResult = {
  outcome: "linked" | "created" | "unmatched";
  releaseId?: string;
  album?: Omit<Album, "position" | "disc" | "label" | "upc">;
};

const DZ_TYPE: Record<string, Kind> = { album: "album", single: "single", ep: "ep", compile: "compilation" };
const sameDuration = (a: number, b: number | undefined) => !a || !b || Math.abs(a - b) <= 3000;

/** Apple пише «Назва - Single» / «Назва - EP»: прибираємо приписку, тип — з неї. */
function appleAlbum(name: string): { title: string; type: Kind } {
  const m = name.match(/^(.*?)\s+-\s+(Single|EP)$/i);
  if (!m) return { title: name, type: "album" };
  return { title: m[1]!, type: m[2]!.toLowerCase() === "ep" ? "ep" : "single" };
}
/** Обкладинка Apple у великому розмірі (у відповіді — 100×100). */
const appleArt = (url: string | undefined) => url?.replace(/\/\d+x\d+bb\./, "/1000x1000bb.") ?? null;

async function findAlbum(row: OrphanRow, primary: string): Promise<Album | null> {
  const dzId = row.external_ids?.deezer;
  if (dzId) {
    const dz = await deezer.track(dzId);
    const same =
      !!dz &&
      ((!!row.isrc && dz.isrc === row.isrc) ||
        (sameTitle(dz.title, row.title) &&
          sameArtist(dz.artist.name, primary) &&
          sameDuration(row.duration_ms, dz.duration * 1000)));
    if (dz && same) {
      const a = await deezer.album(dz.album.id);
      if (a?.title)
        return {
          source: "deezer",
          extId: String(a.id),
          title: a.title,
          type: DZ_TYPE[a.record_type ?? ""] ?? "album",
          date: fullDate(a.release_date),
          cover: a.cover_xl ?? null,
          label: a.label ?? null,
          upc: a.upc ?? null,
          position: dz.track_position ?? 0,
          disc: dz.disk_number ?? 1,
        };
    }
  }
  const ap = await itunes.find(primary, row.title, row.duration_ms);
  if (ap?.collectionName && ap.collectionId) {
    const { title, type } = appleAlbum(ap.collectionName);
    return {
      source: "itunes",
      extId: String(ap.collectionId),
      title,
      type,
      date: fullDate(ap.releaseDate),
      cover: appleArt(ap.artworkUrl100),
      label: null,
      upc: null,
      position: ap.trackNumber ?? 0,
      disc: ap.discNumber ?? 1,
    };
  }
  return null;
}

/** Один альбом платформи створюється один раз, навіть якщо його пісні обробляються паралельно. */
const creating = new Map<string, Promise<string>>();

export async function linkRelease(db: Database, row: OrphanRow, dry: boolean): Promise<ReleaseResult> {
  const primary = row.artists?.[0];
  if (!primary) return { outcome: "unmatched" };
  const album = await findAlbum(row, primary.name);
  if (!album) return { outcome: "unmatched" };
  const { position, disc, label, upc, ...info } = album;
  if (dry) return { outcome: "created", album: info };

  // Наявний альбом: той самий id платформи або та сама назва в основного виконавця
  const [existing] = rows<{ id: string }>(
    await db.execute(sql`
      select r.id from releases r
      where r.external_ids->>${album.source} = ${album.extId}
        or (exists (select 1 from release_artists ra where ra.release_id = r.id and ra.artist_id = ${primary.id})
            and lower(r.title) = lower(${album.title}))
      order by (r.external_ids->>${album.source} = ${album.extId}) desc nulls last
      limit 1`),
  );
  let releaseId = existing?.id;
  let outcome: ReleaseResult["outcome"] = "linked";
  if (!releaseId) {
    const key = `${album.source}:${album.extId}`;
    let pending = creating.get(key);
    if (!pending) {
      pending = (async () => {
        const id = newId();
        await db.execute(sql`
          insert into releases (id, title, type, release_date, cover_url, label, upc, external_ids)
          values (${id}, ${album.title}, ${album.type}, ${album.date}, ${album.cover}, ${label}, ${upc},
            ${JSON.stringify({ [album.source]: album.extId })}::jsonb)`);
        await db.execute(sql`insert into release_artists (release_id, artist_id, position)
          values (${id}, ${primary.id}, 0) on conflict do nothing`);
        return id;
      })();
      creating.set(key, pending);
      outcome = "created";
    }
    releaseId = await pending;
  } else if (album.cover) {
    await db.execute(
      sql`update releases set cover_url = ${album.cover} where id = ${releaseId} and cover_url is null`,
    );
  }
  await db.execute(sql`insert into release_tracks (release_id, track_id, position, disc)
    values (${releaseId}, ${row.id}, ${position}, ${disc}) on conflict do nothing`);
  await db.execute(
    sql`update tracks set primary_release_id = ${releaseId} where id = ${row.id} and primary_release_id is null`,
  );
  // Відмітка в звірці пісні: що додано й звідки
  await db.execute(sql`update catalog_checks set applied = applied || jsonb_build_object('release',
      jsonb_build_object('from', null, 'to', ${album.title}::text, 'sources', ${JSON.stringify([album.source])}::jsonb))
    where entity_type = 'track' and entity_id = ${row.id}`);
  return { outcome, releaseId, album: info };
}

/** Альбоми без обкладинки: альбом із тією самою назвою й виконавцем на Deezer, інакше в Apple. */
export async function fillCovers(db: Database, dry: boolean) {
  const list = rows<{ id: string; title: string; artist: string | null }>(
    await db.execute(sql`
      select r.id, r.title, (select a.name from release_artists ra join artists a on a.id = ra.artist_id
          where ra.release_id = r.id order by ra.position limit 1) as artist
      from releases r where r.cover_url is null`),
  );
  const done: { id: string; title: string; cover: string; source: string }[] = [];
  for (const r of list) {
    if (!r.artist) continue;
    const key = albumKey(r.title);
    let found: { cover: string; source: "deezer" | "itunes"; extId: string } | null = null;
    const dz = (await deezer.searchAlbums(`${r.artist} ${r.title}`)).find(
      (a) => albumKey(a.title) === key && sameArtist(a.artist.name, r.artist!) && a.cover_xl,
    );
    if (dz) found = { cover: dz.cover_xl!, source: "deezer", extId: String(dz.id) };
    if (!found) {
      const ap = (await itunes.searchAlbums(`${r.artist} ${r.title}`)).find(
        (a) =>
          albumKey(appleAlbum(a.collectionName).title) === key &&
          artistKey(a.artistName) === artistKey(r.artist!) &&
          a.artworkUrl100,
      );
      if (ap)
        found = { cover: appleArt(ap.artworkUrl100)!, source: "itunes", extId: String(ap.collectionId) };
    }
    if (!found) continue;
    if (!dry) {
      await db.execute(sql`update releases set cover_url = ${found.cover},
        external_ids = coalesce(external_ids, '{}'::jsonb) || ${JSON.stringify({ [found.source]: found.extId })}::jsonb
        where id = ${r.id} and cover_url is null`);
    }
    done.push({ id: r.id, title: r.title, cover: found.cover, source: found.source });
  }
  return { checked: list.length, filled: done };
}
