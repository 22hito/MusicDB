import { z } from "zod";
import { Id, IsoDate, IsoDateTime, LocalizedText } from "./common";

// ─── Посилання (компактні вкладені об'єкти) ───────────────────────────────

export const UserRef = z
  .object({
    id: Id,
    username: z.string().nullable(),
    name: z.string(),
    image: z.string().nullable(),
  })
  .meta({ id: "UserRef" });
export type UserRef = z.infer<typeof UserRef>;

export const ArtistRef = z
  .object({
    id: Id,
    name: z.string(),
    slug: z.string(),
  })
  .meta({ id: "ArtistRef" });
export type ArtistRef = z.infer<typeof ArtistRef>;

export const ReleaseType = z.enum(["album", "single", "ep", "compilation"]);
export type ReleaseType = z.infer<typeof ReleaseType>;

export const ReleaseRef = z
  .object({
    id: Id,
    title: z.string(),
    type: ReleaseType,
    coverUrl: z.string().nullable(),
    releaseDate: IsoDate.nullable(),
  })
  .meta({ id: "ReleaseRef" });
export type ReleaseRef = z.infer<typeof ReleaseRef>;

export const GenreRef = z.object({ id: Id, name: z.string(), slug: z.string() }).meta({ id: "GenreRef" });
export type GenreRef = z.infer<typeof GenreRef>;

// ─── Каталог ──────────────────────────────────────────────────────────────

export const TrackSource = z.enum(["catalog", "community"]);
export type TrackSource = z.infer<typeof TrackSource>;

export const Track = z
  .object({
    id: Id,
    title: z.string(),
    durationMs: z.number().int(),
    explicit: z.boolean(),
    artists: z.array(ArtistRef),
    release: ReleaseRef.nullable(),
    releaseDate: IsoDate.nullable(),
    source: TrackSource,
    genres: z.array(GenreRef),
    /** Чим можна відтворити: власний файл (грає у фоні) чи YouTube. */
    playback: z.object({
      audio: z.boolean(),
      youtubeVideoId: z.string().nullable(),
      /** Відео ще не знайдене, але сервер може знайти його на YouTube (трек каталогу й пошук налаштований). */
      resolvable: z.boolean(),
    }),
    hasLyrics: z.boolean(),
    playCount: z.number().int(),
    rating: z.object({ average: z.number().nullable(), count: z.number().int() }),
    uploader: UserRef.nullable(),
    createdAt: IsoDateTime,
  })
  .meta({ id: "Track" });
export type Track = z.infer<typeof Track>;

export const TrackDetail = Track.extend({
  trackNumber: z.number().int().nullable(),
  discNumber: z.number().int(),
  releases: z.array(ReleaseRef),
  likeCount: z.number().int(),
  waveform: z.array(z.number().int()).nullable(),
  /** Стан для поточного користувача (null без входу). */
  viewer: z
    .object({
      liked: z.boolean(),
      rating: z.number().int().nullable(),
    })
    .nullable(),
}).meta({ id: "TrackDetail" });
export type TrackDetail = z.infer<typeof TrackDetail>;

export const Lyrics = z
  .object({
    trackId: Id,
    plain: z.string().nullable(),
    /** Рядки з часом (мс) — для караоке; null, якщо синхронізації немає. */
    synced: z.array(z.object({ timeMs: z.number().int(), text: z.string() })).nullable(),
  })
  .meta({ id: "Lyrics" });
export type Lyrics = z.infer<typeof Lyrics>;

export const PlaybackSource = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("youtube"), videoId: z.string() }),
    z.object({
      type: z.literal("hls"),
      url: z.string(),
      expiresAt: IsoDateTime,
      loudnessLufs: z.number().nullable(),
    }),
    z.object({
      type: z.literal("file"),
      url: z.string(),
      mimeType: z.string(),
      expiresAt: IsoDateTime,
      loudnessLufs: z.number().nullable(),
    }),
  ])
  .meta({ id: "PlaybackSource" });
export type PlaybackSource = z.infer<typeof PlaybackSource>;

export const Artist = z
  .object({
    id: Id,
    name: z.string(),
    slug: z.string(),
    imageUrl: z.string().nullable(),
    verified: z.boolean(),
    followerCount: z.number().int(),
    trackCount: z.number().int(),
  })
  .meta({ id: "Artist" });
export type Artist = z.infer<typeof Artist>;

export const Release = z
  .object({
    id: Id,
    title: z.string(),
    type: ReleaseType,
    releaseDate: IsoDate.nullable(),
    coverUrl: z.string().nullable(),
    artists: z.array(ArtistRef),
    trackCount: z.number().int(),
    durationMs: z.number().int(),
  })
  .meta({ id: "Release" });
export type Release = z.infer<typeof Release>;

export const ArtistDetail = Artist.extend({
  bio: LocalizedText.nullable(),
  /** Сторінка-джерело біографії (Вікіпедія) для кожної мови. */
  bioSource: LocalizedText.nullable(),
  /** Офіційний сайт, стрімінги, соцмережі, Genius — звірені через MusicBrainz. */
  links: z.array(z.object({ kind: z.string(), url: z.string() })),
  country: z.string().nullable(),
  beginYear: z.number().int().nullable(),
  /** Group / Person / Orchestra… (MusicBrainz). */
  artistType: z.string().nullable(),
  genres: z.array(GenreRef),
  topTracks: z.array(Track),
  releases: z.array(Release),
  appearsOn: z.array(Release),
  related: z.array(Artist),
  monthlyListeners: z.number().int(),
  viewer: z.object({ following: z.boolean() }).nullable(),
}).meta({ id: "ArtistDetail" });
export type ArtistDetail = z.infer<typeof ArtistDetail>;

export const ReleaseDetail = Release.extend({
  label: z.string().nullable(),
  tracks: z.array(Track),
  moreByArtist: z.array(Release),
  viewer: z.object({ saved: z.boolean() }).nullable(),
}).meta({ id: "ReleaseDetail" });
export type ReleaseDetail = z.infer<typeof ReleaseDetail>;

export const Genre = z
  .object({ id: Id, name: z.string(), slug: z.string(), trackCount: z.number().int() })
  .meta({ id: "Genre" });
export type Genre = z.infer<typeof Genre>;

// ─── Плейлисти ────────────────────────────────────────────────────────────

export const Visibility = z.enum(["public", "unlisted", "private"]);
export type Visibility = z.infer<typeof Visibility>;

export const Playlist = z
  .object({
    id: Id,
    title: z.string(),
    description: z.string().nullable(),
    coverUrl: z.string().nullable(),
    /** До 4 обкладинок перших треків — мозаїка, якщо власної обкладинки немає. */
    mosaic: z.array(z.string()),
    owner: UserRef,
    visibility: Visibility,
    collaborative: z.boolean(),
    trackCount: z.number().int(),
    durationMs: z.number().int(),
    followerCount: z.number().int(),
    updatedAt: IsoDateTime,
  })
  .meta({ id: "Playlist" });
export type Playlist = z.infer<typeof Playlist>;

export const PlaylistItem = z
  .object({
    id: Id,
    track: Track,
    addedAt: IsoDateTime,
    addedBy: UserRef.nullable(),
  })
  .meta({ id: "PlaylistItem" });
export type PlaylistItem = z.infer<typeof PlaylistItem>;

export const PlaylistDetail = Playlist.extend({
  items: z.array(PlaylistItem),
  viewer: z.object({ isOwner: z.boolean(), canEdit: z.boolean(), following: z.boolean() }).nullable(),
}).meta({ id: "PlaylistDetail" });
export type PlaylistDetail = z.infer<typeof PlaylistDetail>;

// ─── Користувачі ──────────────────────────────────────────────────────────

export const Role = z.enum(["user", "artist", "moderator", "admin"]);
export type Role = z.infer<typeof Role>;

export const Me = z
  .object({
    id: Id,
    email: z.string(),
    name: z.string(),
    username: z.string().nullable(),
    image: z.string().nullable(),
    bio: z.string().nullable(),
    role: Role,
    locale: z.enum(["uk", "en"]),
    isPrivate: z.boolean(),
    premium: z.object({ active: z.boolean(), until: IsoDateTime.nullable() }),
    createdAt: IsoDateTime,
  })
  .meta({ id: "Me" });
export type Me = z.infer<typeof Me>;

export const Profile = z
  .object({
    id: Id,
    username: z.string().nullable(),
    name: z.string(),
    image: z.string().nullable(),
    bio: z.string().nullable(),
    isPrivate: z.boolean(),
    followerCount: z.number().int(),
    followingCount: z.number().int(),
    publicPlaylists: z.array(Playlist),
    topArtists: z.array(Artist),
    recentlyPlayed: z.array(Track),
    createdAt: IsoDateTime,
    viewer: z
      .object({
        isSelf: z.boolean(),
        following: z.boolean(),
        followsYou: z.boolean(),
        blocked: z.boolean(),
        /** Схожість смаків 0–100 (null, якщо даних замало). */
        tasteMatch: z.number().int().nullable(),
      })
      .nullable(),
  })
  .meta({ id: "Profile" });
export type Profile = z.infer<typeof Profile>;

export const UserCard = UserRef.extend({
  followerCount: z.number().int(),
  viewer: z.object({ following: z.boolean(), followsYou: z.boolean() }).nullable(),
}).meta({ id: "UserCard" });
export type UserCard = z.infer<typeof UserCard>;

// ─── Оцінки ───────────────────────────────────────────────────────────────

export const Rating = z
  .object({
    user: UserRef,
    score: z.number().int().min(0).max(100),
    review: z.string().nullable(),
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
  })
  .meta({ id: "Rating" });
export type Rating = z.infer<typeof Rating>;

// ─── Головна, пошук ───────────────────────────────────────────────────────

export const Shelf = z
  .discriminatedUnion("kind", [
    z.object({ id: z.string(), kind: z.literal("tracks"), title: z.string(), items: z.array(Track) }),
    z.object({ id: z.string(), kind: z.literal("releases"), title: z.string(), items: z.array(Release) }),
    z.object({ id: z.string(), kind: z.literal("artists"), title: z.string(), items: z.array(Artist) }),
    z.object({ id: z.string(), kind: z.literal("playlists"), title: z.string(), items: z.array(Playlist) }),
    z.object({ id: z.string(), kind: z.literal("genres"), title: z.string(), items: z.array(Genre) }),
  ])
  .meta({ id: "Shelf" });
export type Shelf = z.infer<typeof Shelf>;

export const HomeFeed = z.object({ shelves: z.array(Shelf) }).meta({ id: "HomeFeed" });
export type HomeFeed = z.infer<typeof HomeFeed>;

export const SearchType = z.enum(["track", "artist", "release", "playlist", "user", "genre"]);
export type SearchType = z.infer<typeof SearchType>;

export const TopResult = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("track"), item: Track }),
    z.object({ type: z.literal("artist"), item: Artist }),
    z.object({ type: z.literal("release"), item: Release }),
    z.object({ type: z.literal("playlist"), item: Playlist }),
    z.object({ type: z.literal("user"), item: UserRef }),
    z.object({ type: z.literal("genre"), item: Genre }),
  ])
  .meta({ id: "TopResult" });
export type TopResult = z.infer<typeof TopResult>;

export const SearchResults = z
  .object({
    query: z.string(),
    top: TopResult.nullable(),
    tracks: z.array(Track),
    artists: z.array(Artist),
    releases: z.array(Release),
    playlists: z.array(Playlist),
    users: z.array(UserRef),
    genres: z.array(Genre),
  })
  .meta({ id: "SearchResults" });
export type SearchResults = z.infer<typeof SearchResults>;

// ─── Історія ──────────────────────────────────────────────────────────────

export const PlayContext = z.object({
  type: z.enum([
    "album",
    "playlist",
    "artist",
    "genre",
    "search",
    "liked",
    "queue",
    "radio",
    "chart",
    "profile",
    "catalog",
    "wheel",
    "battle",
    "recommendations",
    "era",
  ]),
  id: z.string().max(64).optional(),
});
export type PlayContext = z.infer<typeof PlayContext>;

export const HistoryEntry = z
  .object({ track: Track, playedAt: IsoDateTime, context: PlayContext.nullable() })
  .meta({ id: "HistoryEntry" });
export type HistoryEntry = z.infer<typeof HistoryEntry>;

// ─── Відкриття: статистика, графи схожості, смак ─────────────────────────

export const CatalogStats = z
  .object({
    tracks: z.number().int(),
    genres: z.number().int(),
    albums: z.number().int(),
    singles: z.number().int(),
    artists: z.number().int(),
  })
  .meta({ id: "CatalogStats" });
export type CatalogStats = z.infer<typeof CatalogStats>;

/** Рядок чарту: місце, прослуховування, слухачі й рух відносно попереднього періоду. */
export const ChartEntry = Track.extend({
  rank: z.number().int(),
  plays: z.number().int(),
  listeners: z.number().int(),
  previousRank: z.number().int().nullable(),
  isNew: z.boolean(),
}).meta({ id: "ChartEntry" });
export type ChartEntry = z.infer<typeof ChartEntry>;

export const Timeline = z
  .object({
    decades: z.array(
      z.object({
        decade: z.number().int(),
        tracks: z.number().int(),
        years: z.array(z.object({ year: z.number().int(), tracks: z.number().int() })),
      }),
    ),
  })
  .meta({ id: "Timeline" });
export type Timeline = z.infer<typeof Timeline>;

/** Головне за рік чи десятиліття (Машина часу). */
export const Era = z
  .object({
    from: z.number().int(),
    to: z.number().int(),
    trackCount: z.number().int(),
    tracks: z.array(Track),
    releases: z.array(Release),
    artists: z.array(Artist.extend({ eraTracks: z.number().int() })),
    genres: z.array(GenreRef.extend({ tracks: z.number().int() })),
  })
  .meta({ id: "Era" });
export type Era = z.infer<typeof Era>;

/** Моя статистика (у дусі Last.fm / stats.fm): підсумки, топи, години, дні, активність за рік. */
export const MyStats = z
  .object({
    period: z.enum(["week", "month", "year", "all"]),
    totals: z.object({
      plays: z.number().int(),
      minutes: z.number().int(),
      tracks: z.number().int(),
      artists: z.number().int(),
    }),
    streakDays: z.number().int(),
    topArtists: z.array(z.object({ artist: Artist, plays: z.number().int() })),
    topTracks: z.array(z.object({ track: Track, plays: z.number().int() })),
    topGenres: z.array(z.object({ genre: GenreRef, plays: z.number().int() })),
    /** Прослуховування за годинами доби (0–23) і днями тижня (0 — понеділок). */
    byHour: z.array(z.number().int()),
    byWeekday: z.array(z.number().int()),
    /** Останні 365 днів: дата (YYYY-MM-DD) і кількість — для теплової карти. */
    daily: z.array(z.object({ date: z.string(), plays: z.number().int() })),
  })
  .meta({ id: "MyStats" });
export type MyStats = z.infer<typeof MyStats>;

export const TasteMatch = z
  .object({
    user: UserRef,
    match: z.number().int(),
    friend: z.boolean(),
    sharedArtists: z.array(z.object({ id: Id, name: z.string() })),
    sharedFavorites: z.number().int(),
  })
  .meta({ id: "TasteMatch" });
export type TasteMatch = z.infer<typeof TasteMatch>;

export const Taste = z
  .object({
    me: z.object({
      likedCount: z.number().int(),
      trackCount: z.number().int(),
      topArtists: z.array(Artist),
      topGenres: z.array(GenreRef),
    }),
    items: z.array(TasteMatch),
  })
  .meta({ id: "Taste" });
export type Taste = z.infer<typeof Taste>;
