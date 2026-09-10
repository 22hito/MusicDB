namespace MusicDB.Api.Models;

// ─── Songs ────────────────────────────────────────────────────────────────────

public record SongDto(
    int      Id,
    string   Artist,
    string   Title,
    string   Release,    // "yyyy-MM-dd"
    string   Duration,   // "HH:mm:ss"
    string[] Genres,
    string?  Album
);

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
    string?  Album
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
    string   CreatedAt
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
// (якщо, наприклад, автопереклад жанру виявився неправильним).
public record UpdateRequestDto(
    string   Artist,
    string   Title,
    string   Release,
    string   Duration,
    string[] Genres,
    string?  AlbumTitle
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

public record PlaylistDto(int Id, string Name, int SongCount, string CreatedAt);

public record PlaylistDetailDto(int Id, string Name, List<SongDto> Songs);

public record CreatePlaylistDto(string Name);

public record LogListenDto(int MusicId);

// Рекомендація з коротким поясненням від ШІ, чому саме ця пісня.
public record RecommendationDto(SongDto Song, string? Reason);
