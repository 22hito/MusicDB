/**
 * Таблиця всіх ендпоінтів API v1 — єдине джерело правди:
 * сервер реєструє маршрути й валідує вхід за нею, SDK типізує виклики, OpenAPI генерується з неї ж.
 */
import { z } from "zod";
import { Id, IsoDate, IsoDateTime, Ok, PageQuery, page } from "./common";
import { endpoint } from "./endpoint";
import {
  Artist,
  ArtistDetail,
  CatalogStats,
  ChartEntry,
  Era,
  Genre,
  HistoryEntry,
  HomeFeed,
  Lyrics,
  Me,
  MyStats,
  PlaybackSource,
  PlayContext,
  Playlist,
  PlaylistDetail,
  PlaylistItem,
  Profile,
  Rating,
  Release,
  ReleaseDetail,
  Role,
  SearchResults,
  SearchType,
  Taste,
  Timeline,
  Track,
  TrackDetail,
  TrackSource,
  UserCard,
  UserRef,
  Visibility,
} from "./models";
import {
  AuditEntry,
  BugReport,
  BugReportDraft,
  CorrectionDraft,
  CreateUploadBody,
  Report,
  ReportDraft,
  Submission,
  SubmissionStatus,
  TrackDraft,
  TrackDraftPatch,
  UploadStatus,
  UploadTicket,
} from "./moderation";
import {
  Badges,
  Conversation,
  Message,
  Notification,
  Post,
  SendMessageBody,
  Thread,
  ThreadDetail,
} from "./social";

const csv = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean));

const IdParam = z.object({ id: Id });
const Items = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });

// ─── Я ────────────────────────────────────────────────────────────────────

const me = {
  get: endpoint({
    method: "GET",
    path: "/v1/me",
    summary: "Поточний користувач",
    tag: "me",
    auth: "user",
    response: Me,
  }),
  update: endpoint({
    method: "PATCH",
    path: "/v1/me",
    summary: "Змінити профіль",
    tag: "me",
    auth: "user",
    body: z.object({
      name: z.string().trim().min(1).max(60).optional(),
      username: z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9_.]{3,30}$/)
        .optional(),
      bio: z.string().trim().max(300).nullable().optional(),
      locale: z.enum(["uk", "en"]).optional(),
      isPrivate: z.boolean().optional(),
      avatarUploadId: Id.nullable().optional(),
    }),
    response: Me,
  }),
  delete: endpoint({
    method: "DELETE",
    path: "/v1/me",
    summary: "Видалити акаунт і всі дані",
    tag: "me",
    auth: "user",
    body: z.object({ confirm: z.literal("DELETE") }),
  }),
  badges: endpoint({
    method: "GET",
    path: "/v1/me/badges",
    summary: "Лічильники бейджів",
    tag: "me",
    auth: "user",
    response: Badges,
  }),
  sessions: endpoint({
    method: "GET",
    path: "/v1/me/sessions",
    summary: "Пристрої, з яких виконано вхід",
    tag: "me",
    auth: "user",
    response: Items(
      z.object({
        id: Id,
        userAgent: z.string().nullable(),
        ipAddress: z.string().nullable(),
        createdAt: IsoDateTime,
        lastActiveAt: IsoDateTime,
        current: z.boolean(),
      }),
    ),
  }),
  stats: endpoint({
    method: "GET",
    path: "/v1/me/stats",
    summary: "Моя статистика прослуховувань за період",
    tag: "me",
    auth: "user",
    query: z.object({
      period: z.enum(["week", "month", "year", "all"]).default("month"),
      /** Часовий пояс користувача (IANA) — для годин, днів тижня й серії днів. */
      tz: z.string().max(64).optional(),
    }),
    response: MyStats,
  }),
  revokeSession: endpoint({
    method: "DELETE",
    path: "/v1/me/sessions/:id",
    summary: "Вийти на пристрої",
    tag: "me",
    auth: "user",
    params: IdParam,
  }),
};

// ─── Каталог ──────────────────────────────────────────────────────────────

const TrackSort = z.enum(["popular", "newest", "oldest", "title", "rating", "added"]);
/** Колонки таблиці каталогу, за якими можна сортувати в обидва боки (як у таблиці v1). */
const TrackColumn = z.enum(["title", "artist", "release", "duration", "album", "plays", "rating", "added"]);
const Seed = z.string().regex(/^[a-zA-Z0-9]{1,32}$/);

const tracks = {
  browse: endpoint({
    method: "GET",
    path: "/v1/tracks",
    summary: "Перегляд каталогу з фільтрами",
    tag: "catalog",
    auth: "optional",
    query: PageQuery.extend({
      source: TrackSource.optional(),
      genre: z.string().max(80).optional(),
      /** Текстовий фільтр: назва, виконавець, альбом (кілька слів — усі мають збігтися). */
      q: z.string().trim().max(200).optional(),
      /** Десятиліття за датою релізу: 1990 → 1990–1999. */
      decade: z.coerce.number().int().min(1900).max(2100).multipleOf(10).optional(),
      sort: z.union([TrackSort, z.literal("random")]).default("popular"),
      /** Сортування за колонкою таблиці; має пріоритет над sort. */
      column: TrackColumn.optional(),
      dir: z.enum(["asc", "desc"]).default("asc"),
      /** Зерно для sort=random — стабільний порядок між сторінками. */
      seed: Seed.optional(),
      playable: z.enum(["any", "audio"]).default("any"),
      ids: csv.optional(),
    }),
    response: page(Track),
  }),
  get: endpoint({
    method: "GET",
    path: "/v1/tracks/:id",
    summary: "Трек",
    tag: "catalog",
    auth: "optional",
    params: IdParam,
    response: TrackDetail,
  }),
  lyrics: endpoint({
    method: "GET",
    path: "/v1/tracks/:id/lyrics",
    summary: "Текст пісні",
    tag: "catalog",
    auth: "public",
    params: IdParam,
    response: Lyrics,
    cacheSeconds: 300,
  }),
  playback: endpoint({
    method: "GET",
    path: "/v1/tracks/:id/playback",
    summary: "Джерело відтворення (підписане посилання або YouTube)",
    tag: "catalog",
    auth: "optional",
    params: IdParam,
    query: z.object({ prefer: z.enum(["audio", "youtube"]).default("audio") }),
    response: PlaybackSource,
  }),
  radio: endpoint({
    method: "GET",
    path: "/v1/tracks/:id/radio",
    summary: "Схожі треки — автопродовження черги",
    tag: "catalog",
    auth: "optional",
    params: IdParam,
    query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(30), exclude: csv.optional() }),
    response: Items(Track),
  }),
};

const artists = {
  list: endpoint({
    method: "GET",
    path: "/v1/artists",
    summary: "Виконавці",
    tag: "catalog",
    auth: "public",
    query: PageQuery.extend({
      q: z.string().trim().max(100).optional(),
      sort: z.enum(["popular", "tracks", "followers", "name", "name_desc", "newest"]).default("popular"),
    }),
    response: page(Artist),
  }),
  get: endpoint({
    method: "GET",
    path: "/v1/artists/:id",
    summary: "Сторінка виконавця (id або slug)",
    tag: "catalog",
    auth: "optional",
    params: IdParam,
    response: ArtistDetail,
  }),
  tracks: endpoint({
    method: "GET",
    path: "/v1/artists/:id/tracks",
    summary: "Усі треки виконавця",
    tag: "catalog",
    auth: "public",
    params: IdParam,
    query: PageQuery.extend({ sort: TrackSort.default("popular") }),
    response: page(Track),
  }),
};

const releases = {
  get: endpoint({
    method: "GET",
    path: "/v1/releases/:id",
    summary: "Реліз (альбом, сингл, EP)",
    tag: "catalog",
    auth: "optional",
    params: IdParam,
    response: ReleaseDetail,
  }),
  newReleases: endpoint({
    method: "GET",
    path: "/v1/releases",
    summary: "Нові релізи",
    tag: "catalog",
    auth: "public",
    query: PageQuery,
    response: page(Release),
    cacheSeconds: 120,
  }),
};

const genres = {
  list: endpoint({
    method: "GET",
    path: "/v1/genres",
    summary: "Жанри",
    tag: "catalog",
    auth: "public",
    response: Items(Genre),
    cacheSeconds: 300,
  }),
  get: endpoint({
    method: "GET",
    path: "/v1/genres/:id",
    summary: "Жанр (id або slug) з популярними виконавцями",
    tag: "catalog",
    auth: "public",
    params: IdParam,
    response: Genre.extend({ topArtists: z.array(Artist), related: z.array(Genre) }),
  }),
};

const discover = {
  home: endpoint({
    method: "GET",
    path: "/v1/home",
    summary: "Головна: персональні полиці",
    tag: "discover",
    auth: "optional",
    response: HomeFeed,
  }),
  charts: endpoint({
    method: "GET",
    path: "/v1/charts/top",
    summary: "Чарт найпрослуханіших",
    tag: "discover",
    auth: "public",
    query: z.object({
      period: z.enum(["day", "week", "month", "all"]).default("week"),
      source: TrackSource.optional(),
      genre: z.string().max(80).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(100),
    }),
    /**
     * Ранжування — за кількістю людей, які слухали (як у v1), далі — за прослуховуваннями.
     * previousRank — місце за попередній такий самий період (null — не було або «весь час»), isNew — новинка.
     */
    response: Items(ChartEntry),
    cacheSeconds: 120,
  }),
  timeline: endpoint({
    method: "GET",
    path: "/v1/time-machine",
    summary: "Машина часу: скільки пісень у кожному десятилітті й році",
    tag: "discover",
    auth: "public",
    response: Timeline,
    cacheSeconds: 600,
  }),
  era: endpoint({
    method: "GET",
    path: "/v1/time-machine/:from/:to",
    summary: "Головне за рік або десятиліття: пісні, альбоми, жанри, виконавці",
    tag: "discover",
    auth: "public",
    params: z.object({
      from: z.coerce.number().int().min(1900).max(2100),
      to: z.coerce.number().int().min(1900).max(2100),
    }),
    response: Era,
    cacheSeconds: 300,
  }),
  stats: endpoint({
    method: "GET",
    path: "/v1/stats/catalog",
    summary: "Лічильники каталогу: пісні, жанри, альбоми, сингли",
    tag: "discover",
    auth: "public",
    query: z.object({ source: TrackSource.optional(), playable: z.enum(["any", "audio"]).default("any") }),
    response: CatalogStats,
    cacheSeconds: 120,
  }),
  search: endpoint({
    method: "GET",
    path: "/v1/search",
    summary: "Пошук по всьому",
    tag: "discover",
    auth: "optional",
    query: z.object({
      q: z.string().trim().min(1).max(200),
      types: csv.pipe(z.array(SearchType)).optional(),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    }),
    response: SearchResults,
  }),
  recommendations: endpoint({
    method: "GET",
    path: "/v1/me/recommendations",
    summary: "Рекомендації на основі прослуховувань",
    tag: "discover",
    auth: "user",
    query: z.object({ limit: z.coerce.number().int().min(1).max(50).default(30) }),
    response: Items(Track.extend({ reason: z.string() })),
  }),
  taste: endpoint({
    method: "GET",
    path: "/v1/me/taste",
    summary: "Ваш смак і люди зі схожим смаком",
    tag: "discover",
    auth: "user",
    response: Taste,
  }),
};

// ─── Бібліотека ───────────────────────────────────────────────────────────

const library = {
  overview: endpoint({
    method: "GET",
    path: "/v1/me/library",
    summary: "Бібліотека для бічної панелі",
    tag: "library",
    auth: "user",
    response: z.object({
      likedCount: z.number().int(),
      playlists: z.array(Playlist),
      artists: z.array(Artist),
      releases: z.array(Release),
    }),
  }),
  likedTracks: endpoint({
    method: "GET",
    path: "/v1/me/tracks",
    summary: "Вподобані треки",
    tag: "library",
    auth: "user",
    query: PageQuery,
    response: page(z.object({ track: Track, likedAt: IsoDateTime })),
  }),
  likedIds: endpoint({
    method: "GET",
    path: "/v1/me/tracks/ids",
    summary: "Id усіх вподобаних треків (для сердечок у списках)",
    tag: "library",
    auth: "user",
    response: z.object({ ids: z.array(Id) }),
  }),
  likeTrack: endpoint({
    method: "PUT",
    path: "/v1/me/tracks/:id",
    summary: "Вподобати трек",
    tag: "library",
    auth: "user",
    params: IdParam,
  }),
  unlikeTrack: endpoint({
    method: "DELETE",
    path: "/v1/me/tracks/:id",
    summary: "Прибрати з вподобаних",
    tag: "library",
    auth: "user",
    params: IdParam,
  }),
  saveRelease: endpoint({
    method: "PUT",
    path: "/v1/me/releases/:id",
    summary: "Зберегти реліз",
    tag: "library",
    auth: "user",
    params: IdParam,
  }),
  unsaveRelease: endpoint({
    method: "DELETE",
    path: "/v1/me/releases/:id",
    summary: "Прибрати реліз",
    tag: "library",
    auth: "user",
    params: IdParam,
  }),
  followArtist: endpoint({
    method: "PUT",
    path: "/v1/me/following/artists/:id",
    summary: "Підписатися на виконавця",
    tag: "library",
    auth: "user",
    params: IdParam,
  }),
  unfollowArtist: endpoint({
    method: "DELETE",
    path: "/v1/me/following/artists/:id",
    summary: "Відписатися від виконавця",
    tag: "library",
    auth: "user",
    params: IdParam,
  }),
  history: endpoint({
    method: "GET",
    path: "/v1/me/history",
    summary: "Історія прослуховувань",
    tag: "library",
    auth: "user",
    query: PageQuery,
    response: page(HistoryEntry),
  }),
  clearHistory: endpoint({
    method: "DELETE",
    path: "/v1/me/history",
    summary: "Очистити історію",
    tag: "library",
    auth: "user",
  }),
  reportPlay: endpoint({
    method: "POST",
    path: "/v1/plays",
    summary: "Зарахувати прослуховування",
    tag: "library",
    auth: "optional",
    body: z.object({
      trackId: Id,
      msPlayed: z
        .number()
        .int()
        .min(0)
        .max(6 * 3600_000),
      context: PlayContext.optional(),
      platform: z.enum(["web", "android", "ios", "desktop"]).default("web"),
    }),
    response: z.object({ counted: z.boolean() }),
    status: 202,
  }),
};

// ─── Плейлисти ────────────────────────────────────────────────────────────

const playlists = {
  create: endpoint({
    method: "POST",
    path: "/v1/playlists",
    summary: "Створити плейлист",
    tag: "playlists",
    auth: "user",
    body: z.object({
      title: z.string().trim().min(1).max(100),
      description: z.string().trim().max(300).optional(),
      visibility: Visibility.default("private"),
      trackIds: z.array(Id).max(500).default([]),
    }),
    response: Playlist,
    status: 201,
  }),
  browse: endpoint({
    method: "GET",
    path: "/v1/playlists",
    summary: "Публічні плейлисти спільноти",
    tag: "playlists",
    auth: "public",
    query: PageQuery.extend({
      minTracks: z.coerce.number().int().min(0).max(1024).default(0),
      sort: z.enum(["popular", "recent"]).default("popular"),
    }),
    response: page(Playlist),
    cacheSeconds: 60,
  }),
  get: endpoint({
    method: "GET",
    path: "/v1/playlists/:id",
    summary: "Плейлист",
    tag: "playlists",
    auth: "optional",
    params: IdParam,
    response: PlaylistDetail,
  }),
  update: endpoint({
    method: "PATCH",
    path: "/v1/playlists/:id",
    summary: "Змінити плейлист",
    tag: "playlists",
    auth: "user",
    params: IdParam,
    body: z.object({
      title: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().max(300).nullable().optional(),
      visibility: Visibility.optional(),
      collaborative: z.boolean().optional(),
      coverUploadId: Id.nullable().optional(),
    }),
    response: Playlist,
  }),
  delete: endpoint({
    method: "DELETE",
    path: "/v1/playlists/:id",
    summary: "Видалити плейлист",
    tag: "playlists",
    auth: "user",
    params: IdParam,
  }),
  addItems: endpoint({
    method: "POST",
    path: "/v1/playlists/:id/items",
    summary: "Додати треки",
    tag: "playlists",
    auth: "user",
    params: IdParam,
    body: z.object({ trackIds: z.array(Id).min(1).max(500), afterItemId: Id.nullable().optional() }),
    response: Items(PlaylistItem),
    status: 201,
  }),
  removeItem: endpoint({
    method: "DELETE",
    path: "/v1/playlists/:id/items/:itemId",
    summary: "Прибрати трек",
    tag: "playlists",
    auth: "user",
    params: z.object({ id: Id, itemId: Id }),
  }),
  moveItem: endpoint({
    method: "PATCH",
    path: "/v1/playlists/:id/items/:itemId",
    summary: "Перемістити трек (після іншого; null — на початок)",
    tag: "playlists",
    auth: "user",
    params: z.object({ id: Id, itemId: Id }),
    body: z.object({ afterItemId: Id.nullable() }),
  }),
  follow: endpoint({
    method: "PUT",
    path: "/v1/playlists/:id/follow",
    summary: "Зберегти чужий плейлист",
    tag: "playlists",
    auth: "user",
    params: IdParam,
  }),
  unfollow: endpoint({
    method: "DELETE",
    path: "/v1/playlists/:id/follow",
    summary: "Прибрати чужий плейлист",
    tag: "playlists",
    auth: "user",
    params: IdParam,
  }),
};

// ─── Оцінки ───────────────────────────────────────────────────────────────

const ratings = {
  list: endpoint({
    method: "GET",
    path: "/v1/tracks/:id/ratings",
    summary: "Оцінки й рецензії треку",
    tag: "ratings",
    auth: "public",
    params: IdParam,
    query: PageQuery.extend({ withReview: z.coerce.boolean().default(false) }),
    response: page(Rating).extend({
      summary: z.object({
        average: z.number().nullable(),
        count: z.number().int(),
        histogram: z.array(z.number().int()).length(10),
      }),
    }),
  }),
  put: endpoint({
    method: "PUT",
    path: "/v1/tracks/:id/rating",
    summary: "Поставити оцінку",
    tag: "ratings",
    auth: "user",
    params: IdParam,
    body: z.object({
      score: z.number().int().min(0).max(100),
      review: z.string().trim().max(5000).nullable().optional(),
    }),
    response: Rating,
  }),
  delete: endpoint({
    method: "DELETE",
    path: "/v1/tracks/:id/rating",
    summary: "Прибрати оцінку",
    tag: "ratings",
    auth: "user",
    params: IdParam,
  }),
};

// ─── Люди ─────────────────────────────────────────────────────────────────

const users = {
  get: endpoint({
    method: "GET",
    path: "/v1/users/:id",
    summary: "Профіль (id або username)",
    tag: "users",
    auth: "optional",
    params: IdParam,
    response: Profile,
  }),
  common: endpoint({
    method: "GET",
    path: "/v1/users/:id/common",
    summary: "Спільне з людиною: пісні, які подобаються чи слухаються обом",
    tag: "users",
    auth: "user",
    params: IdParam,
    response: Items(Track),
  }),
  playlists: endpoint({
    method: "GET",
    path: "/v1/users/:id/playlists",
    summary: "Публічні плейлисти людини",
    tag: "users",
    auth: "optional",
    params: IdParam,
    query: PageQuery,
    response: page(Playlist),
  }),
  followers: endpoint({
    method: "GET",
    path: "/v1/users/:id/followers",
    summary: "Підписники",
    tag: "users",
    auth: "optional",
    params: IdParam,
    query: PageQuery,
    response: page(UserCard),
  }),
  following: endpoint({
    method: "GET",
    path: "/v1/users/:id/following",
    summary: "Підписки",
    tag: "users",
    auth: "optional",
    params: IdParam,
    query: PageQuery,
    response: page(UserCard),
  }),
  follow: endpoint({
    method: "PUT",
    path: "/v1/users/:id/follow",
    summary: "Підписатися",
    tag: "users",
    auth: "user",
    params: IdParam,
  }),
  unfollow: endpoint({
    method: "DELETE",
    path: "/v1/users/:id/follow",
    summary: "Відписатися",
    tag: "users",
    auth: "user",
    params: IdParam,
  }),
  block: endpoint({
    method: "PUT",
    path: "/v1/users/:id/block",
    summary: "Заблокувати",
    tag: "users",
    auth: "user",
    params: IdParam,
  }),
  unblock: endpoint({
    method: "DELETE",
    path: "/v1/users/:id/block",
    summary: "Розблокувати",
    tag: "users",
    auth: "user",
    params: IdParam,
  }),
};

// ─── Спілкування ──────────────────────────────────────────────────────────

const conversations = {
  list: endpoint({
    method: "GET",
    path: "/v1/conversations",
    summary: "Розмови",
    tag: "messages",
    auth: "user",
    query: PageQuery.extend({ folder: z.enum(["inbox", "requests"]).default("inbox") }),
    response: page(Conversation),
  }),
  open: endpoint({
    method: "POST",
    path: "/v1/conversations",
    summary: "Відкрити розмову з людиною",
    tag: "messages",
    auth: "user",
    body: z.object({ userId: Id }),
    response: Conversation,
  }),
  get: endpoint({
    method: "GET",
    path: "/v1/conversations/:id",
    summary: "Розмова",
    tag: "messages",
    auth: "user",
    params: IdParam,
    response: Conversation,
  }),
  messages: endpoint({
    method: "GET",
    path: "/v1/conversations/:id/messages",
    summary: "Повідомлення (новіші спершу)",
    tag: "messages",
    auth: "user",
    params: IdParam,
    query: PageQuery,
    response: page(Message),
  }),
  send: endpoint({
    method: "POST",
    path: "/v1/conversations/:id/messages",
    summary: "Надіслати повідомлення",
    tag: "messages",
    auth: "user",
    params: IdParam,
    body: SendMessageBody,
    response: Message,
    status: 201,
  }),
  read: endpoint({
    method: "POST",
    path: "/v1/conversations/:id/read",
    summary: "Позначити прочитаним",
    tag: "messages",
    auth: "user",
    params: IdParam,
  }),
  respond: endpoint({
    method: "POST",
    path: "/v1/conversations/:id/respond",
    summary: "Прийняти чи відхилити запит на листування",
    tag: "messages",
    auth: "user",
    params: IdParam,
    body: z.object({ accept: z.boolean() }),
  }),
  clear: endpoint({
    method: "POST",
    path: "/v1/conversations/:id/clear",
    summary: "Видалити історію в себе",
    tag: "messages",
    auth: "user",
    params: IdParam,
  }),
  deleteMessage: endpoint({
    method: "DELETE",
    path: "/v1/messages/:id",
    summary: "Видалити своє повідомлення",
    tag: "messages",
    auth: "user",
    params: IdParam,
  }),
};

const threads = {
  list: endpoint({
    method: "GET",
    path: "/v1/threads",
    summary: "Обговорення",
    tag: "community",
    auth: "optional",
    query: PageQuery,
    response: page(Thread),
  }),
  create: endpoint({
    method: "POST",
    path: "/v1/threads",
    summary: "Нова гілка",
    tag: "community",
    auth: "user",
    body: z.object({ title: z.string().trim().min(3).max(200), body: z.string().trim().min(1).max(10_000) }),
    response: Thread,
    status: 201,
  }),
  get: endpoint({
    method: "GET",
    path: "/v1/threads/:id",
    summary: "Гілка з дописами",
    tag: "community",
    auth: "optional",
    params: IdParam,
    response: ThreadDetail,
  }),
  reply: endpoint({
    method: "POST",
    path: "/v1/threads/:id/posts",
    summary: "Відповісти в гілці",
    tag: "community",
    auth: "user",
    params: IdParam,
    body: z.object({ body: z.string().trim().min(1).max(10_000), replyToId: Id.optional() }),
    response: Post,
    status: 201,
  }),
  subscribe: endpoint({
    method: "PUT",
    path: "/v1/threads/:id/subscription",
    summary: "Стежити за гілкою",
    tag: "community",
    auth: "user",
    params: IdParam,
  }),
  unsubscribe: endpoint({
    method: "DELETE",
    path: "/v1/threads/:id/subscription",
    summary: "Не стежити за гілкою",
    tag: "community",
    auth: "user",
    params: IdParam,
  }),
  delete: endpoint({
    method: "DELETE",
    path: "/v1/threads/:id",
    summary: "Видалити гілку",
    tag: "community",
    auth: "user",
    params: IdParam,
  }),
  deletePost: endpoint({
    method: "DELETE",
    path: "/v1/posts/:id",
    summary: "Видалити допис",
    tag: "community",
    auth: "user",
    params: IdParam,
  }),
};

const notifications = {
  list: endpoint({
    method: "GET",
    path: "/v1/notifications",
    summary: "Сповіщення",
    tag: "notifications",
    auth: "user",
    query: PageQuery,
    response: page(Notification),
  }),
  markRead: endpoint({
    method: "POST",
    path: "/v1/notifications/read",
    summary: "Позначити прочитаними (усі, якщо ids не вказано)",
    tag: "notifications",
    auth: "user",
    body: z.object({ ids: z.array(z.number().int()).max(500).optional() }),
  }),
};

// ─── Файли, заявки, скарги ────────────────────────────────────────────────

const uploads = {
  create: endpoint({
    method: "POST",
    path: "/v1/uploads",
    summary: "Почати завантаження файлу",
    tag: "uploads",
    auth: "user",
    body: CreateUploadBody,
    response: UploadTicket,
    status: 201,
  }),
  complete: endpoint({
    method: "POST",
    path: "/v1/uploads/:id/complete",
    summary: "Файл завантажено — почати обробку",
    tag: "uploads",
    auth: "user",
    params: IdParam,
    response: UploadStatus,
  }),
  status: endpoint({
    method: "GET",
    path: "/v1/uploads/:id",
    summary: "Стан обробки файлу",
    tag: "uploads",
    auth: "user",
    params: IdParam,
    response: UploadStatus,
  }),
};

const submissions = {
  create: endpoint({
    method: "POST",
    path: "/v1/submissions",
    summary: "Заявка: нова пісня або правка",
    tag: "submissions",
    auth: "user",
    body: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("catalog_track"), track: TrackDraft }),
      z.object({ kind: z.literal("community_track"), track: TrackDraft }),
      z.object({ kind: z.literal("correction"), correction: CorrectionDraft }),
    ]),
    response: Submission,
    status: 201,
  }),
  mine: endpoint({
    method: "GET",
    path: "/v1/me/submissions",
    summary: "Мої заявки",
    tag: "submissions",
    auth: "user",
    query: PageQuery,
    response: page(Submission),
  }),
  withdraw: endpoint({
    method: "DELETE",
    path: "/v1/submissions/:id",
    summary: "Відкликати заявку",
    tag: "submissions",
    auth: "user",
    params: IdParam,
  }),
};

const reports = {
  create: endpoint({
    method: "POST",
    path: "/v1/reports",
    summary: "Поскаржитися",
    tag: "safety",
    auth: "user",
    body: ReportDraft,
    response: Ok,
    status: 201,
  }),
  bug: endpoint({
    method: "POST",
    path: "/v1/bug-reports",
    summary: "Повідомити про помилку",
    tag: "safety",
    auth: "optional",
    body: BugReportDraft,
    response: Ok,
    status: 201,
  }),
};

// ─── Адміністрування ──────────────────────────────────────────────────────

const AdminTrackBody = TrackDraft.extend({ source: TrackSource.default("catalog") });

/** Рядок адмінського списку пісень: усі поля, які редагуються, і ознаки якості даних. */
export const AdminTrackRow = z.object({
  id: Id,
  title: z.string(),
  artists: z.array(z.string()),
  releaseTitle: z.string().nullable(),
  releaseDate: IsoDate.nullable(),
  coverUrl: z.string().nullable(),
  durationMs: z.number().int(),
  genres: z.array(z.string()),
  explicit: z.boolean(),
  isrc: z.string().nullable(),
  youtubeVideoId: z.string().nullable(),
  hasAudio: z.boolean(),
  hasLyrics: z.boolean(),
  status: z.enum(["draft", "processing", "published", "hidden", "removed"]),
  source: TrackSource,
  playCount: z.number().int(),
  updatedAt: IsoDateTime,
});
export type AdminTrackRow = z.infer<typeof AdminTrackRow>;
/** Результат звірки з офіційними платформами (tools/catalog-verify). */
export const CatalogCheck = z.object({
  status: z.string(),
  checkedAt: IsoDateTime,
  /** id на платформах: deezer, musicbrainz, itunes. */
  ids: z.record(z.string(), z.string()),
  applied: z.record(
    z.string(),
    z.object({ from: z.unknown(), to: z.unknown(), sources: z.array(z.string()) }),
  ),
  conflicts: z.record(z.string(), z.record(z.string(), z.unknown())),
  /** Хто з адмінів позначив пісню перевіреною вручну (статус resolved). */
  resolvedBy: z.string().nullable(),
});
export type CatalogCheck = z.infer<typeof CatalogCheck>;
export const AdminTrackDetail = AdminTrackRow.extend({
  lyrics: z.string().nullable(),
  lyricsSynced: z.string().nullable(),
  check: CatalogCheck.nullable(),
});
export type AdminTrackDetail = z.infer<typeof AdminTrackDetail>;
/** Чого бракує пісні — фільтр для доведення каталогу до ладу. */
export const AdminTrackMissing = z.enum(["video", "genres", "duration", "lyrics", "release", "date"]);

const admin = {
  stats: endpoint({
    method: "GET",
    path: "/v1/admin/stats",
    summary: "Зведення",
    tag: "admin",
    auth: "moderator",
    response: z.object({
      users: z.number().int(),
      tracks: z.number().int(),
      communityTracks: z.number().int(),
      artists: z.number().int(),
      playsToday: z.number().int(),
      pendingSubmissions: z.number().int(),
      openReports: z.number().int(),
      openBugReports: z.number().int(),
    }),
  }),
  submissions: endpoint({
    method: "GET",
    path: "/v1/admin/submissions",
    summary: "Черга заявок",
    tag: "admin",
    auth: "moderator",
    query: PageQuery.extend({ status: SubmissionStatus.default("pending") }),
    response: page(Submission),
  }),
  review: endpoint({
    method: "POST",
    path: "/v1/admin/submissions/:id/review",
    summary: "Схвалити чи відхилити заявку",
    tag: "admin",
    auth: "moderator",
    params: IdParam,
    body: z.object({
      decision: z.enum(["approve", "reject"]),
      note: z.string().trim().max(2000).optional(),
      /** Адмін може виправити поля пісні перед схваленням. */
      track: TrackDraftPatch.optional(),
    }),
    response: Submission,
  }),
  reports: endpoint({
    method: "GET",
    path: "/v1/admin/reports",
    summary: "Скарги",
    tag: "admin",
    auth: "moderator",
    query: PageQuery.extend({ status: z.enum(["open", "actioned", "dismissed"]).default("open") }),
    response: page(Report),
  }),
  resolveReport: endpoint({
    method: "POST",
    path: "/v1/admin/reports/:id/resolve",
    summary: "Розглянути скаргу",
    tag: "admin",
    auth: "moderator",
    params: IdParam,
    body: z.object({
      action: z.enum(["dismiss", "remove_content", "ban_user"]),
      note: z.string().trim().max(2000).optional(),
    }),
    response: Report,
  }),
  bugReports: endpoint({
    method: "GET",
    path: "/v1/admin/bug-reports",
    summary: "Баг-репорти",
    tag: "admin",
    auth: "moderator",
    query: PageQuery.extend({ status: z.enum(["open", "resolved"]).default("open") }),
    response: page(BugReport),
  }),
  setBugReportStatus: endpoint({
    method: "PATCH",
    path: "/v1/admin/bug-reports/:id",
    summary: "Статус баг-репорту",
    tag: "admin",
    auth: "moderator",
    params: IdParam,
    body: z.object({ status: z.enum(["open", "resolved"]) }),
  }),
  tracks: endpoint({
    method: "GET",
    path: "/v1/admin/tracks",
    summary: "Пісні для редагування",
    tag: "admin",
    auth: "admin",
    query: PageQuery.extend({
      q: z.string().trim().max(200).optional(),
      status: z.enum(["all", "published", "hidden"]).default("all"),
      source: z.enum(["all", "catalog", "community"]).default("all"),
      missing: AdminTrackMissing.optional(),
      /** Стан звірки з платформами. */
      check: z.enum(["conflict", "unchecked", "unmatched", "resolved"]).optional(),
      sort: z.enum(["recent", "popular", "title"]).default("recent"),
    }),
    response: page(AdminTrackRow).extend({ total: z.number().int() }),
  }),
  track: endpoint({
    method: "GET",
    path: "/v1/admin/tracks/:id",
    summary: "Пісня з усіма полями для редагування",
    tag: "admin",
    auth: "admin",
    params: IdParam,
    response: AdminTrackDetail,
  }),
  createTrack: endpoint({
    method: "POST",
    path: "/v1/admin/tracks",
    summary: "Додати трек",
    tag: "admin",
    auth: "admin",
    body: AdminTrackBody,
    response: TrackDetail,
    status: 201,
  }),
  updateTrack: endpoint({
    method: "PATCH",
    path: "/v1/admin/tracks/:id",
    summary: "Змінити трек",
    tag: "admin",
    auth: "admin",
    params: IdParam,
    body: TrackDraftPatch.extend({
      source: TrackSource.optional(),
      status: z.enum(["published", "hidden"]).optional(),
      lyricsSynced: z.string().max(40_000).nullable().optional(),
    }),
    response: AdminTrackDetail,
  }),
  resolveTrackCheck: endpoint({
    method: "POST",
    path: "/v1/admin/tracks/:id/check",
    summary: "Позначити звірку перевіреною вручну (або повернути попередній стан)",
    tag: "admin",
    auth: "admin",
    params: IdParam,
    body: z.object({ resolved: z.boolean() }),
    response: AdminTrackDetail,
  }),
  deleteTrack: endpoint({
    method: "DELETE",
    path: "/v1/admin/tracks/:id",
    summary: "Видалити трек",
    tag: "admin",
    auth: "admin",
    params: IdParam,
  }),
  updateArtist: endpoint({
    method: "PATCH",
    path: "/v1/admin/artists/:id",
    summary: "Змінити виконавця",
    tag: "admin",
    auth: "admin",
    params: IdParam,
    body: z.object({
      name: z.string().trim().min(1).max(200).optional(),
      bio: z
        .object({ uk: z.string().max(10_000).optional(), en: z.string().max(10_000).optional() })
        .optional(),
      imageUploadId: Id.nullable().optional(),
      verified: z.boolean().optional(),
    }),
    response: Artist,
  }),
  users: endpoint({
    method: "GET",
    path: "/v1/admin/users",
    summary: "Користувачі",
    tag: "admin",
    auth: "admin",
    query: PageQuery.extend({ q: z.string().trim().max(100).optional() }),
    response: page(
      UserRef.extend({ email: z.string(), role: Role, banned: z.boolean(), createdAt: IsoDateTime }),
    ),
  }),
  setUser: endpoint({
    method: "PATCH",
    path: "/v1/admin/users/:id",
    summary: "Роль, блокування, преміум вручну",
    tag: "admin",
    auth: "admin",
    params: IdParam,
    body: z.object({
      role: Role.optional(),
      banned: z.boolean().optional(),
      banReason: z.string().max(500).optional(),
      /** Видати преміум на N днів вручну; 0 — зняти. */
      premiumDays: z.number().int().min(0).max(3660).optional(),
    }),
  }),
  audit: endpoint({
    method: "GET",
    path: "/v1/admin/audit",
    summary: "Журнал дій",
    tag: "admin",
    auth: "moderator",
    query: PageQuery,
    response: page(AuditEntry),
  }),
};

const SubscriptionInfo = z
  .object({
    active: z.boolean(),
    plan: z.string().nullable(),
    provider: z.string().nullable(),
    until: IsoDateTime.nullable(),
    cancelAtPeriodEnd: z.boolean(),
  })
  .meta({ id: "SubscriptionInfo" });

const premium = {
  plans: endpoint({
    method: "GET",
    path: "/v1/premium/plans",
    summary: "Тарифи преміуму",
    tag: "premium",
    auth: "public",
    response: z.object({
      paymentsEnabled: z.boolean(),
      /** Як оплачується: telegram — Telegram Stars у боті (currency XTR), stub — тестова оплата. */
      provider: z.enum(["stub", "telegram"]).nullable(),
      plans: z.array(
        z.object({
          id: z.string(),
          amount: z.number(),
          currency: z.string(),
          periodDays: z.number().int(),
          test: z.boolean(),
        }),
      ),
    }),
  }),
  subscription: endpoint({
    method: "GET",
    path: "/v1/me/subscription",
    summary: "Моя підписка",
    tag: "premium",
    auth: "user",
    response: SubscriptionInfo,
  }),
  checkout: endpoint({
    method: "POST",
    path: "/v1/premium/checkout",
    summary: "Оформити преміум: посилання на Telegram-бота (Stars) або тестова оплата без списання",
    tag: "premium",
    auth: "user",
    body: z.object({ planId: z.string().max(40) }),
    response: z.discriminatedUnion("type", [
      z.object({ type: z.literal("activated"), subscription: SubscriptionInfo }),
      z.object({ type: z.literal("redirect"), url: z.string() }),
    ]),
  }),
  cancel: endpoint({
    method: "POST",
    path: "/v1/premium/cancel",
    summary: "Не продовжувати після поточного періоду",
    tag: "premium",
    auth: "user",
    response: SubscriptionInfo,
  }),
  resume: endpoint({
    method: "POST",
    path: "/v1/premium/resume",
    summary: "Знову продовжувати підписку (після скасування, до кінця періоду)",
    tag: "premium",
    auth: "user",
    response: SubscriptionInfo,
  }),
};

const legacy = {
  resolve: endpoint({
    method: "GET",
    path: "/v1/legacy/:kind/:id",
    summary: "Новий id за числовим id з v1 (редиректи старих посилань)",
    tag: "legacy",
    auth: "public",
    params: z.object({
      kind: z.enum(["track", "artist", "release", "playlist", "user", "thread"]),
      id: z.coerce.number().int().positive(),
    }),
    response: z.object({ id: Id, slug: z.string().nullable() }),
    cacheSeconds: 86400,
  }),
};

// ─── Батл рояль ───────────────────────────────────────────────────────────

/** Скільки разів пісня ставала чемпіоном батл роялю: усього на N'Owl і в цього користувача. */
const BattleWinStats = z.object({
  trackId: Id,
  wins: z.number().int(),
  mine: z.number().int(),
});

const battle = {
  recordWin: endpoint({
    method: "POST",
    path: "/v1/battle/wins",
    summary: "Зарахувати перемогу пісні в батлі",
    tag: "battle",
    auth: "user",
    body: z.object({
      trackId: Id,
      /** Ключ турніру (хеш порядку й виборів) — один запис на турнір. */
      battleKey: z
        .string()
        .trim()
        .regex(/^[a-z0-9-]{8,64}$/i),
      poolSize: z.number().int().min(4).max(1024),
      poolTitle: z.string().trim().max(200).optional(),
    }),
    response: BattleWinStats,
  }),
  wins: endpoint({
    method: "GET",
    path: "/v1/tracks/:id/battle-wins",
    summary: "Перемоги пісні в батлах",
    tag: "battle",
    auth: "optional",
    params: IdParam,
    response: BattleWinStats,
  }),
};

export const endpoints = {
  me,
  tracks,
  artists,
  releases,
  genres,
  discover,
  library,
  playlists,
  ratings,
  users,
  conversations,
  threads,
  notifications,
  uploads,
  submissions,
  reports,
  admin,
  premium,
  legacy,
  battle,
} as const;

export type Endpoints = typeof endpoints;
