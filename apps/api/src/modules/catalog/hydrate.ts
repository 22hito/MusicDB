/**
 * Збирання DTO з рядків бази пакетними запитами: на список зі ста треків — 4 запити, а не 400.
 */
import type { Artist, Playlist, Release, ReleaseRef, Track, UserRef } from "@musicdb/contracts";
import {
  artists,
  assets,
  type DbOrTx,
  genres,
  playlistItems,
  type playlists,
  releaseArtists,
  releases,
  trackArtists,
  trackGenres,
  tracks,
  users,
} from "@musicdb/db";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";

/** Чи налаштований пошук відео на YouTube (виставляє createApp) — від цього залежить playback.resolvable. */
export const youtubeSearch = { enabled: false };

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());

// ─── Треки ────────────────────────────────────────────────────────────────

export const trackColumns = {
  id: tracks.id,
  title: tracks.title,
  durationMs: tracks.durationMs,
  explicit: tracks.explicit,
  releaseDate: tracks.releaseDate,
  source: tracks.source,
  youtubeVideoId: tracks.youtubeVideoId,
  hasAudio: sql<boolean>`coalesce(${assets.status} = 'ready', false)`.as("has_audio"),
  hasLyrics: sql<boolean>`(${tracks.lyrics} is not null or ${tracks.lyricsSynced} is not null)`.as(
    "has_lyrics",
  ),
  playCount: tracks.playCount,
  likeCount: tracks.likeCount,
  ratingCount: tracks.ratingCount,
  ratingSum: tracks.ratingSum,
  uploaderId: tracks.uploaderId,
  trackNumber: tracks.trackNumber,
  discNumber: tracks.discNumber,
  createdAt: tracks.createdAt,
  releaseId: releases.id,
  releaseTitle: releases.title,
  releaseType: releases.type,
  releaseCover: releases.coverUrl,
  releaseDateOfRelease: releases.releaseDate,
};

export type TrackRow = {
  id: string;
  title: string;
  durationMs: number;
  explicit: boolean;
  releaseDate: string | null;
  source: "catalog" | "community";
  youtubeVideoId: string | null;
  hasAudio: boolean;
  hasLyrics: boolean;
  playCount: number;
  likeCount: number;
  ratingCount: number;
  ratingSum: number;
  uploaderId: string | null;
  trackNumber: number | null;
  discNumber: number;
  createdAt: Date;
  releaseId: string | null;
  releaseTitle: string | null;
  releaseType: "album" | "single" | "ep" | "compilation" | null;
  releaseCover: string | null;
  releaseDateOfRelease: string | null;
};

/** Базовий SELECT треків з релізом і станом аудіо — далі .where/.orderBy/.limit. */
export function selectTracks(db: DbOrTx) {
  return db
    .select(trackColumns)
    .from(tracks)
    .leftJoin(releases, eq(releases.id, tracks.primaryReleaseId))
    .leftJoin(assets, eq(assets.id, tracks.audioAssetId));
}

export const publishedTracks = eq(tracks.status, "published");

export function toUserRef(u: {
  id: string;
  username: string | null;
  name: string;
  image: string | null;
}): UserRef {
  return { id: u.id, username: u.username, name: u.name, image: u.image };
}

export async function loadUserRefs(
  db: DbOrTx,
  ids: (string | null | undefined)[],
): Promise<Map<string, UserRef>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ id: users.id, username: users.username, name: users.name, image: users.image })
    .from(users)
    .where(inArray(users.id, unique));
  return new Map(rows.map((r) => [r.id, toUserRef(r)]));
}

export async function hydrateTracks(db: DbOrTx, rows: TrackRow[]): Promise<Track[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [credits, genreRows, uploaders] = await Promise.all([
    db
      .select({ trackId: trackArtists.trackId, id: artists.id, name: artists.name, slug: artists.slug })
      .from(trackArtists)
      .innerJoin(artists, eq(artists.id, trackArtists.artistId))
      .where(inArray(trackArtists.trackId, ids))
      .orderBy(asc(trackArtists.position)),
    db
      .select({ trackId: trackGenres.trackId, id: genres.id, name: genres.name, slug: genres.slug })
      .from(trackGenres)
      .innerJoin(genres, eq(genres.id, trackGenres.genreId))
      .where(inArray(trackGenres.trackId, ids))
      .orderBy(asc(trackGenres.position)),
    loadUserRefs(
      db,
      rows.map((r) => r.uploaderId),
    ),
  ]);

  const artistsByTrack = group(credits, (c) => c.trackId);
  const genresByTrack = group(genreRows, (g) => g.trackId);

  return rows.map((r) =>
    toTrack(r, artistsByTrack.get(r.id) ?? [], genresByTrack.get(r.id) ?? [], uploaders),
  );
}

function toTrack(
  r: TrackRow,
  credits: { id: string; name: string; slug: string }[],
  genreList: { id: string; name: string; slug: string }[],
  uploaders: Map<string, UserRef>,
): Track {
  return {
    id: r.id,
    title: r.title,
    durationMs: r.durationMs,
    explicit: r.explicit,
    artists: credits.map(({ id, name, slug }) => ({ id, name, slug })),
    release: r.releaseId
      ? {
          id: r.releaseId,
          title: r.releaseTitle!,
          type: r.releaseType ?? "album",
          coverUrl: r.releaseCover,
          releaseDate: r.releaseDateOfRelease,
        }
      : null,
    releaseDate: r.releaseDate ?? r.releaseDateOfRelease,
    source: r.source,
    genres: genreList.map(({ id, name, slug }) => ({ id, name, slug })),
    playback: {
      audio: r.hasAudio,
      youtubeVideoId: r.youtubeVideoId,
      resolvable: r.hasAudio || !!r.youtubeVideoId || (r.source === "catalog" && youtubeSearch.enabled),
    },
    hasLyrics: r.hasLyrics,
    playCount: Number(r.playCount),
    rating: {
      average: r.ratingCount > 0 ? Math.round((r.ratingSum / r.ratingCount) * 10) / 10 : null,
      count: r.ratingCount,
    },
    uploader: r.uploaderId ? (uploaders.get(r.uploaderId) ?? null) : null,
    createdAt: iso(r.createdAt),
  };
}

/** Треки за id у тому ж порядку (невідомі й неопубліковані пропускаються). */
export async function loadTracks(db: DbOrTx, ids: string[], opts: { includeHidden?: boolean } = {}) {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const rows = await selectTracks(db).where(
    opts.includeHidden ? inArray(tracks.id, unique) : and(inArray(tracks.id, unique), publishedTracks),
  );
  const hydrated = await hydrateTracks(db, rows);
  const byId = new Map(hydrated.map((t) => [t.id, t]));
  return ids.map((id) => byId.get(id)).filter((t): t is Track => !!t);
}

// ─── Виконавці й релізи ───────────────────────────────────────────────────

export const artistColumns = {
  id: artists.id,
  name: artists.name,
  slug: artists.slug,
  imageUrl: artists.imageUrl,
  verified: artists.verified,
  followerCount: artists.followerCount,
  trackCount: artists.trackCount,
};

export function toArtist(a: {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  verified: boolean;
  followerCount: number;
  trackCount: number;
}): Artist {
  return { ...a };
}

export const releaseColumns = {
  id: releases.id,
  title: releases.title,
  type: releases.type,
  releaseDate: releases.releaseDate,
  coverUrl: releases.coverUrl,
  trackCount: releases.trackCount,
  durationMs: releases.durationMs,
};

export type ReleaseRow = {
  id: string;
  title: string;
  type: "album" | "single" | "ep" | "compilation";
  releaseDate: string | null;
  coverUrl: string | null;
  trackCount: number;
  durationMs: number;
};

export async function hydrateReleases(db: DbOrTx, rows: ReleaseRow[]): Promise<Release[]> {
  if (rows.length === 0) return [];
  const credits = await db
    .select({ releaseId: releaseArtists.releaseId, id: artists.id, name: artists.name, slug: artists.slug })
    .from(releaseArtists)
    .innerJoin(artists, eq(artists.id, releaseArtists.artistId))
    .where(
      inArray(
        releaseArtists.releaseId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(releaseArtists.position));
  const byRelease = group(credits, (c) => c.releaseId);
  return rows.map((r) => ({
    ...r,
    durationMs: Number(r.durationMs),
    artists: (byRelease.get(r.id) ?? []).map(({ id, name, slug }) => ({ id, name, slug })),
  }));
}

export function toReleaseRef(r: Release | ReleaseRow): ReleaseRef {
  return { id: r.id, title: r.title, type: r.type, coverUrl: r.coverUrl, releaseDate: r.releaseDate };
}

// ─── Плейлисти ────────────────────────────────────────────────────────────

export type PlaylistRow = typeof playlists.$inferSelect;

export async function hydratePlaylists(db: DbOrTx, rows: PlaylistRow[]): Promise<Playlist[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [owners, covers] = await Promise.all([
    loadUserRefs(
      db,
      rows.map((r) => r.ownerId),
    ),
    db.execute<{ playlist_id: string; cover_url: string }>(sql`
      select playlist_id, cover_url from (
        select i.playlist_id, r.cover_url, row_number() over (partition by i.playlist_id order by i.position) rn
        from ${playlistItems} i
        join ${tracks} t on t.id = i.track_id
        join ${releases} r on r.id = t.primary_release_id
        where r.cover_url is not null and i.playlist_id in (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `,
        )})
      ) x where rn <= 16`),
  ]);
  const mosaic = new Map<string, string[]>();
  for (const row of rowsOf<{ playlist_id: string; cover_url: string }>(covers)) {
    const list = mosaic.get(row.playlist_id) ?? [];
    if (!list.includes(row.cover_url) && list.length < 4) list.push(row.cover_url);
    mosaic.set(row.playlist_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    coverUrl: r.coverUrl,
    mosaic: mosaic.get(r.id) ?? [],
    owner: owners.get(r.ownerId) ?? { id: r.ownerId, username: null, name: "—", image: null },
    visibility: r.visibility,
    collaborative: r.collaborative,
    trackCount: r.trackCount,
    durationMs: Number(r.durationMs),
    followerCount: r.followerCount,
    updatedAt: iso(r.updatedAt),
  }));
}

// ─── Утиліти ──────────────────────────────────────────────────────────────

export function group<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/** db.execute повертає масив (postgres.js) або { rows } (PGlite) — зводимо до масиву. */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] }).rows;
  return rows ?? [];
}

export { iso };
export const hasCover = isNotNull(releases.coverUrl);
