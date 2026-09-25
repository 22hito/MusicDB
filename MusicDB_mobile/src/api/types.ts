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
  artists?: ArtistRef[] | null;
  source?: SongSource; // "catalog" — головна таблиця_1, "community" — таблиця_2
  submittedBy?: UserRef | null; // хто додав (лише ком'юніті-пісні)
  audioUrl?: string | null; // завантажений файл пісні — грає замість YouTube
  avgRating?: number | null; // середня оцінка 0–100
  ratingCount?: number;
}

export type SongSource = 'catalog' | 'community';

export interface UserRef {
  userId: number;
  displayName: string;
}

export interface ArtistRef {
  id: number;
  name: string;
}

export interface CreateSongInput {
  artist: string;
  title: string;
  release: string;
  duration: string;
  genres: string[];
  album: string | null;
}

// null — не чіпати вже закешоване відео (як і не надсилати поле взагалі);
// "" — явно скинути; непорожній рядок — новий ID або посилання (бекенд сам
// розбирає URL). Та сама семантика, що й на сайті/десктопі.
export interface UpdateSongInput extends CreateSongInput {
  youtubeVideoId?: string | null;
}

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
  youtubeVideoId: string | null;
  kind?: SongSource;
  requester?: UserRef | null;
  audioUrl?: string | null;
}

export interface CreateRequestInput {
  artist: string;
  title: string;
  release: string;
  duration: string;
  genres: string[];
  albumTitle: string | null;
}

// Та сама семантика null/""/значення, що й в UpdateSongInput.
export interface UpdateRequestInput extends CreateRequestInput {
  youtubeVideoId?: string | null;
}

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
  isPublic?: boolean; // публічний — видно іншим (профіль, "Батл рояль")
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
  userId?: number;
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

// ─── Ком'юніті: таблиця_2, оцінки, повідомлення, обговорення, сповіщення адмінів ───

// Файл, обраний через expo-document-picker, — у форматі, який RN кладе в FormData.
export interface PickedAudio {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface CommunitySongInput {
  artist: string;
  title: string;
  release: string;
  duration: string;
  genres: string; // через кому, як і на сайті
  album: string | null;
  youtubeVideo: string | null; // ID або посилання
  audio: PickedAudio | null;
}

export interface RatingEntry {
  user: UserRef;
  score: number;
  review: string | null;
  updatedAt: string;
}

export interface SongRatings {
  musicId: number;
  avgRating: number | null;
  ratingCount: number;
  mine: RatingEntry | null;
  reviews: RatingEntry[];
}

// "friends" | "accepted" | "pending_outgoing" | "pending_incoming" | "declined" | "declined_by_me" | "none"
export type DmState = string;

export interface Conversation {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastFromMe: boolean;
  lastAt: string;
  unreadCount: number;
  state: DmState;
}

export interface DirectMessage {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  createdAt: string;
  isMine: boolean;
}

export interface DmThread {
  state: DmState;
  canSend: boolean;
  messages: DirectMessage[];
}

export interface DmUnread {
  unread: number;
  requests: number;
}

export interface DmRequest {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  preview: string;
  messageCount: number;
  createdAt: string;
}

export interface ThreadSummary {
  id: number;
  title: string;
  author: UserRef | null;
  createdAt: string;
  lastPostAt: string;
  postCount: number;
}

export interface ThreadPost {
  id: number;
  author: UserRef | null;
  body: string;
  createdAt: string;
}

export interface ThreadDetail {
  id: number;
  title: string;
  body: string;
  author: UserRef | null;
  createdAt: string;
  posts: ThreadPost[];
}

export interface AdminNotification {
  id: number;
  actor: UserRef | null;
  eventType: 'request_submitted' | 'request_approved' | 'request_rejected' | 'song_added' | 'bug_reported';
  label: string;
  source: SongSource | 'bug';
  createdAt: string;
}

export interface AdminNotificationsSummary {
  unreadCount: number;
  recent: AdminNotification[];
}

export interface ArtistSummary {
  id: number;
  name: string;
  songCount: number;
  imageUrl?: string | null;
}

export interface SimilarArtist {
  id: number;
  name: string;
  imageUrl: string | null;
  songCount: number;
  score: number; // 0..100 — збіг жанрів
}

export interface UserSearchResult {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  relationshipStatus: string;
}

// ─── Друзі, публічні профілі, виконавці, баг-репорти ───

// "self" | "none" | "friends" | "pending_outgoing" | "pending_incoming"
export type RelationshipStatus = string;

export interface PublicUser {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  relationshipStatus: RelationshipStatus;
}

export interface FriendRequest {
  requestId: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface PublicPlaylist {
  id: number;
  name: string;
  songCount: number;
  ownerLabel: string;
}

export interface PublicProfile {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  relationshipStatus: RelationshipStatus;
  memberSince: string;
  totalListened: number;
  favoritesCount: number;
  topGenres: string[];
  publicPlaylists: PublicPlaylist[];
}

export interface ArtistDetail {
  id: number;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  songCount: number;
  followerCount: number;
  isFollowing: boolean;
}

export type BugStatus = 'open' | 'resolved';

export interface BugReport {
  id: number;
  reporter: UserRef | null;
  description: string;
  context: string | null;
  status: BugStatus;
  createdAt: string;
  resolvedBy: UserRef | null;
  screenshotCount?: number; // файли: GET /api/bug-reports/{id}/screenshots/{index}
}
