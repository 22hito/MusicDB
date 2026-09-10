using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Filters;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public partial class SongsController(MusicDbContext db, MusicService musicService) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<SongDto>> GetAll()
    {
        var songs = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .OrderBy(m => m.Artist).ThenBy(m => m.Title)
            .ToListAsync();

        // Завантажуємо всі потрібні альбоми одним запитом
        var albumIds = songs
            .Where(m => m.AlbumIds is { Length: > 0 })
            .Select(m => m.AlbumIds![0])
            .Distinct()
            .ToList();

        var albums = albumIds.Count > 0
            ? await db.Albums.Where(a => albumIds.Contains(a.Id)).ToDictionaryAsync(a => a.Id, a => a.Name)
            : new Dictionary<int, string>();

        var playCounts = await musicService.GetPlayCountsAsync(songs.Select(m => m.Id));

        return songs.Select(m => ToDto(m, albums, playCounts.GetValueOrDefault(m.Id, 0)));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SongDto>> GetById(int id)
    {
        var song = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (song is null) return NotFound();

        string? albumName = null;
        if (song.AlbumIds is { Length: > 0 })
            albumName = (await db.Albums.FindAsync(song.AlbumIds[0]))?.Name;

        var playCounts = await musicService.GetPlayCountsAsync([id]);
        return ToDto(song, albumName, playCounts.GetValueOrDefault(id, 0));
    }

    [Authorize, AdminOnly]
    [HttpPost]
    public async Task<ActionResult<SongDto>> Create([FromBody] CreateSongDto dto)
    {
        var genreIds = await musicService.ResolveGenresAsync(dto.Genres);
        var albumId = await musicService.ResolveAlbumAsync(dto.Album);

        var music = new Music
        {
            Artist = dto.Artist.Trim(),
            Title = dto.Title.Trim(),
            Release = DateOnly.Parse(dto.Release),
            Duration = DurationParser.Parse(dto.Duration, TimeSpan.FromMinutes(3)),
            AlbumIds = albumId.HasValue ? [albumId.Value] : null
        };
        db.Songs.Add(music);
        await db.SaveChangesAsync();

        foreach (var gid in genreIds)
            db.MusicGenres.Add(new MusicGenre { MusicId = music.Id, GenreId = gid });

        await db.SaveChangesAsync();

        var created = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .FirstAsync(m => m.Id == music.Id);

        string? createdAlbumName = albumId.HasValue
            ? (await db.Albums.FindAsync(albumId.Value))?.Name
            : null;

        return CreatedAtAction(nameof(GetById), new { id = music.Id }, ToDto(created, createdAlbumName, 0));
    }

    [Authorize, AdminOnly]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();
        db.Songs.Remove(song);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Кешує YouTube videoId, який фронтенд щойно сам знайшов і підтвердив
    // (пройшов перевірку релевантності перед відтворенням) — наступного разу
    // цю пісню можна програти без нового звернення до YouTube Search API.
    // Без [Authorize]: кешування пасивне й не потребує довіри — пишемо лише
    // якщо ще порожньо (перша спроба виграє), тож зіпсувати вже правильний
    // запис одним запитом не можна.
    [HttpPut("{id}/youtube-video")]
    public async Task<IActionResult> SetYoutubeVideo(int id, [FromBody] SetYoutubeVideoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.VideoId) || !YoutubeVideoIdRegex().IsMatch(dto.VideoId))
            return BadRequest();

        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();
        if (song.YoutubeVideoId is not null) return Ok();

        song.YoutubeVideoId = dto.VideoId;
        await db.SaveChangesAsync();
        return Ok();
    }

    [GeneratedRegex(@"^[A-Za-z0-9_-]{11}$")]
    private static partial Regex YoutubeVideoIdRegex();

    [GeneratedRegex(@"(?:v=|youtu\.be/|embed/)([A-Za-z0-9_-]{11})")]
    private static partial Regex YoutubeUrlRegex();

    // Приймає або голий 11-символьний videoId, або повний YouTube-лінк
    // (адмін радше вставить URL з адресного рядка, ніж сам ID).
    // Розрізняємо: поле взагалі не надіслано (null) — НЕ чіпаємо вже
    // закешоване значення (щоб інші клієнти, які ще не надсилають це поле —
    // напр. мобільний застосунок — не стирали кеш при кожному редагуванні);
    // надіслано явно порожнім рядком — це навмисне скидання (null).
    private static bool TryExtractYoutubeVideoId(string? raw, out string? videoId, out bool shouldUpdate)
    {
        videoId = null;
        if (raw is null) { shouldUpdate = false; return true; }
        shouldUpdate = true;
        if (raw.Length == 0) return true;

        var trimmed = raw.Trim();
        if (YoutubeVideoIdRegex().IsMatch(trimmed)) { videoId = trimmed; return true; }

        var match = YoutubeUrlRegex().Match(trimmed);
        if (match.Success) { videoId = match.Groups[1].Value; return true; }

        return false;
    }

    // Редагування вже опублікованої пісні (не заявки) — повністю
    // перезаписує основні поля, жанри та альбом.
    [Authorize, AdminOnly]
    [HttpPut("{id}")]
    public async Task<ActionResult<SongDto>> Update(int id, [FromBody] UpdateSongDto dto)
    {
        if (!TryExtractYoutubeVideoId(dto.YoutubeVideoId, out var youtubeVideoId, out var shouldUpdateVideo))
            return BadRequest("Invalid YouTube video ID or URL.");

        var song = await db.Songs
            .Include(m => m.MusicGenres)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (song is null) return NotFound();

        song.Artist = dto.Artist.Trim();
        song.Title = dto.Title.Trim();
        song.Release = DateOnly.Parse(dto.Release);
        song.Duration = DurationParser.Parse(dto.Duration, song.Duration);
        if (shouldUpdateVideo) song.YoutubeVideoId = youtubeVideoId;

        var albumId = await musicService.ResolveAlbumAsync(dto.Album);
        song.AlbumIds = albumId.HasValue ? [albumId.Value] : null;

        // Повністю замінюємо набір жанрів на той, що прийшов з форми редагування.
        db.MusicGenres.RemoveRange(song.MusicGenres);
        var genreIds = await musicService.ResolveGenresAsync(dto.Genres);
        foreach (var gid in genreIds)
            db.MusicGenres.Add(new MusicGenre { MusicId = song.Id, GenreId = gid });

        await db.SaveChangesAsync();

        var updated = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .FirstAsync(m => m.Id == song.Id);

        var playCounts = await musicService.GetPlayCountsAsync([song.Id]);
        string? updatedAlbumName = albumId.HasValue
            ? (await db.Albums.FindAsync(albumId.Value))?.Name
            : null;

        return Ok(ToDto(updated, updatedAlbumName, playCounts.GetValueOrDefault(song.Id, 0)));
    }

    private static SongDto ToDto(Music m, Dictionary<int, string> albums, int playCount)
    {
        var genres = m.MusicGenres.Select(mg => mg.Genre.GenreName.Trim()).ToArray();
        var albumName = m.AlbumIds is { Length: > 0 } && albums.TryGetValue(m.AlbumIds[0], out var n) ? n : null;
        return new SongDto(m.Id, m.Artist, m.Title,
            m.Release.ToString("yyyy-MM-dd"),
            m.Duration.ToString(@"hh\:mm\:ss"),
            genres, albumName, playCount, m.YoutubeVideoId);
    }

    private static SongDto ToDto(Music m, string? albumName, int playCount)
    {
        var genres = m.MusicGenres.Select(mg => mg.Genre.GenreName.Trim()).ToArray();
        return new SongDto(m.Id, m.Artist, m.Title,
            m.Release.ToString("yyyy-MM-dd"),
            m.Duration.ToString(@"hh\:mm\:ss"),
            genres, albumName, playCount, m.YoutubeVideoId);
    }
}