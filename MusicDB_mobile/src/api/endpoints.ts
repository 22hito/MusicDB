import { useMemo } from 'react';
import { useApiBridge } from './ApiBridge';
import type {
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
export function useMusicApi() {
  const { request } = useApiBridge();

  return useMemo(
    () => ({
      // Songs
      getSongs: () => request<Song[]>('/api/songs'),
      getSong: (id: number) => request<Song>(`/api/songs/${id}`),
      createSong: (dto: CreateSongInput) => request<Song>('/api/songs', { method: 'POST', body: dto }),
      updateSong: (id: number, dto: UpdateSongInput) =>
        request<Song>(`/api/songs/${id}`, { method: 'PUT', body: dto }),
      deleteSong: (id: number) => request<void>(`/api/songs/${id}`, { method: 'DELETE' }),

      // Stats / Genres
      getStats: () => request<Stats>('/api/stats'),
      getTopSongs: (limit = 10) => request<Song[]>('/api/stats/top-songs', { query: { limit } }),
      getGenres: () => request<Genre[]>('/api/genres'),
      normalizeGenres: () => request<NormalizeGenresResult>('/api/genres/normalize', { method: 'POST' }),

      // Requests (заявки на додавання)
      getRequests: () => request<SongRequest[]>('/api/requests'),
      createRequest: (dto: CreateRequestInput) => request<SongRequest>('/api/requests', { method: 'POST', body: dto }),
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
    }),
    [request],
  );
}
