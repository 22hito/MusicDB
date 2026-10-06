/**
 * Наповнює локальну базу розробки каталогом зі знімків конвеєра імпорту (E:\MusicDB\db\jobs\out):
 * початкові пісні (з відео YouTube), імпорт із дискографій Deezer, релізи з обкладинками, жанри, біографії.
 * Лише публічні дані каталогу — жодних користувачів.
 *
 *   SNAPSHOT_DIR=<тека> DATABASE_URL=<url> pnpm --filter @musicdb/seed dev
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  artists,
  createDb,
  genres,
  newId,
  normalizeName,
  parseDurationMs,
  rebuildSearchIndex,
  recomputeCounters,
  releaseArtists,
  releases,
  releaseTracks,
  trackArtists,
  trackGenres,
  tracks,
  uniqueSlug,
} from "@musicdb/db";
import { sql } from "drizzle-orm";

const dir = process.env.SNAPSHOT_DIR ?? resolve(import.meta.dirname, "../../../../db/jobs/out");
const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/musicdb";
const read = <T>(name: string): T => JSON.parse(readFileSync(resolve(dir, name), "utf8")) as T;

// ─── Вхідні формати ───────────────────────────────────────────────────────

type BackupSong = {
  id: number;
  artist: string;
  title: string;
  release: string | null;
  duration: string;
  yt: string | null;
  source: "catalog" | "community";
  hasFile: boolean;
  genres: string[];
  artistIds: number[];
  album: string | null;
};
type Backup = { songs: BackupSong[]; artists: { id: number; name: string }[] };
type Apply = {
  genres: { delete: string[]; replace: Record<string, string[]> };
  updates: ({ id: number } & Partial<{
    title: string;
    trackNumber: number;
    album: string;
    duration: number | string;
    release: string;
    yt: string;
    clearAlbum: boolean;
  }>)[];
  albums: { name: string; release: string | null; cover: string | null }[];
  artists: { id: number; bio?: string; imageFile?: string }[];
};
type ImportSong = {
  artist: string;
  artists: string[];
  title: string;
  album: string | null;
  release: string | null;
  duration: number;
  trackNumber: number | null;
  deezerTrack: number;
};
type DzRelease = {
  id: number;
  title: string;
  type: string;
  date: string | null;
  cover: string | null;
  label: string | null;
  explicit: boolean;
  tracks: { id: number; title: string; duration: number; artist: string }[];
};
type Discog = { artists: { dbId: number; name: string; picture: string | null; releases: DzRelease[] }[] };
type Plan = { audit: { id: number; dz: { track: number; albumPos: number | null } | null }[] };
type Profile = { id: number; picture?: string | null };
type Bio = { id: number; bio?: string | null; bioEn?: string | null };

const backup = read<Backup>("backup_before_apply_2026-09-27.json");
const apply = read<Apply>("apply.json");
const imported = read<{
  newSongs: ImportSong[];
  albums: { name: string; release: string | null; cover: string | null }[];
}>("import.json");
const discog = read<Discog>("deezer_discog.json");
const plan = read<Plan>("plan.json");
const profiles = read<Profile[]>("profiles.json");
const bios = read<Bio[]>("bios_new.json");
const genreResults = readFileSync(resolve(dir, "genre_results.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line) as { artist: string; title: string; genres: string[] });

// ─── Виконавці ────────────────────────────────────────────────────────────

type ArtistRow = typeof artists.$inferInsert;
const artistRows = new Map<string, ArtistRow>(); // normalizedName → row
const artistByLegacy = new Map<number, ArtistRow>();
const artistSlugs = new Set<string>();

const pictureByLegacy = new Map<number, string>();
for (const p of profiles) if (p.picture) pictureByLegacy.set(p.id, p.picture);
for (const a of discog.artists) if (a.picture) pictureByLegacy.set(a.dbId, a.picture);
const bioByLegacy = new Map<number, { uk?: string; en?: string }>();
for (const a of apply.artists) if (a.bio) bioByLegacy.set(a.id, { en: a.bio });
for (const b of bios) {
  const bio = { ...(bioByLegacy.get(b.id) ?? {}) };
  if (b.bio) bio.uk = b.bio;
  if (b.bioEn) bio.en = b.bioEn;
  bioByLegacy.set(b.id, bio);
}

function ensureArtist(name: string, legacyId?: number): ArtistRow {
  const key = normalizeName(name);
  let row = artistRows.get(key);
  if (!row) {
    row = {
      id: newId(),
      name: name.trim(),
      slug: uniqueSlug(name, artistSlugs),
      normalizedName: key,
      imageUrl: legacyId ? (pictureByLegacy.get(legacyId) ?? null) : null,
      bio: legacyId ? (bioByLegacy.get(legacyId) ?? null) : null,
      legacyId: legacyId ?? null,
    };
    artistRows.set(key, row);
  }
  if (legacyId && !row.legacyId) {
    row.legacyId = legacyId;
    row.imageUrl ??= pictureByLegacy.get(legacyId) ?? null;
    row.bio ??= bioByLegacy.get(legacyId) ?? null;
  }
  if (row.legacyId) artistByLegacy.set(row.legacyId, row);
  return row;
}

for (const a of backup.artists) ensureArtist(a.name, a.id);

// ─── Релізи ───────────────────────────────────────────────────────────────

type ReleaseRow = typeof releases.$inferInsert;
const releaseRows = new Map<string, ReleaseRow>();
const releaseArtistRows: (typeof releaseArtists.$inferInsert)[] = [];
const releaseByDzTrack = new Map<number, { release: ReleaseRow; position: number }>();
const releaseTypeOf = (t: string): ReleaseRow["type"] =>
  t === "single" ? "single" : t === "ep" ? "ep" : t === "compile" ? "compilation" : "album";

for (const a of discog.artists) {
  const owner = artistByLegacy.get(a.dbId) ?? ensureArtist(a.name, a.dbId);
  for (const r of a.releases) {
    const key = `dz:${r.id}`;
    let row = releaseRows.get(key);
    if (!row) {
      row = {
        id: newId(),
        title: r.title,
        type: releaseTypeOf(r.type),
        releaseDate: r.date,
        coverUrl: r.cover,
        label: r.label,
      };
      releaseRows.set(key, row);
      releaseArtistRows.push({ releaseId: row.id!, artistId: owner.id!, position: 0 });
    }
    r.tracks.forEach((t, i) => {
      releaseByDzTrack.set(t.id, { release: row!, position: i + 1 });
    });
  }
}

// Альбоми, відомі лише за назвою (старі пісні без збігу в Deezer).
const albumMeta = new Map<string, { release: string | null; cover: string | null }>();
for (const al of [...imported.albums, ...apply.albums]) {
  const k = normalizeName(al.name);
  const prev = albumMeta.get(k);
  albumMeta.set(k, { release: al.release ?? prev?.release ?? null, cover: al.cover ?? prev?.cover ?? null });
}
function releaseByName(name: string, owner: ArtistRow): ReleaseRow {
  const key = `name:${owner.id}:${normalizeName(name)}`;
  let row = releaseRows.get(key);
  if (!row) {
    const meta = albumMeta.get(normalizeName(name));
    row = {
      id: newId(),
      title: name,
      type: "album",
      releaseDate: meta?.release ?? null,
      coverUrl: meta?.cover ?? null,
    };
    releaseRows.set(key, row);
    releaseArtistRows.push({ releaseId: row.id!, artistId: owner.id!, position: 0 });
  }
  return row;
}

// ─── Жанри ────────────────────────────────────────────────────────────────

const genreRows = new Map<string, typeof genres.$inferInsert>();
const genreSlugs = new Set<string>();
const genreReplace = new Map<string, string>();
for (const [to, from] of Object.entries(apply.genres.replace)) {
  for (const f of from) genreReplace.set(normalizeName(f), to);
}
const genreDrop = new Set(apply.genres.delete.map(normalizeName));

function ensureGenre(raw: string) {
  let name = normalizeName(raw);
  name = genreReplace.get(name) ?? name;
  if (!name || genreDrop.has(name)) return null;
  let row = genreRows.get(name);
  if (!row) {
    row = { id: newId(), name, slug: uniqueSlug(name, genreSlugs) };
    genreRows.set(name, row);
  }
  return row;
}

const genresBySong = new Map<string, string[]>();
for (const g of genreResults)
  genresBySong.set(`${normalizeName(g.artist)}|${normalizeName(g.title)}`, g.genres);

// ─── Треки ────────────────────────────────────────────────────────────────

type TrackRow = typeof tracks.$inferInsert;
const trackRows: TrackRow[] = [];
const trackArtistRows: (typeof trackArtists.$inferInsert)[] = [];
const trackGenreRows: (typeof trackGenres.$inferInsert)[] = [];
const releaseTrackRows = new Map<string, typeof releaseTracks.$inferInsert>();
const seenSongs = new Set<string>();

function link(
  track: TrackRow,
  artistList: ArtistRow[],
  genreNames: string[],
  release: ReleaseRow | null,
  position: number | null,
) {
  const seenArtists = new Set<string>();
  artistList.forEach((a, i) => {
    if (seenArtists.has(a.id!)) return;
    seenArtists.add(a.id!);
    trackArtistRows.push({
      trackId: track.id!,
      artistId: a.id!,
      position: i,
      role: i === 0 ? "main" : "featured",
    });
  });
  const seenGenres = new Set<string>();
  for (const name of genreNames) {
    const g = ensureGenre(name);
    if (!g || seenGenres.has(g.id!)) continue;
    trackGenreRows.push({ trackId: track.id!, genreId: g.id!, position: seenGenres.size });
    seenGenres.add(g.id!);
  }
  if (release) {
    track.primaryReleaseId = release.id!;
    releaseTrackRows.set(`${release.id}:${track.id}`, {
      releaseId: release.id!,
      trackId: track.id!,
      position: position ?? 0,
    });
  }
}

const updates = new Map(apply.updates.map((u) => [u.id, u]));
const dzByLegacy = new Map(plan.audit.filter((a) => a.dz).map((a) => [a.id, a.dz!]));

for (const s of backup.songs) {
  const u = updates.get(s.id);
  const dz = dzByLegacy.get(s.id);
  const songArtists = s.artistIds.map((id) => artistByLegacy.get(id)).filter((a): a is ArtistRow => !!a);
  if (songArtists.length === 0) songArtists.push(ensureArtist(s.artist));
  const track: TrackRow = {
    id: newId(),
    title: u?.title ?? s.title,
    durationMs: parseDurationMs(u?.duration ?? s.duration),
    releaseDate: u?.release ?? s.release,
    trackNumber: u?.trackNumber ?? dz?.albumPos ?? null,
    source: s.source,
    youtubeVideoId: u?.yt ?? s.yt,
    legacyId: s.id,
  };
  let release: ReleaseRow | null = null;
  let position = track.trackNumber ?? null;
  const fromDz = dz ? releaseByDzTrack.get(dz.track) : undefined;
  const albumName = u?.clearAlbum ? null : (u?.album ?? s.album);
  if (fromDz) {
    release = fromDz.release;
    position = dz?.albumPos ?? fromDz.position;
  } else if (albumName) {
    release = releaseByName(albumName, songArtists[0]!);
  }
  trackRows.push(track);
  link(track, songArtists, s.genres, release, position);
  seenSongs.add(`${normalizeName(songArtists[0]!.name)}|${normalizeName(track.title)}`);
}

let skipped = 0;
for (const s of imported.newSongs) {
  const names = s.artists.length ? s.artists : [s.artist];
  const songArtists = names.map((n) => ensureArtist(n));
  const key = `${normalizeName(songArtists[0]!.name)}|${normalizeName(s.title)}`;
  if (seenSongs.has(key)) {
    skipped++;
    continue;
  }
  seenSongs.add(key);
  const fromDz = releaseByDzTrack.get(s.deezerTrack);
  const track: TrackRow = {
    id: newId(),
    title: s.title,
    durationMs: parseDurationMs(s.duration),
    releaseDate: s.release,
    trackNumber: s.trackNumber,
    source: "catalog",
  };
  const release = fromDz?.release ?? (s.album ? releaseByName(s.album, songArtists[0]!) : null);
  trackRows.push(track);
  link(track, songArtists, genresBySong.get(key) ?? [], release, s.trackNumber ?? fromDz?.position ?? null);
}

// Релізи без жодного треку в базі не потрібні.
const usedReleases = new Set([...releaseTrackRows.values()].map((r) => r.releaseId));
const releaseList = [...releaseRows.values()].filter((r) => usedReleases.has(r.id!));
const releaseArtistList = releaseArtistRows.filter((r) => usedReleases.has(r.releaseId));

// ─── Запис ────────────────────────────────────────────────────────────────

const { db, close } = createDb(url, { max: 1 });

async function insertChunks<T extends Record<string, unknown>>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  size = 1000,
) {
  for (let i = 0; i < rows.length; i += size) {
    // biome-ignore lint/suspicious/noExplicitAny: різні таблиці
    await db.insert(table).values(rows.slice(i, i + size) as any);
  }
}

const started = Date.now();
await db.execute(
  sql`truncate search_documents, track_genres, track_artists, release_tracks, release_artists, tracks, releases, genres, artists cascade`,
);
await insertChunks(artists, [...artistRows.values()]);
await insertChunks(genres, [...genreRows.values()]);
await insertChunks(releases, releaseList);
await insertChunks(releaseArtists, releaseArtistList);
await insertChunks(tracks, trackRows);
await insertChunks(trackArtists, trackArtistRows);
await insertChunks(trackGenres, trackGenreRows);
await insertChunks(releaseTracks, [...releaseTrackRows.values()]);
await recomputeCounters(db);
await rebuildSearchIndex(db);

console.log(
  `Готово за ${((Date.now() - started) / 1000).toFixed(1)} с: виконавців ${artistRows.size}, релізів ${releaseList.length}, ` +
    `треків ${trackRows.length} (з YouTube ${trackRows.filter((t) => t.youtubeVideoId).length}, дублікатів пропущено ${skipped}), ` +
    `жанрів ${genreRows.size}, зв'язків трек–жанр ${trackGenreRows.length}`,
);
await close();
