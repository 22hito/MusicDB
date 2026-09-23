import { useMemo } from 'react';
import { useApiBridge } from './ApiBridge';
import { useSettings } from '@/state/SettingsContext';
import type {
  AdminNotificationsSummary,
  ArtistSummary,
  CommunitySongInput,
  Conversation,
  DmRequest,
  DmThread,
  DmUnread,
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
} from './types';

// Тонкі типізовані обгортки над ApiBridge.request(), що дзеркалять
// ендпоінти MusicDB.Api.Controllers.* один в один.
// multipart/form-data для ком'юніті-пісні (файл до 25 МБ). Іде нативним
// fetch, а не через WebView-бридж: протягувати мегабайти base64 крізь
// injectJavaScript ненадійно. Сесійна кука спільна з WebView (Android —
// CookieManager, iOS — sharedCookiesEnabled → NSHTTPCookieStorage).
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
    // RN-формат файлу в FormData: { uri, name, type } замість Blob.
    fd.append('audio', { uri: input.audio.uri, name: input.audio.name, type: input.audio.mimeType } as unknown as Blob);
  }
  return fd;
}

export function useMusicApi() {
  const { request } = useApiBridge();
  const { apiBase } = useSettings();

  return useMemo(
    () => {
      const upload = async <T,>(path: string, body: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<T> => {
        const res = await fetch(`${apiBase}${path}`, { method, body, credentials: 'include' });
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
      getSongs: (source: SongSource | 'all' = 'catalog') => request<Song[]>('/api/songs', { query: { source } }),
      getSong: (id: number) => request<Song>(`/api/songs/${id}`),
      createSong: (dto: CreateSongInput) => request<Song>('/api/songs', { method: 'POST', body: dto }),
      updateSong: (id: number, dto: UpdateSongInput) =>
        request<Song>(`/api/songs/${id}`, { method: 'PUT', body: dto }),
      // Кешує знайдений і підтверджений YouTube videoId — наступного разу цю
      // пісню можна програти без нового пошуку через YouTube Search API.
      setYoutubeVideo: (id: number, videoId: string) =>
        request<void>(`/api/songs/${id}/youtube-video`, { method: 'PUT', body: { videoId } }),
      deleteSong: (id: number) => request<void>(`/api/songs/${id}`, { method: 'DELETE' }),

      createCommunitySong: (input: CommunitySongInput) => upload<Song>('/api/songs/community', toCommunityFormData(input)),

      // Stats / Genres
      getStats: (source: SongSource = 'catalog') => request<Stats>('/api/stats', { query: { source } }),
      getTopSongs: (limit = 100) => request<Song[]>('/api/stats/top-songs', { query: { limit } }),
      getGenres: () => request<Genre[]>('/api/genres'),
      normalizeGenres: () => request<NormalizeGenresResult>('/api/genres/normalize', { method: 'POST' }),

      // Requests (заявки на додавання)
      getRequests: () => request<SongRequest[]>('/api/requests'),
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
      createPlaylist: (name: string) => request<Playlist>('/api/playlists', { method: 'POST', body: { name } }),
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
      getDmRequests: () => request<DmRequest[]>('/api/messages/requests'),
      respondDmRequest: (userId: number, accept: boolean) =>
        request<void>(`/api/messages/requests/${userId}/${accept ? 'accept' : 'decline'}`, { method: 'POST' }),
      getDmThread: (userId: number) => request<DmThread>(`/api/messages/${userId}`),
      sendMessage: (userId: number, body: string) =>
        request<unknown>(`/api/messages/${userId}`, { method: 'POST', body: { body } }),

      // Гілки обговорень
      getThreads: (q?: string) => request<ThreadSummary[]>('/api/threads', { query: { q: q || undefined } }),
      getThread: (id: number) => request<ThreadDetail>(`/api/threads/${id}`),
      createThread: (title: string, body: string) =>
        request<ThreadSummary>('/api/threads', { method: 'POST', body: { title, body } }),
      replyToThread: (id: number, body: string) =>
        request<ThreadPost>(`/api/threads/${id}/posts`, { method: 'POST', body: { body } }),
      deleteThread: (id: number) => request<void>(`/api/threads/${id}`, { method: 'DELETE' }),
      deleteThreadPost: (postId: number) => request<void>(`/api/threads/posts/${postId}`, { method: 'DELETE' }),

      // Сповіщення адмінів ("hito схвалює запит …")
      getAdminNotifications: (limit = 30) =>
        request<AdminNotificationsSummary>('/api/admin-notifications', { query: { limit } }),
      markAdminNotificationsRead: () => request<void>('/api/admin-notifications/mark-read', { method: 'POST' }),

      // Глобальний пошук
      searchArtists: (q: string) => request<ArtistSummary[]>('/api/artists', { query: { q } }),
      getArtistSongs: (id: number) => request<Song[]>(`/api/artists/${id}/songs`),
      searchUsers: (q: string) => request<UserSearchResult[]>('/api/users/search', { query: { q, limit: 8 } }),
    };
    },
    [request, apiBase],
  );
}
