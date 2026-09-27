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
public class SongsController(
    MusicDbContext db, MusicService musicService, ArtistActivityService artistActivity,
    AdminActivityService adminActivity, UserDirectoryService userDirectory, IAudioStorage audioStorage,
    CatalogCache catalogCache, IHubContext<MusicHub> hub) : ControllerBase
{
    // source: "catalog" (головна таблиця_1, за замовчуванням — так старі клієнти,
    // зокрема мобільний, і далі бачать лише каталог), "community" (таблиця_2), "all"
    // або "background" — пісні з файлом з обох таблиць (вкладка "У фоні").
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SongDto>>> GetAll([FromQuery] string source = SongSources.Catalog)
    {
        if (source != "all" && source != SongSources.Background && !SongSources.IsValid(source)) return BadRequest("Unknown source.");

        // Кеш: список — 6 послідовних запитів до БД, і після кожної зміни каталогу
        // його разом перезапитують усі відкриті вкладки (див. CatalogCache).
        return Ok(await catalogCache.GetOrCreateAsync($"songs:{source}", async () =>
        {
            var query = db.Songs.Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre).AsQueryable();
            if (source == SongSources.Background) query = query.Where(m => m.AudioFile != null);
            else if (source != "all") query = query.Where(m => m.Source == source);

            // .ToLower() — інакше велика/мала літери сортуються окремими блоками (A-Z, a-z).
            var songs = await query
                .OrderBy(m => m.Artist.ToLower()).ThenBy(m => m.Title.ToLower())
                .ToListAsync();

            return await musicService.BuildSongDtosAsync(songs);
        }));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SongDto>> GetById(int id)
    {
        var song = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (song is null) return NotFound();
        return (await musicService.BuildSongDtosAsync([song]))[0];
    }

    [Authorize, AdminOnly]
    [HttpPost]
    public async Task<ActionResult<SongDto>> Create([FromBody] CreateSongDto dto)
    {
        var music = new Music
        {
            Artist = dto.Artist.Trim(),
            Title = dto.Title.Trim(),
            Release = DateOnly.Parse(dto.Release),
            Duration = DurationParser.Parse(dto.Duration, TimeSpan.FromMinutes(3)),
        };
        return await CreateSongAsync(music, dto.Genres, dto.Album);
    }

    // Пряме додавання адміном у головну таблицю_2 — як і заявка, потребує
    // файл пісні або YouTube-посилання. Автором вважається сам адмін.
    [Authorize, AdminOnly]
    [HttpPost("community")]
    [RequestSizeLimit(AudioFiles.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = AudioFiles.MaxRequestBytes)]
    public async Task<ActionResult<SongDto>> CreateCommunity([FromForm] CommunitySongForm form)
    {
        if (!CommunitySongInput.TryParse(form, out var input, out var error)) return BadRequest(error);

        string? audioFile = null;
        if (form.Audio is not null)
        {
            (audioFile, error) = await audioStorage.SaveAsync(form.Audio);
            if (audioFile is null) return BadRequest(error);
        }

        var music = new Music
        {
            Artist = input!.Artist,
            Title = input.Title,
            Release = input.Release,
            Duration = DurationParser.Parse(input.Duration, TimeSpan.FromMinutes(3)),
            YoutubeVideoId = input.YoutubeVideoId,
            Source = SongSources.Community,
            SubmittedByUserId = await userDirectory.GetCurrentUserIdAsync(User),
            AudioFile = audioFile
        };
        return await CreateSongAsync(music, input.Genres, input.Album);
    }

    private async Task<ActionResult<SongDto>> CreateSongAsync(Music music, IEnumerable<string> genres, string? album)
    {
        var genreIds = await musicService.ResolveGenresAsync(genres);
        var albumId = await musicService.ResolveAlbumAsync(album);
        music.AlbumIds = albumId.HasValue ? [albumId.Value] : null;

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

        var label = $"{music.Artist} — {music.Title}";
        await artistActivity.RecordEventAsync(artistIds, "song_added", music.Id, label);
        await adminActivity.RecordAsync(await userDirectory.GetCurrentUserIdAsync(User), AdminActivityService.SongAdded, label, music.Source);
        catalogCache.Invalidate();
        await hub.Clients.All.SendAsync("songsChanged");
        return CreatedAtAction(nameof(GetById), new { id = music.Id }, (await musicService.BuildSongDtosAsync([created]))[0]);
    }

    [Authorize, AdminOnly]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();

        // Знімаємо artist_id-и й підпис ДО видалення — каскад зітре music_artists разом із піснею.
        var artistIds = await db.MusicArtists.Where(ma => ma.MusicId == id).Select(ma => ma.ArtistId).ToListAsync();
        var label = $"{song.Artist} — {song.Title}";
        var audioFile = song.AudioFile;

        db.Songs.Remove(song);
        await db.SaveChangesAsync();
        await audioStorage.DeleteAsync(audioFile);
        await artistActivity.RecordEventAsync(artistIds, "song_removed", null, label);
        catalogCache.Invalidate();
        await hub.Clients.All.SendAsync("songsChanged");
        return NoContent();
    }

    // Файл ком'юніті-пісні. Локально — сам файл із Range (перемотування без
    // повного завантаження); з R2 — редирект на підписане посилання, тож аудіо
    // йде напряму з Cloudflare. Публічний, як і сам список пісень.
    // ?download=true — віддати на збереження ("Виконавець - Назва.mp3").
    [HttpGet("{id}/audio")]
    public async Task<IActionResult> GetAudio(int id, [FromQuery] bool download = false)
    {
        var s = await db.Songs.Where(m => m.Id == id).Select(m => new { m.AudioFile, m.Artist, m.Title }).FirstOrDefaultAsync();
        if (s?.AudioFile is null) return NotFound();
        return this.ToResult(await audioStorage.OpenAsync(s.AudioFile, download ? AudioFiles.DownloadName(s.Artist, s.Title, s.AudioFile) : null));
    }

    // Пряме посилання на файл (застосунок: "Скачати" відкриває його в браузері телефону).
    [HttpGet("{id}/audio/link")]
    public async Task<IActionResult> GetAudioLink(int id, [FromQuery] bool download = false)
    {
        var s = await db.Songs.Where(m => m.Id == id).Select(m => new { m.AudioFile, m.Artist, m.Title }).FirstOrDefaultAsync();
        if (s?.AudioFile is null) return NotFound();
        var source = await audioStorage.OpenAsync(s.AudioFile, download ? AudioFiles.DownloadName(s.Artist, s.Title, s.AudioFile) : null);
        if (source is null) return NotFound();
        return Ok(new { url = source.RedirectUrl ?? $"/api/songs/{id}/audio{(download ? "?download=true" : "")}" });
    }

    // Файл пісні від адміна (модалка редагування) — будь-якої, і з каталогу: з файлом
    // пісня грає у фоні й потрапляє у вкладку "У фоні".
    [Authorize, AdminOnly]
    [HttpPut("{id}/audio")]
    [RequestSizeLimit(AudioFiles.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = AudioFiles.MaxRequestBytes)]
    public async Task<IActionResult> ReplaceAudio(int id, IFormFile audio)
    {
        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();

        var (fileName, error) = await audioStorage.SaveAsync(audio);
        if (fileName is null) return BadRequest(error);

        var old = song.AudioFile;
        song.AudioFile = fileName;
        await db.SaveChangesAsync();
        await audioStorage.DeleteAsync(old);
        catalogCache.Invalidate();
        await hub.Clients.All.SendAsync("songsChanged");
        return Ok();
    }

    // Прибрати файл пісні (адмін). Пісня ком'юніті без YouTube-відео без файлу не грала б узагалі.
    [Authorize, AdminOnly]
    [HttpDelete("{id}/audio")]
    public async Task<IActionResult> DeleteAudio(int id)
    {
        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();
        if (song.AudioFile is null) return NoContent();
        if (song.Source == SongSources.Community && string.IsNullOrWhiteSpace(song.YoutubeVideoId))
            return BadRequest("A community song needs an audio file or a YouTube video.");

        var old = song.AudioFile;
        song.AudioFile = null;
        await db.SaveChangesAsync();
        await audioStorage.DeleteAsync(old);
        catalogCache.Invalidate();
        await hub.Clients.All.SendAsync("songsChanged");
        return NoContent();
    }

    // Кешує підтверджений YouTube videoId для повторних відтворень без нового
    // пошуку. Без [Authorize]: пишемо лише якщо ще порожньо, перша спроба виграє.
    [HttpPut("{id}/youtube-video")]
    public async Task<IActionResult> SetYoutubeVideo(int id, [FromBody] SetYoutubeVideoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.VideoId) || !YoutubeUrlParser.IsValidId(dto.VideoId))
            return BadRequest();

        var song = await db.Songs.FindAsync(id);
        if (song is null) return NotFound();
        // Ком'юніті-пісні не автопошукуються: відео до них вказує лише автор чи адмін.
        if (song.YoutubeVideoId is not null || song.Source == SongSources.Community) return Ok();

        song.YoutubeVideoId = dto.VideoId;
        await db.SaveChangesAsync();
        catalogCache.Invalidate(); // інакше інші клієнти ще 30с шукали б це відео самі (квота YouTube)
        return Ok();
    }

    // Окремий ендпоінт для тексту пісні — щоб не роздувати основний список пісень.
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

        // Сповіщення лише коли текст СПРАВДІ зʼявився (null -> непорожній).
        var wasAdded = string.IsNullOrWhiteSpace(song.Lyrics) && !string.IsNullOrWhiteSpace(dto.Lyrics);
        song.Lyrics = string.IsNullOrWhiteSpace(dto.Lyrics) ? null : dto.Lyrics.Trim();
        await db.SaveChangesAsync();

        if (wasAdded)
        {
            var artistIds = await db.MusicArtists.Where(ma => ma.MusicId == id).Select(ma => ma.ArtistId).ToListAsync();
            if (artistIds.Count == 0) // пісня ще не пройшла бекфіл
            {
                artistIds = await musicService.ResolveArtistsAsync(song.Artist);
                await musicService.SyncMusicArtistsAsync(id, artistIds);
            }
            await artistActivity.RecordEventAsync(artistIds, "lyrics_added", song.Id, $"{song.Artist} — {song.Title}");
        }

        return Ok(new LyricsDto(song.Lyrics));
    }

    // Редагування вже опублікованої пісні (не заявки).
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

        // Напрям: адмін може перенести пісню в іншу таблицю (каталог / ком'юніті).
        var source = dto.Source is null ? song.Source : SongSources.IsValid(dto.Source) ? dto.Source : null;
        if (source is null) return BadRequest("Unknown table.");
        // Ком'юніті-пісня без файлу тримається лише на відео — його не можна просто стерти.
        var videoAfter = shouldUpdateVideo ? youtubeVideoId : song.YoutubeVideoId;
        if (source == SongSources.Community && videoAfter is null && song.AudioFile is null)
            return BadRequest("A community song needs an audio file or a YouTube video.");
        song.Source = source;

        song.Artist = dto.Artist.Trim();
        song.Title = dto.Title.Trim();
        song.Release = DateOnly.Parse(dto.Release);
        song.Duration = DurationParser.Parse(dto.Duration, song.Duration);
        if (shouldUpdateVideo) song.YoutubeVideoId = youtubeVideoId;

        var albumId = await musicService.ResolveAlbumAsync(dto.Album);
        song.AlbumIds = albumId.HasValue ? [albumId.Value] : null;

        db.MusicGenres.RemoveRange(song.MusicGenres);
        var genreIds = await musicService.ResolveGenresAsync(dto.Genres);
        foreach (var gid in genreIds)
            db.MusicGenres.Add(new MusicGenre { MusicId = song.Id, GenreId = gid });

        await db.SaveChangesAsync();

        // Ресинк music_artists під нове поле Artist — корекція, не "подія".
        var artistIds = await musicService.ResolveArtistsAsync(song.Artist);
        await musicService.SyncMusicArtistsAsync(song.Id, artistIds);

        var updated = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .FirstAsync(m => m.Id == song.Id);

        catalogCache.Invalidate();
        await hub.Clients.All.SendAsync("songsChanged");
        return Ok((await musicService.BuildSongDtosAsync([updated]))[0]);
    }
}
