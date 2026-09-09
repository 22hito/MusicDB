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
    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExternalSongResult>>> Search([FromQuery] string q)
    {
        var results = await searchService.SearchAsync(q);
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
