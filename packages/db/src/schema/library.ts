/**
 * Бібліотека користувача: вподобане, підписки, плейлисти, прослуховування.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt } from "./_columns";
import { users } from "./auth";
import { artists, releases, tracks } from "./catalog";

export const visibility = pgEnum("visibility", ["public", "unlisted", "private"]);

export const trackLikes = pgTable(
  "track_likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.trackId] }),
    index("track_likes_user_idx").on(t.userId, t.createdAt.desc()),
    index("track_likes_track_idx").on(t.trackId),
  ],
);

export const releaseSaves = pgTable(
  "release_saves",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    releaseId: text("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.releaseId] }),
    index("release_saves_user_idx").on(t.userId, t.createdAt.desc()),
  ],
);

export const artistFollows = pgTable(
  "artist_follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.artistId] }), index("artist_follows_artist_idx").on(t.artistId)],
);

/** Підписка на людину. Взаємна підписка = друзі (можна писати без запиту). */
export const userFollows = pgTable(
  "user_follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: text("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followeeId] }),
    index("user_follows_followee_idx").on(t.followeeId),
    check("user_follows_not_self", sql`${t.followerId} <> ${t.followeeId}`),
  ],
);

export const userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.blockerId, t.blockedId] }),
    index("user_blocks_blocked_idx").on(t.blockedId),
  ],
);

export const playlists = pgTable(
  "playlists",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    visibility: visibility("visibility").notNull().default("private"),
    collaborative: boolean("collaborative").notNull().default(false),
    trackCount: integer("track_count").notNull().default(0),
    durationMs: bigint("duration_ms", { mode: "number" }).notNull().default(0),
    followerCount: integer("follower_count").notNull().default(0),
    legacyId: integer("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("playlists_owner_idx").on(t.ownerId, t.updatedAt.desc()),
    uniqueIndex("playlists_legacy_id_key").on(t.legacyId),
  ],
);

/**
 * Позиція — дробовий ключ (fractional indexing): перестановка змінює один рядок, а не весь плейлист.
 * Один трек може бути в плейлисті кілька разів, як у Spotify.
 */
export const playlistItems = pgTable(
  "playlist_items",
  {
    id: id(),
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    position: text("position").notNull(),
    addedBy: text("added_by").references(() => users.id, { onDelete: "set null" }),
    addedAt: createdAt(),
  },
  (t) => [
    index("playlist_items_order_idx").on(t.playlistId, t.position),
    index("playlist_items_track_idx").on(t.trackId),
  ],
);

export const playlistFollows = pgTable(
  "playlist_follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.playlistId] }),
    index("playlist_follows_playlist_idx").on(t.playlistId),
  ],
);

/**
 * Прослуховування. Зараховується після 30 с або половини треку (як прийнято в індустрії);
 * з цієї таблиці будуються історія, чарти, рекомендації й «Схожий смак».
 */
export const plays = pgTable(
  "plays",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    /** Звідки грало: album | playlist | artist | search | radio | queue … */
    contextType: text("context_type"),
    contextId: text("context_id"),
    msPlayed: integer("ms_played").notNull().default(0),
    platform: text("platform"),
    playedAt: ts("played_at").notNull().defaultNow(),
  },
  (t) => [
    index("plays_user_idx").on(t.userId, t.playedAt.desc()),
    index("plays_track_idx").on(t.trackId, t.playedAt.desc()),
    index("plays_played_at_idx").on(t.playedAt.desc()),
  ],
);

/**
 * Перемоги в батл роялі: пісня стала чемпіоном турніру. Один запис на турнір (ключ турніру з клієнта),
 * тож оновлення сторінки чи повторне надсилання не накручують лічильник.
 */
export const battleWins = pgTable(
  "battle_wins",
  {
    id: id(),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    battleKey: text("battle_key").notNull(),
    poolSize: integer("pool_size").notNull(),
    poolTitle: text("pool_title"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("battle_wins_user_battle_key").on(t.userId, t.battleKey),
    index("battle_wins_track_idx").on(t.trackId),
  ],
);
