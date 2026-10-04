import { useMemo } from 'react';
import { useApiBridge } from './ApiBridge';
import { useSettings } from '@/state/SettingsContext';
import type {
  AdminNotificationsSummary,
  NotificationsSummary,
  ThreadNotificationsSummary,
  HistoryItem,
  ArtistDetail,
  ArtistSort,
  ArtistSummary,
  BugReport,
  Correction,
  CorrectionStatus,
  CorrectionTarget,
  BugStatus,
  FriendRequest,
  PublicPlaylist,
  PublicProfile,
  PublicUser,
  CommunitySongInput,
  PickedAudio,
  Conversation,
  DmRequest,
  DirectMessage,
  DmThread,
  DmUnread,
  BadgeCounts,
  SongRatings,
  SongSource,
  ThreadDetail,
  ThreadPost,
  ThreadSummary,
  UserSearchResult,
  AppConfig,
  CreateRequestInput,
  CreateSongInput,
  ExternalSongResult,
  Genre,
  NormalizeGenresResult,
  Playlist,
  PlaylistDetail,
  Profile,
  Recommendation,
  Song,
  SongRequest,
  Stats,
  UpdateRequestInput,
  UpdateSongInput,
  SimilarArtist,
  TasteGraph,
} from './types';

// Каталог «стовпчиками» (GET /api/songs?format=cols, див. Models/CatalogColumns.cs на сервері): по масиву на
// поле, виконавці/альбоми/жанри — словниками, рідкісні поля — «індекс → значення». Утричі менший JSON і
// швидший розбір на телефоні, ніж 18 000 об'єктів.
interface CatalogColumns {
  id: number[];
  title: string[];
  artistDict: string[];
  artist: number[];
  artistIds: (number[] | null)[];
  albumDict: string[];
  album: number[];
  genreDict: string[];
  genres: number[][];
  release: string[];
  dur: number[];
  track: number[];
  yt: (string | null)[];
  plays: number[];
  artists?: Record<string, { id: number; name: string }[]>;
  source?: Record<string, SongSource>;
  audio?: Record<string, string>;
  rating?: Record<string, number>;
  ratingCount?: Record<string, number>;
  submittedBy?: Record<string, Song['submittedBy']>;
}
const pad2 = (n: number) => String(n).padStart(2, '0');
function decodeCatalog(c: CatalogColumns): Song[] {
  const out: Song[] = new Array(c.id.length);
  for (let i = 0; i < c.id.length; i++) {
    const artist = c.artistDict[c.artist[i]];
    let refs = c.artists?.[i];
    const ids = c.artistIds[i];
    if (!refs && ids) {
      const names = artist.split(',').map((n) => n.trim()).filter(Boolean);
      refs = ids.map((id, k) => ({ id, name: names[k] ?? '' }));
    }
    const sec = c.dur[i];
    out[i] = {
      id: c.id[i],
      artist,
      title: c.title[i],
      release: c.release[i],
      duration: `${pad2(Math.floor(sec / 3600))}:${pad2(Math.floor((sec % 3600) / 60))}:${pad2(sec % 60)}`,
      genres: c.genres[i].map((g) => c.genreDict[g]),
      album: c.album[i] >= 0 ? c.albumDict[c.album[i]] : null,
      trackNumber: c.track[i] || null,
      youtubeVideoId: c.yt[i] || null,
      playCount: c.plays[i] || 0,
      artists: refs ?? [],
      source: c.source?.[i] ?? 'catalog',
      audioUrl: c.audio?.[i] ?? null,
      avgRating: c.rating?.[i] ?? null,
      ratingCount: c.ratingCount?.[i] ?? 0,
      submittedBy: c.submittedBy?.[i] ?? null,
    } as Song;
  }
  return out;
}

// Один каталог на весь застосунок: головна, батл, колесо, черга й пошук раніше тягнули кожен свою
// копію (мегабайти кожна). Головна завжди бере свіже (сервер відповідає 304, якщо нічого не змінилось),
// решта — те, що вже завантажено.
const songsCache = new Map<'catalog' | 'community', Promise<Song[]>>();
// Лічильники бейджів: дзвіночок у шапці й вкладка «Спілкування» просять їх одночасно — ділимо один запит,
// якщо виклики майже збіглися (пізніші — завжди свіжий запит).
let badgesInFlight: Promise<BadgeCounts> | null = null;
let badgesStartedAt = 0;

// Тонкі типізовані обгортки над ApiBridge.request(), що дзеркалять
// ендпоінти MusicDB.Api.Controllers.* один в один.
// multipart/form-data для ком'юніті-пісні (файл до 25 МБ). Іде нативним
// fetch, а не через WebView-бридж: протягувати мегабайти base64 крізь
// injectJavaScript ненадійно. Кука сесії живе у WebView і в нативний fetch
// потрапляє не завжди (iOS — ніколи), тож авторизація — токеном завантаження:
// беремо його через WebView-бридж і передаємо заголовком X-Upload-Token.
const EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/aac': '.aac',
  'audio/ogg': '.ogg', 'audio/opus': '.opus', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/flac': '.flac',
  'audio/x-flac': '.flac', 'audio/webm': '.webm', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
  'image/gif': '.gif',
};

// Файл для FormData з ASCII-іменем. На Android нативний fetch (OkHttp) не пропускає
// не-ASCII символи в заголовку частини multipart — ім'я на кшталт «Пісня — демо.mp3»
// валить запит з «Network request failed». Сервер з імені бере лише розширення.
function filePart(file: { uri: string; name: string; mimeType: string }): Blob {
  const dot = file.name.lastIndexOf('.');
  let ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!/^\.[a-z0-9]{2,5}$/.test(ext)) ext = EXT_BY_MIME[file.mimeType?.toLowerCase()] ?? '';
  const base = (dot >= 0 ? file.name.slice(0, dot) : file.name)
    .normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'file';
  return { uri: file.uri, name: base + ext, type: file.mimeType } as unknown as Blob;
}

function toCommunityFormData(input: CommunitySongInput): FormData {
  const fd = new FormData();
  fd.append('artist', input.artist);
  fd.append('title', input.title);
  fd.append('release', input.release);
  fd.append('duration', input.duration);
  fd.append('genres', input.genres);
  if (input.album) fd.append('album', input.album);
  if (input.youtubeVideo) fd.append('youtubeVideo', input.youtubeVideo);
  if (input.audio) {
    fd.append('audio', filePart(input.audio));
  }
  return fd;
}

export function useMusicApi() {
  const { request } = useApiBridge();
  const { apiBase } = useSettings();

  return useMemo(
    () => {
      const upload = async <T,>(path: string, body: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<T> => {
        const { token } = await request<{ token: string }>('/api/upload-token', { method: 'POST' });
        const res = await fetch(`${apiBase}${path}`, { method, body, credentials: 'include', headers: { 'X-Upload-Token': token } });
        const text = await res.text();
        if (!res.ok) {
          const err = new Error(`HTTP ${res.status} for ${path}`) as Error & { status?: number; body?: string };
          err.status = res.status;
          err.body = text;
          throw err;
        }
        return (text ? JSON.parse(text) : undefined) as T;
      };

      return {
      // Songs — source: "catalog" (таблиця_1, за замовчуванням) | "community" (таблиця_2)
      // 'background' — вкладка "У фоні": пісні з файлом з обох таблиць.
      // fresh — перезавантажити (головна, pull-to-refresh, songsChanged); інакше — спільний кеш.
      getSongs: (source: SongSource | 'all' | 'background' = 'catalog', fresh = false): Promise<Song[]> => {
        const load = (src: 'catalog' | 'community') => {
          let p = fresh ? undefined : songsCache.get(src);
          if (!p) {
            p = request<CatalogColumns>('/api/songs', { query: { source: src, format: 'cols' } }).then(decodeCatalog);
            p.catch(() => songsCache.delete(src));
            songsCache.set(src, p);
          }
          return p;
        };
        if (source === 'catalog' || source === 'community') return load(source);
        return Promise.all([load('catalog'), load('community')]).then(([a, b]) => {
          const all = [...a, ...b];
          if (source === 'all') return all;
          return all
            .filter((s) => s.audioUrl)
            .sort((x, y) => x.artist.localeCompare(y.artist, undefined, { sensitivity: 'base' }) || x.title.localeCompare(y.title, undefined, { sensitivity: 'base' }));
        });
      },
      getSong: (id: number) => request<Song>(`/api/songs/${id}`),
      createSong: (dto: CreateSongInput) => request<Song>('/api/songs', { method: 'POST', body: dto }),
      updateSong: (id: number, dto: UpdateSongInput) =>
        request<Song>(`/api/songs/${id}`, { method: 'PUT', body: dto }),
      // Кешує знайдений і підтверджений YouTube videoId — наступного разу цю
      // пісню можна програти без нового пошуку через YouTube Search API.
      setYoutubeVideo: (id: number, videoId: string) =>
        request<void>(`/api/songs/${id}/youtube-video`, { method: 'PUT', body: { videoId } }),
      deleteSong: (id: number) => request<void>(`/api/songs/${id}`, { method: 'DELETE' }),
      deleteSongAudio: (id: number) => request<void>(`/api/songs/${id}/audio`, { method: 'DELETE' }),
      // Додати/замінити файл будь-якої пісні (адмін) — multipart нативним fetch.
      replaceSongAudio: (id: number, audio: PickedAudio) => {
        const fd = new FormData();
        fd.append('audio', filePart(audio));
        return upload<void>(`/api/songs/${id}/audio`, fd, 'PUT');
      },

      // Текст пісні (окремо від списку, щоб не роздувати його); змінює лише адмін.
      getLyrics: (id: number) => request<{ lyrics: string | null }>(`/api/songs/${id}/lyrics`),
      setLyrics: (id: number, lyrics: string) =>
        request<{ lyrics: string | null }>(`/api/songs/${id}/lyrics`, { method: 'PUT', body: { lyrics } }),
      getRequestLyrics: (id: number) => request<{ lyrics: string | null }>(`/api/requests/${id}/lyrics`),
      setRequestLyrics: (id: number, lyrics: string) =>
        request<{ lyrics: string | null }>(`/api/requests/${id}/lyrics`, { method: 'PUT', body: { lyrics } }),

      createCommunitySong: (input: CommunitySongInput) => upload<Song>('/api/songs/community', toCommunityFormData(input)),

      // Stats / Genres
      getStats: (source: SongSource | 'background' = 'catalog') => request<Stats>('/api/stats', { query: { source } }),
      getTopSongs: (limit = 100) => request<Song[]>('/api/stats/top-songs', { query: { limit } }),
      getGenres: () => request<Genre[]>('/api/genres'),
      normalizeGenres: () => request<NormalizeGenresResult>('/api/genres/normalize', { method: 'POST' }),

      // Requests (заявки на додавання)
      getRequests: () => request<SongRequest[]>('/api/requests'),
      // Пряме посилання на файл заявки — для нативного міні-плеєра (без куки сесії).
      // download — посилання "зберегти як" ("Виконавець - Назва.mp3"), відкривається в браузері телефону.
      getRequestAudioLink: async (id: number, download = false) => {
        const { url } = await request<{ url: string }>(`/api/requests/${id}/audio/link`, { query: download ? { download: 'true' } : undefined });
        return url.startsWith('/') ? `${apiBase}${url}` : url;
      },
      getSongAudioLink: async (id: number, download = false) => {
        const { url } = await request<{ url: string }>(`/api/songs/${id}/audio/link`, { query: download ? { download: 'true' } : undefined });
        return url.startsWith('/') ? `${apiBase}${url}` : url;
      },
      createRequest: (dto: CreateRequestInput) => request<SongRequest>('/api/requests', { method: 'POST', body: dto }),
      createCommunityRequest: (input: CommunitySongInput) =>
        upload<SongRequest>('/api/requests/community', toCommunityFormData(input)),
      updateRequest: (id: number, dto: UpdateRequestInput) =>
        request<SongRequest>(`/api/requests/${id}`, { method: 'PUT', body: dto }),
      approveRequest: (id: number) =>
        request<{ message: string; songId: number; merged: boolean }>(`/api/requests/${id}/approve`, {
          method: 'POST',
        }),
      rejectRequest: (id: number) => request<void>(`/api/requests/${id}`, { method: 'DELETE' }),

      // Favorites
      getFavorites: () => request<Song[]>('/api/favorites'),
      addFavorite: (musicId: number) => request<void>(`/api/favorites/${musicId}`, { method: 'POST' }),
      removeFavorite: (musicId: number) => request<void>(`/api/favorites/${musicId}`, { method: 'DELETE' }),

      // Playlists
      getPlaylists: () => request<Playlist[]>('/api/playlists'),
      getPlaylist: (id: number) => request<PlaylistDetail>(`/api/playlists/${id}`),
      createPlaylist: (name: string, isPublic = false) =>
        request<Playlist>('/api/playlists', { method: 'POST', body: { name, isPublic } }),
      setPlaylistPublic: (id: number, isPublic: boolean) =>
        request<Playlist>(`/api/playlists/${id}`, { method: 'PATCH', body: { isPublic } }),
      // Публічні плейлисти всіх — для "Батл рояль".
      getPublicPlaylists: () => request<PublicPlaylist[]>('/api/playlists/public'),
      deletePlaylist: (id: number) => request<void>(`/api/playlists/${id}`, { method: 'DELETE' }),
      addSongToPlaylist: (playlistId: number, musicId: number) =>
        request<void>(`/api/playlists/${playlistId}/songs/${musicId}`, { method: 'POST' }),
      removeSongFromPlaylist: (playlistId: number, musicId: number) =>
        request<void>(`/api/playlists/${playlistId}/songs/${musicId}`, { method: 'DELETE' }),

      // Profile
      getProfile: () => request<Profile>('/api/profile'),
      updateProfile: (dto: { displayName: string | null; avatarUrl: string | null }) =>
        request<Profile>('/api/profile', { method: 'PUT', body: dto }),

      // History
      logListen: (musicId: number) => request<void>('/api/history', { method: 'POST', body: { musicId } }),
      getHistory: (limit = 30, offset = 0) => request<HistoryItem[]>('/api/history', { query: { limit, offset: offset || undefined } }),

      // Recommendations
      getRecommendations: (lang: string) => request<Recommendation[]>('/api/recommendations', { query: { lang } }),

      // External search (iTunes autofill). artist/title/album передаються окремо, щоб
      // бекенд звужував пошук до конкретного поля (artistTerm/songTerm/albumTerm) —
      // інакше пошук лише за виконавцем підхоплює й чужі пісні з тим самим заголовком.
      externalSearch: (params: { artist?: string; title?: string; album?: string }) =>
        request<ExternalSongResult[]>('/api/external-search', { query: params }),
      suggestGenres: (artist: string, title: string, hint?: string) =>
        request<string>('/api/external-search/genres', { query: { artist, title, hint } }),

      // Config
      getConfig: () => request<AppConfig>('/config'),

      // Оцінки 0–100 і рецензії
      getRatings: (musicId: number) => request<SongRatings>(`/api/songs/${musicId}/ratings`),
      saveRating: (musicId: number, score: number, review: string | null) =>
        request<SongRatings>(`/api/songs/${musicId}/ratings`, { method: 'PUT', body: { score, review } }),
      deleteRating: (musicId: number, userId?: number) =>
        request<void>(`/api/songs/${musicId}/ratings`, { method: 'DELETE', query: { userId } }),

      // Особисті повідомлення (друзям — вільно, іншим — через запит)
      getConversations: () => request<Conversation[]>('/api/messages/conversations'),
      getDmUnread: () => request<DmUnread>('/api/messages/unread-count'),
      // Усі лічильники бейджів одним запитом. Старий сервер такого маршруту не має (віддавав головну сторінку
      // замість JSON) — тоді, як і раніше, окремими запитами.
      getBadges: (isAdmin: boolean): Promise<BadgeCounts> => {
        const now = Date.now();
        if (badgesInFlight && now - badgesStartedAt < 150) return badgesInFlight;
        badgesStartedAt = now;
        badgesInFlight = request<BadgeCounts | string>('/api/notifications/badge')
          .then((b) => (b && typeof b === 'object' && typeof b.dm === 'number' ? b : Promise.reject(new Error('no badge route'))))
          .catch(async () => {
            const [n, fr, th, adm, dm] = await Promise.all([
              request<{ unreadCount: number }>('/api/notifications', { query: { limit: 1 } }).then((d) => d.unreadCount).catch(() => 0),
              request<unknown[]>('/api/friends/requests/incoming').then((r) => r.length).catch(() => 0),
              request<{ unreadCount: number }>('/api/notifications/threads', { query: { limit: 1 } }).then((d) => d.unreadCount).catch(() => 0),
              isAdmin
                ? request<{ unreadCount: number }>('/api/admin-notifications', { query: { limit: 1 } }).then((d) => d.unreadCount).catch(() => 0)
                : Promise.resolve(0),
              request<DmUnread>('/api/messages/unread-count').catch(() => ({ unread: 0, requests: 0 })),
            ]);
            return { artist: n, friendRequests: fr, threads: th, admin: adm, dm: dm.unread, dmRequests: dm.requests };
          });
        return badgesInFlight;
      },
      getDmRequests: () => request<DmRequest[]>('/api/messages/requests'),
      respondDmRequest: (userId: number, accept: boolean) =>
        request<void>(`/api/messages/requests/${userId}/${accept ? 'accept' : 'decline'}`, { method: 'POST' }),
      getDmThread: (userId: number) => request<DmThread>(`/api/messages/${userId}`),
      // "Видалити чат у себе": переписка зникає лише для мене.
      clearChatForMe: (userId: number) => request<void>(`/api/messages/${userId}`, { method: 'DELETE' }),
      sendMessage: (userId: number, body: string) =>
        request<unknown>(`/api/messages/${userId}`, { method: 'POST', body: { body } }),
      // Повідомлення з файлом (до 20 МБ) і/або піснею — multipart на /rich.
      sendRichMessage: (userId: number, body: string, musicId: number | null, file: PickedAudio | null) => {
        const fd = new FormData();
        if (body) fd.append('body', body);
        if (musicId != null) fd.append('musicId', String(musicId));
        if (file) fd.append('file', filePart(file));
        return upload<DirectMessage>(`/api/messages/${userId}/rich`, fd);
      },
      // Пряме посилання на файл із повідомлення (картинка й плеєр не несуть куку сесії).
      // download — на збереження (під назвою від відправника); inline — PDF і текст для перегляду, а не завантаження.
      getAttachmentLink: (messageId: number, opts?: { download?: boolean; inline?: boolean }) =>
        request<{ url: string }>(`/api/messages/attachment/${messageId}/link`, {
          query: { download: opts?.download ? 'true' : undefined, inline: opts?.inline ? 'true' : undefined },
        }).then((r) => r.url),

      // Гілки обговорень
      getThreads: (q?: string) => request<ThreadSummary[]>('/api/threads', { query: { q: q || undefined } }),
      getThread: (id: number) => request<ThreadDetail>(`/api/threads/${id}`),
      createThread: (title: string, body: string) =>
        request<ThreadSummary>('/api/threads', { method: 'POST', body: { title, body } }),
      replyToThread: (id: number, body: string, replyToPostId?: number | null) =>
        request<ThreadPost>(`/api/threads/${id}/posts`, { method: 'POST', body: { body, replyToPostId: replyToPostId ?? null } }),
      followThread: (id: number) => request<void>(`/api/threads/${id}/follow`, { method: 'POST' }),
      unfollowThread: (id: number) => request<void>(`/api/threads/${id}/follow`, { method: 'DELETE' }),
      getThreadNotifications: (limit = 30) => request<ThreadNotificationsSummary>('/api/notifications/threads', { query: { limit } }),
      markThreadNotificationsRead: () => request<void>('/api/notifications/threads/mark-read', { method: 'POST' }),
      deleteThread: (id: number) => request<void>(`/api/threads/${id}`, { method: 'DELETE' }),
      deleteThreadPost: (postId: number) => request<void>(`/api/threads/posts/${postId}`, { method: 'DELETE' }),

      // Сповіщення про виконавців (підписки) — дзвіночок у шапці
      getNotifications: (limit = 30) => request<NotificationsSummary>('/api/notifications', { query: { limit } }),
      markNotificationsRead: () => request<void>('/api/notifications/mark-read', { method: 'POST' }),
      markNotificationRead: (eventId: number) => request<void>(`/api/notifications/${eventId}/mark-read`, { method: 'POST' }),

      // Сповіщення адмінів ("hito схвалює запит …")
      getAdminNotifications: (limit = 30) =>
        request<AdminNotificationsSummary>('/api/admin-notifications', { query: { limit } }),
      markAdminNotificationsRead: () => request<void>('/api/admin-notifications/mark-read', { method: 'POST' }),

      // Глобальний пошук
      searchArtists: (q: string) => request<ArtistSummary[]>('/api/artists', { query: { q } }),
      getArtistSongs: (id: number) => request<Song[]>(`/api/artists/${id}/songs`),
      searchUsers: (q: string, limit = 8) => request<UserSearchResult[]>('/api/users/search', { query: { q, limit } }),

      // Виконавці: каталог, сторінка, підписка
      getArtists: (q?: string, sort: ArtistSort = 'songs') =>
        request<ArtistSummary[]>('/api/artists', { query: { q: q || undefined, sort } }),
      getArtist: (id: number) => request<ArtistDetail>(`/api/artists/${id}`),
      getSimilarArtists: (id: number) => request<SimilarArtist[]>(`/api/artists/${id}/similar`),
      // Адмін: опис і фото виконавця (фото — multipart нативним fetch, як файли пісень).
      updateArtistBio: (id: number, bio: string, bioEn: string) =>
        request<ArtistDetail>(`/api/artists/${id}`, { method: 'PUT', body: { bio, bioEn } }),
      setArtistImage: (id: number, image: PickedAudio) => {
        const fd = new FormData();
        fd.append('image', filePart(image));
        return upload<ArtistDetail>(`/api/artists/${id}/image`, fd, 'PUT');
      },
      deleteArtistImage: (id: number) => request<ArtistDetail>(`/api/artists/${id}/image`, { method: 'DELETE' }),
      // Схожий смак: люди, ребра схожості й список найближчих до мене.
      getTaste: () => request<TasteGraph>('/api/users/taste'),
      followArtist: (id: number) => request<void>(`/api/artists/${id}/follow`, { method: 'POST' }),
      unfollowArtist: (id: number) => request<void>(`/api/artists/${id}/follow`, { method: 'DELETE' }),

      // Друзі й публічні профілі
      getUserProfile: (id: number) => request<PublicProfile>(`/api/users/${id}`),
      getFriends: () => request<PublicUser[]>('/api/friends'),
      getIncomingFriendRequests: () => request<FriendRequest[]>('/api/friends/requests/incoming'),
      getOutgoingFriendRequests: () => request<FriendRequest[]>('/api/friends/requests/outgoing'),
      sendFriendRequest: (targetUserId: number) =>
        request<FriendRequest>('/api/friends/requests', { method: 'POST', body: { targetUserId } }),
      acceptFriendRequest: (requestId: number) =>
        request<FriendRequest>(`/api/friends/requests/${requestId}/accept`, { method: 'POST' }),
      // Скасувати свій або відхилити вхідний — один і той самий DELETE.
      cancelOrRejectFriendRequest: (requestId: number) =>
        request<void>(`/api/friends/requests/${requestId}`, { method: 'DELETE' }),
      unfriend: (userId: number) => request<void>(`/api/friends/${userId}`, { method: 'DELETE' }),

      // Баг-репорти: надіслати може будь-хто залогінений, переглядає адмін
      sendBugReport: (description: string, context: string | null) =>
        request<{ id: number }>('/api/bug-reports', { method: 'POST', body: { description, context } }),
      // Зі скріншотами — multipart нативним fetch (картинки не женемо крізь WebView-бридж).
      sendBugReportWithScreenshots: (description: string, context: string | null, shots: PickedAudio[]) => {
        const fd = new FormData();
        fd.append('description', description);
        if (context) fd.append('context', context);
        for (const s of shots) fd.append('screenshots', filePart(s));
        return upload<{ id: number }>('/api/bug-reports/with-screenshots', fd);
      },
      // Пряме (підписане R2) посилання — нативний <Image> тягне його без куки сесії.
      getBugScreenshotLink: async (id: number, index: number) => {
        const { url } = await request<{ url: string }>(`/api/bug-reports/${id}/screenshots/${index}/link`);
        return url.startsWith('/') ? `${apiBase}${url}` : url;
      },
      getBugReports: (status: BugStatus | 'all' = 'open') => request<BugReport[]>('/api/bug-reports', { query: { status } }),
      getOpenBugCount: () => request<number>('/api/bug-reports/open-count'),
      deleteBugReport: (id: number) => request<void>(`/api/bug-reports/${id}`, { method: 'DELETE' }),
      setBugStatus: (id: number, status: BugStatus) =>
        request<void>(`/api/bug-reports/${id}`, { method: 'PATCH', body: { status } }),

      // Запити на правку: надіслати (multipart нативним fetch — може нести файл пісні), мої, адмінка
      sendCorrection: (target: CorrectionTarget, field: string, message: string, sourceUrl: string, audio: PickedAudio | null) => {
        const fd = new FormData();
        if ('musicId' in target) fd.append('musicId', String(target.musicId));
        else fd.append('artistId', String(target.artistId));
        fd.append('field', field);
        fd.append('message', message);
        if (sourceUrl) fd.append('sourceUrl', sourceUrl);
        if (audio) fd.append('audio', filePart(audio));
        return upload<{ id: number }>('/api/corrections', fd);
      },
      getMyCorrections: () => request<Correction[]>('/api/corrections/mine'),
      getCorrections: (status: CorrectionStatus | 'all' = 'open') => request<Correction[]>('/api/corrections', { query: { status } }),
      getOpenCorrectionsCount: () => request<number>('/api/corrections/open-count'),
      resolveCorrection: (id: number, status: CorrectionStatus, note: string | null) =>
        request<void>(`/api/corrections/${id}`, { method: 'PATCH', body: { status, note } }),
      applyCorrectionAudio: (id: number) => request<void>(`/api/corrections/${id}/apply-audio`, { method: 'POST' }),
      deleteCorrection: (id: number) => request<void>(`/api/corrections/${id}`, { method: 'DELETE' }),
      getCorrectionAudioLink: async (id: number) => {
        const { url } = await request<{ url: string }>(`/api/corrections/${id}/audio/link`);
        return url.startsWith('/') ? `${apiBase}${url}` : url;
      },
    };
    },
    [request, apiBase],
  );
}
