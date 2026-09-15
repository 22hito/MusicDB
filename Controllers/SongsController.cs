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
public class SongsController(MusicDbContext db, MusicService musicService, ArtistActivityService artistActivity, IHubContext<MusicHub> hub) : ControllerBase
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
        var artistsBySong = await musicService.GetSongArtistsAsync(songs.Select(m => m.Id));

        return songs.Select(m => ToDto(m, albums, playCounts.GetValueOrDefault(m.Id, 0), artistsBySong.GetValueOrDefault(m.Id)));
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
        var artistsBySong = await musicService.GetSongArtistsAsync([id]);
        return ToDto(song, albumName, playCounts.GetValueOrDefault(id, 0), artistsBySong.GetValueOrDefault(id));
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

        var artistIds = await musicService.ResolveArtistsAsync(music.Artist);
        await musicService.SyncMusicArtistsAsync(music.Id, artistIds);

        await db.SaveChangesAsync();

        var created = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .FirstAsync(m => m.Id == music.Id);

        string? createdAlbumName = albumId.HasValue
            ? (await db.Albums.FindAsync(albumId.Value))?.Name
            : null;
        var createdArtists = (await musicService.GetSongArtistsAsync([music.Id])).GetValueOrDefault(music.Id);

        await artistActivity.RecordEventAsync(artistIds, "song_added", music.Id, $"{music.Artist} — {music.Title}");
        await hub.Clients.All.SendAsync("songsChanged");
        return CreatedAtAction(nameof(GetById), new { id = music.Id }, ToDto(created, createdAlbumName, 0, createdArtists));
    }

    [Authorize, AdminOnly]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();

        // Знімаємо artist_id-и й підпис ДО видалення — каскад зітре
        // music_artists разом із піснею.
        var artistIds = await db.MusicArtists.Where(ma => ma.MusicId == id).Select(ma => ma.ArtistId).ToListAsync();
        var label = $"{song.Artist} — {song.Title}";

        db.Songs.Remove(song);
        await db.SaveChangesAsync();
        await artistActivity.RecordEventAsync(artistIds, "song_removed", null, label);
        await hub.Clients.All.SendAsync("songsChanged");
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
        if (string.IsNullOrWhiteSpace(dto.VideoId) || !YoutubeUrlParser.IsValidId(dto.VideoId))
            return BadRequest();

        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();
        if (song.YoutubeVideoId is not null) return Ok();

        song.YoutubeVideoId = dto.VideoId;
        await db.SaveChangesAsync();
        return Ok();
    }

    // Текст пісні (караоке) підвантажуємо окремим ендпоінтом, а не разом з
    // GET /api/songs — інакше повний текст КОЖНОЇ пісні (можуть бути кілобайти)
    // роздував би основний список, який і так підвантажується часто
    // (перше завантаження сторінки, кожне songsChanged через SignalR).
    [HttpGet("{id}/lyrics")]
    public async Task<ActionResult<LyricsDto>> GetLyrics(int id)
    {
        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();
        return Ok(new LyricsDto(song.Lyrics));
    }

    [Authorize, AdminOnly]
    [HttpPut("{id}/lyrics")]
    public async Task<ActionResult<LyricsDto>> SetLyrics(int id, [FromBody] LyricsDto dto)
    {
        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();

        // Сповіщення лише коли текст СПРАВДІ зʼявився (null -> непорожній),
        // не на кожне редагування вже наявного.
        var wasAdded = string.IsNullOrWhiteSpace(song.Lyrics) && !string.IsNullOrWhiteSpace(dto.Lyrics);
        song.Lyrics = string.IsNullOrWhiteSpace(dto.Lyrics) ? null : dto.Lyrics.Trim();
        await db.SaveChangesAsync();

        if (wasAdded)
        {
            var artistIds = await db.MusicArtists.Where(ma => ma.MusicId == id).Select(ma => ma.ArtistId).ToListAsync();
            if (artistIds.Count == 0) // самолікування: пісня ще не пройшла бекфіл
            {
                artistIds = await musicService.ResolveArtistsAsync(song.Artist);
                await musicService.SyncMusicArtistsAsync(id, artistIds);
            }
            await artistActivity.RecordEventAsync(artistIds, "lyrics_added", song.Id, $"{song.Artist} — {song.Title}");
        }

        return Ok(new LyricsDto(song.Lyrics));
    }

    // Редагування вже опублікованої пісні (не заявки) — повністю
    // перезаписує основні поля, жанри та альбом.
    [Authorize, AdminOnly]
    [HttpPut("{id}")]
    public async Task<ActionResult<SongDto>> Update(int id, [FromBody] UpdateSongDto dto)
    {
        if (!YoutubeUrlParser.TryExtract(dto.YoutubeVideoId, out var youtubeVideoId, out var shouldUpdateVideo))
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

        // Ресинк music_artists під нове поле Artist — це корекція наявного
        // запису, не "подія" (без ArtistActivityService.RecordEventAsync).
        var artistIds = await musicService.ResolveArtistsAsync(song.Artist);
        await musicService.SyncMusicArtistsAsync(song.Id, artistIds);

        var updated = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .FirstAsync(m => m.Id == song.Id);

        var playCounts = await musicService.GetPlayCountsAsync([song.Id]);
        string? updatedAlbumName = albumId.HasValue
            ? (await db.Albums.FindAsync(albumId.Value))?.Name
            : null;
        var updatedArtists = (await musicService.GetSongArtistsAsync([song.Id])).GetValueOrDefault(song.Id);

        await hub.Clients.All.SendAsync("songsChanged");
        return Ok(ToDto(updated, updatedAlbumName, playCounts.GetValueOrDefault(song.Id, 0), updatedArtists));
    }

    private static SongDto ToDto(Music m, Dictionary<int, string> albums, int playCount, ArtistRefDto[]? artists = null)
    {
        var genres = m.MusicGenres.Select(mg => mg.Genre.GenreName.Trim()).ToArray();
        var albumName = m.AlbumIds is { Length: > 0 } && albums.TryGetValue(m.AlbumIds[0], out var n) ? n : null;
        return new SongDto(m.Id, m.Artist, m.Title,
            m.Release.ToString("yyyy-MM-dd"),
            m.Duration.ToString(@"hh\:mm\:ss"),
            genres, albumName, playCount, m.YoutubeVideoId, artists);
    }

    private static SongDto ToDto(Music m, string? albumName, int playCount, ArtistRefDto[]? artists = null)
    {
        var genres = m.MusicGenres.Select(mg => mg.Genre.GenreName.Trim()).ToArray();
        return new SongDto(m.Id, m.Artist, m.Title,
            m.Release.ToString("yyyy-MM-dd"),
            m.Duration.ToString(@"hh\:mm\:ss"),
            genres, albumName, playCount, m.YoutubeVideoId, artists);
    }
}