using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/external-search")]
public class ExternalSearchController(
    ExternalMusicSearchService searchService,
    LastFmGenreService lastFmService,
    GenreNormalizationService genreNormalizer,
    MusicDbContext db) : ControllerBase
{
    // Доступно лише авторизованим. Список підказок повертається БЕЗ
    // збагачення жанрів — саме збагачення відбувається пізніше, лише для
    // ОБРАНОЇ пісні (див. SuggestGenres нижче).
    //
    // artist/title/album передаються ОКРЕМО (а не одним рядком q), щоб
    // можна було звужувати пошук iTunes до конкретного поля:
    //  - заповнено альбом (+ можливо виконавець) → шукаємо ВСІ пісні
    //    цього альбому (attribute=albumTerm, коли виконавця немає —
    //    інакше він додається в term для кращого збігу);
    //  - заповнено лише виконавець → attribute=artistTerm (щоб не
    //    підтягувались чужі пісні, назва яких просто збігається з
    //    іменем артиста);
    //  - заповнено лише назва → attribute=songTerm;
    //  - заповнено і виконавець, і назва → звичайний загальний пошук.
    // q лишився для сумісності зі старими клієнтами.
    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExternalSongResult>>> Search(
        [FromQuery] string? artist, [FromQuery] string? title, [FromQuery] string? album, [FromQuery] string? q)
    {
        artist = artist?.Trim() ?? "";
        title = title?.Trim() ?? "";
        album = album?.Trim() ?? "";

        string query;
        string? attribute = null;

        if (!string.IsNullOrWhiteSpace(album))
        {
            query = string.IsNullOrWhiteSpace(artist) ? album : $"{artist} {album}";
            attribute = string.IsNullOrWhiteSpace(artist) ? "albumTerm" : null;
        }
        else if (!string.IsNullOrWhiteSpace(artist) && !string.IsNullOrWhiteSpace(title))
        {
            query = $"{artist} {title}";
        }
        else if (!string.IsNullOrWhiteSpace(artist))
        {
            query = artist;
            attribute = "artistTerm";
        }
        else if (!string.IsNullOrWhiteSpace(title))
        {
            query = title;
            attribute = "songTerm";
        }
        else
        {
            query = q?.Trim() ?? "";
        }

        var results = await searchService.SearchAsync(query, attribute);
        return Ok(results);
    }

    // Визначає кілька жанрів для ОБРАНОЇ пісні. Основне джерело — Last.fm
    // (краудсорсингові теги від слухачів, безкоштовно, без жорсткого
    // ліміту запитів). Gemini використовується лише як резервний варіант,
    // якщо Last.fm нічого корисного не повернув (пісні не знайдено,
    // немає тегів тощо) — щоб не витрачати даремно обмежену квоту ШІ.
    [Authorize]
    [HttpGet("genres")]
    public async Task<ActionResult<string>> SuggestGenres([FromQuery] string artist, [FromQuery] string title, [FromQuery] string? hint)
    {
        var lastFmGenres = await lastFmService.GetGenreTagsAsync(artist, title);
        if (lastFmGenres.Count > 0)
            return Ok(string.Join(", ", lastFmGenres));

        var existingGenres = await db.Genres.Select(g => g.GenreName).ToListAsync();
        var single = new ExternalSongResult(artist, title, null, null, null, hint);
        var enriched = await genreNormalizer.EnrichGenresBatchAsync([single], existingGenres);
        return Ok(enriched.FirstOrDefault()?.Genre ?? hint ?? "");
    }
}
