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
    ArtistRefDto[]? Artists = null,   // розбір Artist на окремих виконавців, для посилань на їхні сторінки
    string   Source = "catalog",      // "catalog" (таблиця_1) | "community" (таблиця_2)
    UserRefDto? SubmittedBy = null,   // хто додав — лише для ком'юніті-пісень
    string?  AudioUrl = null,         // завантажений файл пісні (ком'юніті), грає замість YouTube
    double?  AvgRating = null,        // середня оцінка 0–100
    int      RatingCount = 0
);

public record UserRefDto(int UserId, string DisplayName);

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

// Пісня для головної таблиці_2 (ком'юніті) — multipart/form-data, бо з файлом.
// Потрібен або файл пісні, або посилання на YouTube-відео (тоді файл не обов'язковий).
// Використовується і заявкою користувача, і прямим додаванням адміном.
public class CommunitySongForm
{
    public string  Artist { get; set; } = "";
    public string  Title { get; set; } = "";
    public string  Release { get; set; } = "";
    public string  Duration { get; set; } = "";
    public string  Genres { get; set; } = "";         // через кому
    public string? Album { get; set; }
    public string? YoutubeVideo { get; set; }         // ID або посилання
    public IFormFile? Audio { get; set; }
}

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
    string?  YoutubeVideoId = null,
    string   Kind = "catalog",
    UserRefDto? Requester = null,
    string?  AudioUrl = null
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

// ─── Сповіщення адмінів ─────────────────────────────────────────────────────

// EventType: "request_submitted" | "request_approved" | "request_rejected" | "song_added"
public record AdminNotificationDto(int Id, UserRefDto? Actor, string EventType, string Label, string Source, string CreatedAt);

public record AdminNotificationsSummaryDto(int UnreadCount, List<AdminNotificationDto> Recent);

// ─── Особисті повідомлення ──────────────────────────────────────────────────

// State — стосунок до співрозмовника щодо листування:
// "friends" | "accepted" (схвалений запит) | "pending_outgoing" (мій запит чекає) |
// "pending_incoming" (запит мені) | "declined" (мені відмовили) |
// "declined_by_me" | "none" (ще нічого — перше повідомлення стане запитом).
public record ConversationDto(int UserId, string DisplayName, string? AvatarUrl, string LastMessage, bool LastFromMe, string LastAt, int UnreadCount, string State = "friends");

public record DirectMessageDto(int Id, int SenderId, int RecipientId, string Body, string CreatedAt, bool IsMine);

public record DmThreadDto(string State, bool CanSend, List<DirectMessageDto> Messages);

public record DmUnreadDto(int Unread, int Requests);

// Вхідний запит на листування від не-друга.
public record DmRequestDto(int UserId, string DisplayName, string? AvatarUrl, string Preview, int MessageCount, string CreatedAt);

public record SendMessageDto(string Body);

// ─── Обговорення ────────────────────────────────────────────────────────────

public record ThreadSummaryDto(int Id, string Title, UserRefDto? Author, string CreatedAt, string LastPostAt, int PostCount);

public record ThreadPostDto(int Id, UserRefDto? Author, string Body, string CreatedAt);

public record ThreadDetailDto(int Id, string Title, string Body, UserRefDto? Author, string CreatedAt, List<ThreadPostDto> Posts);

public record CreateThreadDto(string Title, string Body);

public record CreatePostDto(string Body);

// ─── Баг-репорти ─────────────────────────────────────────────────────────────

public record CreateBugReportDto(string Description, string? Context);

public record BugReportDto(int Id, UserRefDto? Reporter, string Description, string? Context, string Status, string CreatedAt, UserRefDto? ResolvedBy);

public record SetBugReportStatusDto(string Status);

// ─── Оцінки / рецензії ─────────────────────────────────────────────────────

public record RatingDto(UserRefDto User, int Score, string? Review, string UpdatedAt);

public record SongRatingsDto(int MusicId, double? AvgRating, int RatingCount, RatingDto? Mine, List<RatingDto> Reviews);

public record SaveRatingDto(int Score, string? Review);
