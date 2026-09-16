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
    // Раз знайдений і підтверджений (пройшов перевірку релевантності) відеоряд
    // кешується тут — наступні відтворення цієї пісні більше не витрачають
    // YouTube Search API квоту (100 одиниць/запит) на повторний пошук.
    string?  YoutubeVideoId = null,
    // Розбір поля Artist на окремих виконавців (для посилань на їхні сторінки) —
    // null для DTO, де це поле ще не заповнюється (не ламає позиційні виклики).
    ArtistRefDto[]? Artists = null
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

// Використовується адміном для редагування вже опублікованої пісні
// (не заявки) прямо в головній таблиці.
public record UpdateSongDto(
    string   Artist,
    string   Title,
    string   Release,
    string   Duration,
    string[] Genres,
    string?  Album,
    // На відміну від PUT /api/songs/{id}/youtube-video (пише лише якщо
    // порожньо), тут адмін може як очистити (null/""), так і замінити вже
    // закешоване відео — якщо перше автопідтверджене значення виявилось
    // невдалим (напр. авторський "Remastered"/"Reimagined" реліз замість
    // потрібного оригіналу).
    string?  YoutubeVideoId = null
);

// ─── Genres ───────────────────────────────────────────────────────────────────

public record GenreDto(int Id, string Name);

// Результат ШІ-об'єднання дублікатів жанрів (POST /api/genres/normalize).
// Error — якщо звернення до ШІ не вдалося, щоб адмін бачив причину, а не хибне "дублікатів немає".
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

// Використовується адміном для редагування заявки перед підтвердженням
// (якщо, наприклад, автопереклад жанру виявився неправильним). YoutubeVideoId
// дозволяє одразу вказати правильне відео для нішевих/малопопулярних треків,
// де автопошук на сайті може підібрати не те — та сама семантика
// null/"" ("не чіпати"/"скинути"), що й в UpdateSongDto.
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

// Плейлист іншого користувача, зроблений публічним — видно на сторінці
// "Батл рояль" усім, з іменем власника (без email, лише DisplayName або
// заглушка), щоб можна було провести турнір серед чужих пісень.
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
// UserId — opaque id з lab.users. Email НІКОЛИ не повертається цими DTO —
// той самий принцип, що й у PublicPlaylistDto.OwnerLabel.

// RelationshipStatus: "self" | "none" | "friends" | "pending_outgoing" | "pending_incoming"
public record PublicUserDto(int UserId, string DisplayName, string? AvatarUrl, string RelationshipStatus);

// Розширений публічний профіль для сторінки page-user-profile — той самий
// принцип приватності, що й PublicUserDto (email ніколи), але з "музичним
// портретом" (як у власному ProfileDto) і списком ЛИШЕ публічних плейлистів.
public record PublicProfileDto(
    int UserId, string DisplayName, string? AvatarUrl, string RelationshipStatus,
    string MemberSince, int TotalListened, int FavoritesCount, string[] TopGenres,
    List<PublicPlaylistDto> PublicPlaylists);

public record UserSearchResultDto(int UserId, string DisplayName, string? AvatarUrl, string RelationshipStatus);

public record FriendRequestDto(int RequestId, int UserId, string DisplayName, string? AvatarUrl, string CreatedAt);

public record SendFriendRequestDto(int TargetUserId);
