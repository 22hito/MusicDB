// Типи 1:1 з MusicDB.Api/Models/Dtos.cs

export interface Song {
  id: number;
  artist: string;
  title: string;
  release: string; // "yyyy-MM-dd"
  duration: string; // "HH:mm:ss"
  genres: string[];
  album: string | null;
  playCount: number; // унікальних слухачів, з listening_history
  youtubeVideoId: string | null; // закешований раніше знайдений і підтверджений відеоряд
}

export interface CreateSongInput {
  artist: string;
  title: string;
  release: string;
  duration: string;
  genres: string[];
  album: string | null;
}

export type UpdateSongInput = CreateSongInput;

export interface Genre {
  id: number;
  name: string;
}

export interface NormalizeGenresResult {
  mergedCount: number;
  mergedPairs: string[];
  error: string | null;
}

export interface SongRequest {
  id: number;
  artist: string;
  title: string;
  release: string;
  duration: string;
  genres: string[];
  genreNamesOriginal: string | null;
  albumTitle: string | null;
  createdAt: string;
}

export interface CreateRequestInput {
  artist: string;
  title: string;
  release: string;
  duration: string;
  genres: string[];
  albumTitle: string | null;
}

export type UpdateRequestInput = CreateRequestInput;

export interface Profile {
  email: string;
  name: string;
  displayName: string | null;
  picture: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  totalListened: number;
  favoritesCount: number;
  playlistsCount: number;
  topGenres: string[];
}

export interface Playlist {
  id: number;
  name: string;
  songCount: number;
  createdAt: string;
}

export interface PlaylistDetail {
  id: number;
  name: string;
  songs: Song[];
}

export interface Recommendation {
  song: Song;
  reason: string | null;
}

export interface AuthMe {
  authenticated: boolean;
  email?: string;
  name?: string;
  picture?: string | null;
  isAdmin?: boolean;
}

export interface CurrentUser extends AuthMe {
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface Stats {
  totalSongs: number;
  totalGenres: number;
  totalAlbums: number;
  singles: number;
}

export interface ExternalSongResult {
  artist: string;
  title: string;
  release: string | null;
  duration: string | null;
  album: string | null;
  genre: string | null;
}

export interface AppConfig {
  youtubeApiKeys: string[]; // по одному на GCP-проєкт — квота 10000/добу рахується на проєкт, не на ключ
}
