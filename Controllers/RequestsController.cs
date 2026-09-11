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
public class RequestsController(MusicDbContext db, MusicService musicService, TranslationService translationService, IHubContext<MusicHub> hub) : ControllerBase
{
    [Authorize, AdminOnly]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RequestDto>>> GetAll()
    {
        var reqs = await db.Requests.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(reqs.Select(ToDto));
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<RequestDto>> Create([FromBody] CreateRequestDto dto)
    {
        // Неанглійські жанри перекладаємо для узгодженості з базою,
        // оригінал зберігаємо, щоб адмін міг перевірити переклад.
        var originalGenres = dto.Genres.Select(g => g.Trim()).Where(g => g.Length > 0).ToList();
        var translatedGenres = new List<string>();
        var wasAnyTranslated = false;

        foreach (var genre in originalGenres)
        {
            if (TranslationService.NeedsTranslation(genre))
            {
                translatedGenres.Add(await translationService.TranslateToEnglishAsync(genre));
                wasAnyTranslated = true;
            }
            else
            {
                translatedGenres.Add(genre);
            }
        }

        var req = new MusicRequest
        {
            Artist = dto.Artist.Trim(),
            Title = dto.Title.Trim(),
            Release = DateOnly.Parse(dto.Release),
            Duration = DurationParser.ParseToString(dto.Duration),
            GenreNames = string.Join(", ", translatedGenres),
            GenreNamesOriginal = wasAnyTranslated ? string.Join(", ", originalGenres) : null,
            AlbumTitle = dto.AlbumTitle?.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        db.Requests.Add(req);
        await db.SaveChangesAsync();
        await hub.Clients.All.SendAsync("requestsChanged");
        return Ok(ToDto(req));
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
        return Ok(ToDto(req));
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
        var existing = await db.Songs.FirstOrDefaultAsync(m =>
            m.Artist.Trim().ToLower() == req.Artist.Trim().ToLower() &&
            m.Title.Trim().ToLower() == req.Title.Trim().ToLower());

        int songId;
        bool wasDuplicate = existing is not null;

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
                YoutubeVideoId = req.YoutubeVideoId
            };
            db.Songs.Add(music);
            await db.SaveChangesAsync();
            songId = music.Id;

            foreach (var gid in genreIds)
                db.MusicGenres.Add(new MusicGenre { MusicId = songId, GenreId = gid });
        }

        db.Requests.Remove(req);
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("requestsChanged");
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
        await hub.Clients.All.SendAsync("requestsChanged");
        return NoContent();
    }

    private static RequestDto ToDto(MusicRequest r) => new(
        r.Id, r.Artist, r.Title,
        r.Release.ToString("yyyy-MM-dd"),
        r.Duration ?? "",
        (r.GenreNames ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        r.GenreNamesOriginal,
        r.AlbumTitle,
        r.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
        r.YoutubeVideoId
    );
}
