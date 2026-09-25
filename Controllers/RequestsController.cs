using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Filters;
using MusicDB.Api.Hubs;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RequestsController(
    MusicDbContext db, MusicService musicService, TranslationService translationService,
    ArtistActivityService artistActivity, AdminActivityService adminActivity,
    UserDirectoryService userDirectory, IAudioStorage audioStorage, CatalogCache catalogCache, IHubContext<MusicHub> hub) : ControllerBase
{
    [Authorize, AdminOnly]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RequestDto>>> GetAll()
    {
        var reqs = await db.Requests.OrderByDescending(r => r.CreatedAt).ToListAsync();
        var requesters = await userDirectory.GetUserCardsAsync(
            reqs.Where(r => r.RequesterUserId.HasValue).Select(r => r.RequesterUserId!.Value));
        return Ok(reqs.Select(r => ToDto(r, requesters)));
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<RequestDto>> Create([FromBody] CreateRequestDto dto)
    {
        var (genres, originalGenres) = await PrepareGenresAsync(dto.Genres);

        var req = new MusicRequest
        {
            Artist = dto.Artist.Trim(),
            Title = dto.Title.Trim(),
            Release = DateOnly.Parse(dto.Release),
            Duration = DurationParser.ParseToString(dto.Duration),
            GenreNames = genres,
            GenreNamesOriginal = originalGenres,
            AlbumTitle = dto.AlbumTitle?.Trim(),
            CreatedAt = DateTime.UtcNow,
            RequesterUserId = await userDirectory.GetCurrentUserIdAsync(User)
        };
        return await SaveNewRequestAsync(req);
    }

    // Заявка у головну таблицю_2: власна пісня від ком'юніті. Файл пісні
    // обов'язковий, якщо не вказано посилання на YouTube-відео.
    [Authorize]
    [HttpPost("community")]
    [RequestSizeLimit(AudioFiles.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = AudioFiles.MaxRequestBytes)]
    public async Task<ActionResult<RequestDto>> CreateCommunity([FromForm] CommunitySongForm form)
    {
        if (!CommunitySongInput.TryParse(form, out var input, out var error)) return BadRequest(error);

        string? audioFile = null;
        if (form.Audio is not null)
        {
            (audioFile, error) = await audioStorage.SaveAsync(form.Audio);
            if (audioFile is null) return BadRequest(error);
        }
        var (genres, originalGenres) = await PrepareGenresAsync(input!.Genres);

        var req = new MusicRequest
        {
            Artist = input!.Artist,
            Title = input.Title,
            Release = input.Release,
            Duration = DurationParser.ParseToString(input.Duration),
            GenreNames = genres,
            GenreNamesOriginal = originalGenres,
            AlbumTitle = input.Album,
            CreatedAt = DateTime.UtcNow,
            YoutubeVideoId = input.YoutubeVideoId,
            Kind = SongSources.Community,
            RequesterUserId = await userDirectory.GetCurrentUserIdAsync(User),
            AudioFile = audioFile
        };
        return await SaveNewRequestAsync(req);
    }

    // Жанри заявки — одразу в написанні, як у базі: "Hip-Hop" -> наявний "hip-hop",
    // "хип хоп" -> "hip hop" (словник), решта неанглійських — перекладом (MyMemory).
    // Оригінал зберігаємо, якщо щось змінилось по суті, — адмін може перевірити.
    private async Task<(string Genres, string? Original)> PrepareGenresAsync(IEnumerable<string> raw)
    {
        var original = raw.Select(g => g.Trim()).Where(g => g.Length > 0).ToList();
        var existing = await db.Genres.Select(g => g.GenreName.Trim()).ToListAsync();
        var result = new List<string>();
        var changed = false;
        foreach (var genre in original)
        {
            var key = GenreNames.Key(genre);
            var name = existing.FirstOrDefault(e => GenreNames.Key(e) == key)
                ?? GenreNames.KnownEnglish(genre)
                ?? (TranslationService.NeedsTranslation(genre) ? await translationService.TranslateToEnglishAsync(genre) : genre);
            if (!GenreNames.IsLatin(genre)) changed = true;
            if (!result.Any(r => GenreNames.Key(r) == GenreNames.Key(name))) result.Add(name);
        }
        return (string.Join(", ", result), changed ? string.Join(", ", original) : null);
    }

    private async Task<ActionResult<RequestDto>> SaveNewRequestAsync(MusicRequest req)
    {
        db.Requests.Add(req);
        await db.SaveChangesAsync();
        await adminActivity.RecordAsync(req.RequesterUserId, AdminActivityService.RequestSubmitted, $"{req.Artist} — {req.Title}", req.Kind);
        await hub.Clients.All.SendAsync("requestsChanged");
        return Ok(ToDto(req, await userDirectory.GetUserCardsAsync(req.RequesterUserId is int id ? [id] : [])));
    }

    // Прослуховування файлу заявки адміном перед підтвердженням.
    [Authorize, AdminOnly]
    [HttpGet("{id}/audio")]
    public async Task<IActionResult> GetAudio(int id)
    {
        var fileName = await db.Requests.Where(r => r.Id == id).Select(r => r.AudioFile).FirstOrDefaultAsync();
        return this.ToResult(await audioStorage.OpenAsync(fileName));
    }

    // Дозволяє адміну відредагувати будь-яке поле заявки перед підтвердженням
    // (наприклад, якщо автопереклад жанру виявився неправильним).
    [Authorize, AdminOnly]
    [HttpPut("{id}")]
    public async Task<ActionResult<RequestDto>> Update(int id, [FromBody] UpdateRequestDto dto)
    {
        if (!YoutubeUrlParser.TryExtract(dto.YoutubeVideoId, out var youtubeVideoId, out var shouldUpdateVideo))
            return BadRequest("Invalid YouTube video ID or URL.");

        var req = await db.Requests.FindAsync(id);
        if (req is null) return NotFound();
        if (req.Kind == SongSources.Community && shouldUpdateVideo && youtubeVideoId is null && req.AudioFile is null)
            return BadRequest("A community song needs an audio file or a YouTube video.");

        req.Artist = dto.Artist.Trim();
        req.Title = dto.Title.Trim();
        req.Release = DateOnly.Parse(dto.Release);
        req.Duration = DurationParser.ParseToString(dto.Duration);
        req.GenreNames = string.Join(", ", dto.Genres.Select(g => g.Trim()).Where(g => g.Length > 0));
        req.AlbumTitle = dto.AlbumTitle?.Trim();
        if (shouldUpdateVideo) req.YoutubeVideoId = youtubeVideoId;
        // Після ручного редагування адміном "оригінал" більше не потрібен —
        // адмін уже підтвердив правильний варіант.
        req.GenreNamesOriginal = null;

        await db.SaveChangesAsync();
        await hub.Clients.All.SendAsync("requestsChanged");
        return Ok(ToDto(req, await userDirectory.GetUserCardsAsync(req.RequesterUserId is int rid ? [rid] : [])));
    }

    // Текст пісні заявки — окремим ендпоінтом, як і /api/songs/{id}/lyrics.
    [Authorize, AdminOnly]
    [HttpGet("{id}/lyrics")]
    public async Task<ActionResult<LyricsDto>> GetLyrics(int id)
    {
        var req = await db.Requests.FindAsync(id);
        if (req is null) return NotFound();
        return Ok(new LyricsDto(req.Lyrics));
    }

    [Authorize, AdminOnly]
    [HttpPut("{id}/lyrics")]
    public async Task<ActionResult<LyricsDto>> SetLyrics(int id, [FromBody] LyricsDto dto)
    {
        var req = await db.Requests.FindAsync(id);
        if (req is null) return NotFound();
        req.Lyrics = string.IsNullOrWhiteSpace(dto.Lyrics) ? null : dto.Lyrics.Trim();
        await db.SaveChangesAsync();
        return Ok(new LyricsDto(req.Lyrics));
    }

    [Authorize, AdminOnly]
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var req = await db.Requests.FindAsync(id);
        if (req is null) return NotFound();

        var genreNames = (req.GenreNames ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var genreIds = await musicService.ResolveGenresAsync(genreNames);

        // Дублікат за виконавцем+назвою (без регістру/пробілів) — не створюємо
        // новий запис, а доєднуємо жанри до наявного.
        // Лише в каталозі: у таблиці_2 кожна пісня — чиясь власна, дві однакові
        // назви від різних людей — різні записи.
        var isCommunity = req.Kind == SongSources.Community;
        var existing = isCommunity ? null : await db.Songs.FirstOrDefaultAsync(m =>
            m.Source == SongSources.Catalog &&
            m.Artist.Trim().ToLower() == req.Artist.Trim().ToLower() &&
            m.Title.Trim().ToLower() == req.Title.Trim().ToLower());

        int songId;
        bool wasDuplicate = existing is not null;
        bool lyricsWasAdded = false;
        List<int> newSongArtistIds = [];

        if (existing is not null)
        {
            songId = existing.Id;

            var existingGenreIds = await db.MusicGenres
                .Where(mg => mg.MusicId == songId)
                .Select(mg => mg.GenreId)
                .ToListAsync();

            // Якщо в наявної пісні ще нема кешованого відео, а адмін вказав
            // його в заявці — переносимо (write-once, як і скрізь інде).
            if (existing.YoutubeVideoId is null && req.YoutubeVideoId is not null)
                existing.YoutubeVideoId = req.YoutubeVideoId;
            lyricsWasAdded = existing.Lyrics is null && req.Lyrics is not null;
            if (lyricsWasAdded)
                existing.Lyrics = req.Lyrics;

            foreach (var gid in genreIds.Except(existingGenreIds))
                db.MusicGenres.Add(new MusicGenre { MusicId = songId, GenreId = gid });
        }
        else
        {
            var albumId = await musicService.ResolveAlbumAsync(req.AlbumTitle);

            var music = new Music
            {
                Artist = req.Artist,
                Title = req.Title,
                Release = req.Release,
                Duration = DurationParser.Parse(req.Duration, TimeSpan.FromMinutes(3)),
                AlbumIds = albumId.HasValue ? [albumId.Value] : null,
                YoutubeVideoId = req.YoutubeVideoId,
                Lyrics = req.Lyrics,
                Source = req.Kind,
                SubmittedByUserId = isCommunity ? req.RequesterUserId : null,
                // Файл не копіюємо — пісня переймає вже збережений файл заявки.
                AudioFile = req.AudioFile
            };
            db.Songs.Add(music);
            await db.SaveChangesAsync();
            songId = music.Id;

            foreach (var gid in genreIds)
                db.MusicGenres.Add(new MusicGenre { MusicId = songId, GenreId = gid });

            newSongArtistIds = await musicService.ResolveArtistsAsync(music.Artist);
            await musicService.SyncMusicArtistsAsync(songId, newSongArtistIds);
        }

        db.Requests.Remove(req);
        await db.SaveChangesAsync();

        if (wasDuplicate)
        {
            if (lyricsWasAdded)
            {
                // Самолікування: стара пісня могла ще не пройти бекфіл.
                var artistIds = await db.MusicArtists.Where(ma => ma.MusicId == songId).Select(ma => ma.ArtistId).ToListAsync();
                if (artistIds.Count == 0)
                {
                    artistIds = await musicService.ResolveArtistsAsync(existing!.Artist);
                    await musicService.SyncMusicArtistsAsync(songId, artistIds);
                }
                await artistActivity.RecordEventAsync(artistIds, "lyrics_added", songId, $"{existing!.Artist} — {existing.Title}");
            }
        }
        else
        {
            await artistActivity.RecordEventAsync(newSongArtistIds, "song_added", songId, $"{req.Artist} — {req.Title}");
        }

        await adminActivity.RecordAsync(await userDirectory.GetCurrentUserIdAsync(User),
            AdminActivityService.RequestApproved, $"{req.Artist} — {req.Title}", req.Kind);
        await hub.Clients.All.SendAsync("requestsChanged");
        catalogCache.Invalidate();
        await hub.Clients.All.SendAsync("songsChanged");
        return Ok(new { message = wasDuplicate ? "merged" : "approved", songId, merged = wasDuplicate });
    }

    [Authorize, AdminOnly]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Reject(int id)
    {
        var req = await db.Requests.FindAsync(id);
        if (req is null) return NotFound();
        db.Requests.Remove(req);
        await db.SaveChangesAsync();
        await audioStorage.DeleteAsync(req.AudioFile);
        await adminActivity.RecordAsync(await userDirectory.GetCurrentUserIdAsync(User),
            AdminActivityService.RequestRejected, $"{req.Artist} — {req.Title}", req.Kind);
        await hub.Clients.All.SendAsync("requestsChanged");
        return NoContent();
    }

    private static RequestDto ToDto(MusicRequest r, Dictionary<int, UserDirectoryService.UserCard> requesters) => new(
        r.Id, r.Artist, r.Title,
        r.Release.ToString("yyyy-MM-dd"),
        r.Duration ?? "",
        (r.GenreNames ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        r.GenreNamesOriginal,
        r.AlbumTitle,
        r.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
        r.YoutubeVideoId,
        r.Kind,
        r.RequesterUserId is int uid && requesters.TryGetValue(uid, out var card) ? card.ToRef() : null,
        r.AudioFile is null ? null : $"/api/requests/{r.Id}/audio"
    );
}
