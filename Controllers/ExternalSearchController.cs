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
    // Жанри тут НЕ збагачуються — це робиться пізніше, лише для обраної
    // пісні (SuggestGenres).
    // artist/title/album — окремими полями (а не одним q), щоб звужувати
    // пошук iTunes під конкретний attribute (albumTerm/artistTerm/songTerm).
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
        string? artistHint = null;

        if (!string.IsNullOrWhiteSpace(album))
        {
            // Запит завжди звужуємо ЛИШЕ до назви альбому — комбінований рядок
            // "виконавець + альбом" на iTunes різко звужує нечіткий пошук і
            // повертає лише кілька збігів замість усіх треків альбому.
            // Виконавець (якщо теж заповнений) йде окремо — як підказка для
            // сортування релевантності, а не для звуження самого запиту.
            query = album;
            attribute = "albumTerm";
            artistHint = string.IsNullOrWhiteSpace(artist) ? null : artist;
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

        var results = await searchService.SearchAsync(query, attribute, artistHint: artistHint);
        return Ok(results);
    }

    // Основне джерело жанрів — Last.fm (без жорсткого ліміту запитів).
    // Gemini — лише фолбек, якщо Last.fm нічого не повернув, щоб не палити квоту.
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
