/**
 * Каталог: виконавці, релізи, треки, жанри, аудіофайли.
 *
 * Трек може входити в кілька релізів (сингл, альбом, збірка) — зв'язок release_tracks;
 * primary_release_id — реліз, з яким трек показується в списках (обкладинка, назва альбому).
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, type LocalizedText, ts, updatedAt } from "./_columns";

/** Ідентифікатори на офіційних платформах — заповнює звірка каталогу (tools/catalog-verify). */
export type ExternalIds = {
  deezer?: string;
  musicbrainz?: string;
  itunes?: string;
  spotify?: string;
  wikidata?: string;
};
/** Посилання виконавця з MusicBrainz: офіційний сайт, стрімінги, соцмережі, Genius, Вікіпедія. */
export type ArtistLink = { kind: string; url: string };

import { users } from "./auth";

export const trackSource = pgEnum("track_source", ["catalog", "community"]);
export const trackStatus = pgEnum("track_status", ["draft", "processing", "published", "hidden", "removed"]);
export const releaseType = pgEnum("release_type", ["album", "single", "ep", "compilation"]);
export const creditRole = pgEnum("credit_role", ["main", "featured"]);
export const assetStatus = pgEnum("asset_status", ["pending", "uploaded", "processing", "ready", "failed"]);
export const assetKind = pgEnum("asset_kind", ["audio", "image", "attachment", "video"]);

export const artists = pgTable(
  "artists",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** Ім'я для порівняння: нижній регістр, без діакритики й зайвих пробілів. */
    normalizedName: text("normalized_name").notNull(),
    bio: jsonb("bio").$type<LocalizedText>(),
    /** Звідки біографія (сторінка Вікіпедії для кожної мови) — для зазначення джерела. */
    bioSource: jsonb("bio_source").$type<LocalizedText>(),
    imageUrl: text("image_url"),
    verified: boolean("verified").notNull().default(false),
    externalIds: jsonb("external_ids").$type<ExternalIds>(),
    links: jsonb("links").$type<ArtistLink[]>(),
    /** Країна (ISO 3166-1 alpha-2) і рік початку (заснування гурту / народження) — з MusicBrainz. */
    country: text("country"),
    beginYear: smallint("begin_year"),
    /** Тип з MusicBrainz: Group, Person, Orchestra, Choir… — щоб рік показувати лише для гуртів. */
    artistType: text("artist_type"),
    /** Акаунт, яким виконавець керує сторінкою (артист-кабінет). */
    managedBy: text("managed_by").references(() => users.id, { onDelete: "set null" }),
    followerCount: integer("follower_count").notNull().default(0),
    trackCount: integer("track_count").notNull().default(0),
    legacyId: integer("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("artists_slug_key").on(t.slug),
    index("artists_normalized_name_idx").on(t.normalizedName),
    uniqueIndex("artists_legacy_id_key").on(t.legacyId),
  ],
);

export const releases = pgTable(
  "releases",
  {
    id: id(),
    title: text("title").notNull(),
    type: releaseType("type").notNull().default("album"),
    releaseDate: date("release_date"),
    coverUrl: text("cover_url"),
    label: text("label"),
    upc: text("upc"),
    externalIds: jsonb("external_ids").$type<ExternalIds>(),
    trackCount: integer("track_count").notNull().default(0),
    durationMs: bigint("duration_ms", { mode: "number" }).notNull().default(0),
    legacyId: integer("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("releases_legacy_id_key").on(t.legacyId), index("releases_date_idx").on(t.releaseDate)],
);

export const releaseArtists = pgTable(
  "release_artists",
  {
    releaseId: text("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.releaseId, t.artistId] }),
    index("release_artists_artist_idx").on(t.artistId),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: id(),
    kind: assetKind("kind").notNull(),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    status: assetStatus("status").notNull().default("pending"),
    /** Ключ оригіналу у сховищі. */
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    /** Аудіо після обробки: префікс потоку (HLS) або ключ файлу для прогресивного відтворення. */
    streamKey: text("stream_key"),
    streamFormat: text("stream_format"),
    durationMs: integer("duration_ms"),
    bitrateKbps: integer("bitrate_kbps"),
    /** Інтегральна гучність EBU R128 оригіналу — плеєр вирівнює гучність між треками. */
    loudnessLufs: real("loudness_lufs"),
    truePeakDb: real("true_peak_db"),
    /** Пікові значення для хвилі (0–255), ~200 точок. */
    waveform: jsonb("waveform").$type<number[]>(),
    error: text("error"),
    createdAt: createdAt(),
    processedAt: ts("processed_at"),
  },
  (t) => [index("assets_owner_idx").on(t.ownerId), index("assets_status_idx").on(t.status)],
);

export const tracks = pgTable(
  "tracks",
  {
    id: id(),
    title: text("title").notNull(),
    durationMs: integer("duration_ms").notNull().default(0),
    explicit: boolean("explicit").notNull().default(false),
    isrc: text("isrc"),
    releaseDate: date("release_date"),
    primaryReleaseId: text("primary_release_id").references(() => releases.id, { onDelete: "set null" }),
    trackNumber: smallint("track_number"),
    discNumber: smallint("disc_number").notNull().default(1),
    source: trackSource("source").notNull().default("catalog"),
    status: trackStatus("status").notNull().default("published"),
    uploaderId: text("uploader_id").references(() => users.id, { onDelete: "set null" }),
    /** Відтворення каталогу — через YouTube (офіційний вбудований плеєр). */
    youtubeVideoId: text("youtube_video_id"),
    /** Власний аудіофайл (пісні ком'юніті або ліцензовані). */
    audioAssetId: text("audio_asset_id").references(() => assets.id, { onDelete: "set null" }),
    /** Відеокліп, прикріплений адміном. */
    videoAssetId: text("video_asset_id").references(() => assets.id, { onDelete: "set null" }),
    lyrics: text("lyrics"),
    /** Синхронізований текст у форматі LRC — караоке. */
    lyricsSynced: text("lyrics_synced"),
    externalIds: jsonb("external_ids").$type<ExternalIds>(),
    playCount: bigint("play_count", { mode: "number" }).notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    ratingSum: integer("rating_sum").notNull().default(0),
    legacyId: integer("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("tracks_legacy_id_key").on(t.legacyId),
    index("tracks_source_status_idx").on(t.source, t.status),
    index("tracks_primary_release_idx").on(t.primaryReleaseId),
    index("tracks_uploader_idx").on(t.uploaderId),
    index("tracks_play_count_idx").on(t.playCount.desc()),
    index("tracks_created_idx").on(t.createdAt.desc()),
  ],
);

export const releaseTracks = pgTable(
  "release_tracks",
  {
    releaseId: text("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
    disc: smallint("disc").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.releaseId, t.trackId] }), index("release_tracks_track_idx").on(t.trackId)],
);

export const trackArtists = pgTable(
  "track_artists",
  {
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
    role: creditRole("role").notNull().default("main"),
  },
  (t) => [primaryKey({ columns: [t.trackId, t.artistId] }), index("track_artists_artist_idx").on(t.artistId)],
);

export const genres = pgTable(
  "genres",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: text("parent_id"),
    trackCount: integer("track_count").notNull().default(0),
    legacyId: integer("legacy_id"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("genres_slug_key").on(t.slug),
    uniqueIndex("genres_name_key").on(sql`lower(${t.name})`),
    uniqueIndex("genres_legacy_id_key").on(t.legacyId),
  ],
);

export const trackGenres = pgTable(
  "track_genres",
  {
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    genreId: text("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.trackId, t.genreId] }), index("track_genres_genre_idx").on(t.genreId)],
);

export const trackRatings = pgTable(
  "track_ratings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    score: smallint("score").notNull(),
    review: text("review"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.trackId] }),
    index("track_ratings_track_idx").on(t.trackId, t.updatedAt.desc()),
    check("track_ratings_score_range", sql`${t.score} between 0 and 100`),
  ],
);

/**
 * Результат звірки пісні чи виконавця з офіційними платформами (Deezer, MusicBrainz, Apple Music…):
 * що знайшлося на кожній, які поля змінено (лише ті, де погодились щонайменше два джерела) і розбіжності.
 */
export const catalogChecks = pgTable(
  "catalog_checks",
  {
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    /** verified — усе звірено; partial — частину; unmatched — не знайдено; conflict — джерела розходяться. */
    status: text("status").notNull(),
    sources: jsonb("sources").$type<Record<string, unknown>>().notNull().default({}),
    applied: jsonb("applied")
      .$type<Record<string, { from: unknown; to: unknown; sources: string[] }>>()
      .notNull()
      .default({}),
    conflicts: jsonb("conflicts").$type<Record<string, Record<string, unknown>>>().notNull().default({}),
    checkedAt: ts("checked_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.entityType, t.entityId] }),
    index("catalog_checks_status_idx").on(t.status),
  ],
);
