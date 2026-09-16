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
    // Жанри тут НЕ збагачуються — лише пізніше, для обраної пісні (SuggestGenres).
    // artist/title/album — окремими полями, щоб звужувати пошук iTunes під attribute;
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
            // Запит звужуємо лише до назви альбому — "виконавець + альбом" на iTunes
            // повертає замало збігів. Виконавець іде окремо, лише для сортування.
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
