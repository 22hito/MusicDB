namespace MusicDB.Api.Models;

// ─── Songs ────────────────────────────────────────────────────────────────────

public record SongDto(
    int      Id,
    string   Artist,
    string   Title,
    string   Release,    // "yyyy-MM-dd"
    string   Duration,   // "HH:mm:ss"
    string[] Genres,
    string?  Album,
    int      PlayCount = 0,   // кількість унікальних слухачів, з listening_history
    string?  YoutubeVideoId = null,   // кеш підтвердженого відео — економить YouTube API квоту
    ArtistRefDto[]? Artists = null    // розбір Artist на окремих виконавців, для посилань на їхні сторінки
);

public record SetYoutubeVideoDto(string VideoId);

// Текст пісні для режиму караоке — вводить вручну адмін, не з стороннього API.
public record LyricsDto(string? Lyrics);

public record CreateSongDto(
    string   Artist,
    string   Title,
    string   Release,
    string   Duration,
    string[] Genres,
    string?  Album
);

// Редагування вже опублікованої пісні (не заявки) адміном у головній таблиці.
public record UpdateSongDto(
    string   Artist,
    string   Title,
    string   Release,
    string   Duration,
    string[] Genres,
    string?  Album,
    string?  YoutubeVideoId = null   // на відміну від PUT .../youtube-video, тут можна й очистити, й замінити
);

// ─── Genres ───────────────────────────────────────────────────────────────────

public record GenreDto(int Id, string Name);

// Результат ШІ-об'єднання дублікатів жанрів (POST /api/genres/normalize).
public record NormalizeGenresResultDto(int MergedCount, List<string> MergedPairs, string? Error);

// ─── Requests ─────────────────────────────────────────────────────────────────

public record RequestDto(
    int      Id,
    string   Artist,
    string   Title,
    string   Release,
    string   Duration,
    string[] Genres,
    string?  GenreNamesOriginal,
    string?  AlbumTitle,
    string   CreatedAt,
    string?  YoutubeVideoId = null
);

public record CreateRequestDto(
    string   Artist,
    string   Title,
    string   Release,
    string   Duration,
    string[] Genres,
    string?  AlbumTitle
);

// Редагування заявки адміном перед підтвердженням.
public record UpdateRequestDto(
    string   Artist,
    string   Title,
    string   Release,
    string   Duration,
    string[] Genres,
    string?  AlbumTitle,
    string?  YoutubeVideoId = null
);

// ─── Profile / Favorites / Playlists / History ─────────────────────────────────

public record ProfileDto(
    string   Email,
    string   Name,          // ім'я з Google
    string?  DisplayName,   // власний нікнейм (редагований)
    string?  Picture,       // фото з Google-акаунту
    string?  AvatarUrl,     // власна аватарка (пріоритетна над Picture)
    bool     IsAdmin,
    int      TotalListened,
    int      FavoritesCount,
    int      PlaylistsCount,
    string[] TopGenres
);

public record UpdateProfileDto(string? DisplayName, string? AvatarUrl);

public record PlaylistDto(int Id, string Name, int SongCount, string CreatedAt, bool IsPublic = false);

public record PlaylistDetailDto(int Id, string Name, List<SongDto> Songs);

public record CreatePlaylistDto(string Name, bool IsPublic = false);

public record UpdatePlaylistPublicDto(bool IsPublic);

// Публічний плейлист іншого користувача — з іменем власника, без email.
public record PublicPlaylistDto(int Id, string Name, int SongCount, string OwnerLabel);

public record LogListenDto(int MusicId);

// Рекомендація з коротким поясненням від ШІ, чому саме ця пісня.
public record RecommendationDto(SongDto Song, string? Reason);

// ─── Artists ──────────────────────────────────────────────────────────────────

public record ArtistRefDto(int Id, string Name);

public record ArtistSummaryDto(int Id, string Name, int SongCount);

public record ArtistDetailDto(int Id, string Name, string? Bio, string? ImageUrl, int SongCount, int FollowerCount, bool IsFollowing);

public record ArtistNotificationDto(int Id, int ArtistId, string ArtistName, string EventType, string SongLabel, string CreatedAt);

public record NotificationsSummaryDto(int UnreadCount, List<ArtistNotificationDto> Recent);

// ─── Users / Friends ────────────────────────────────────────────────────────────
// UserId — opaque id з lab.users. Email НІКОЛИ не повертається цими DTO.

// RelationshipStatus: "self" | "none" | "friends" | "pending_outgoing" | "pending_incoming"
public record PublicUserDto(int UserId, string DisplayName, string? AvatarUrl, string RelationshipStatus);

// Розширений публічний профіль (page-user-profile): "музичний портрет" і публічні плейлисти.
public record PublicProfileDto(
    int UserId, string DisplayName, string? AvatarUrl, string RelationshipStatus,
    string MemberSince, int TotalListened, int FavoritesCount, string[] TopGenres,
    List<PublicPlaylistDto> PublicPlaylists);

public record UserSearchResultDto(int UserId, string DisplayName, string? AvatarUrl, string RelationshipStatus);

public record FriendRequestDto(int RequestId, int UserId, string DisplayName, string? AvatarUrl, string CreatedAt);

public record SendFriendRequestDto(int TargetUserId);
