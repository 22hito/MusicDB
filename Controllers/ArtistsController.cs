using System.Security.Claims;
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
public class ArtistsController(MusicDbContext db, MusicService musicService, UserDirectoryService userDirectory, IAudioStorage storage) : ControllerBase
{
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? "";
    private bool IsAuthenticated => User.Identity?.IsAuthenticated ?? false;

    private async Task<int> CurrentUserIdAsync() => await userDirectory.GetOrCreateUserIdAsync(
        CurrentEmail,
        User.FindFirstValue(ClaimTypes.Name),
        User.FindFirstValue("picture") ?? User.FindFirstValue("urn:google:picture"));

    // Каталог виконавців — публічний, як і сам список пісень.
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<List<ArtistSummaryDto>>> GetAll([FromQuery] string? q)
    {
        var query = db.Artists.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(a => EF.Functions.ILike(a.Name, $"%{q.Trim()}%"));

        var artists = await query
            .Select(a => new { a.Id, a.Name, a.ImageUrl, SongCount = a.MusicArtists.Count })
            .OrderByDescending(a => a.SongCount)
            .ThenBy(a => a.Name)
            .Take(200)
            .ToListAsync();

        return Ok(artists.Select(a => new ArtistSummaryDto(a.Id, a.Name, a.SongCount, ImageLink(a.Id, a.ImageUrl))).ToList());
    }

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ArtistDetailDto>> GetById(int id)
    {
        var artist = await db.Artists.FindAsync(id);
        if (artist is null) return NotFound();

        var songCount = await db.MusicArtists.CountAsync(ma => ma.ArtistId == id);
        var followerCount = await db.ArtistFollows.CountAsync(f => f.ArtistId == id);

        var isFollowing = false;
        if (IsAuthenticated)
        {
            var userId = await CurrentUserIdAsync();
            isFollowing = await db.ArtistFollows.AnyAsync(f => f.ArtistId == id && f.UserId == userId);
        }

        return Ok(new ArtistDetailDto(artist.Id, artist.Name, artist.Bio, ImageLink(artist), songCount, followerCount, isFollowing));
    }

    // Фото виконавця лежить у сховищі файлів (R2), у БД — лише ім'я файлу.
    // Назовні — адреса нашого ендпоінта з версією, щоб нове фото не бралось із кешу.
    private static string? ImageLink(Artist a) => ImageLink(a.Id, a.ImageUrl);
    internal static string? ImageLink(int id, string? file) =>
        AudioFiles.IsSafeName(file) ? $"/api/artists/{id}/image?v={Path.GetFileNameWithoutExtension(file)![^8..]}" : null;

    [AllowAnonymous]
    [HttpGet("{id:int}/image")]
    public async Task<IActionResult> GetImage(int id)
    {
        var artist = await db.Artists.FindAsync(id);
        return this.ToResult(artist is null ? null : await storage.OpenAsync(artist.ImageUrl));
    }

    // Опис виконавця — адмін.
    [Authorize, AdminOnly]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ArtistDetailDto>> Update(int id, [FromBody] UpdateArtistDto dto)
    {
        var artist = await db.Artists.FindAsync(id);
        if (artist is null) return NotFound();
        var bio = dto.Bio?.Trim();
        if (bio is { Length: > 5000 }) return BadRequest("Bio is too long.");
        artist.Bio = string.IsNullOrEmpty(bio) ? null : bio;
        await db.SaveChangesAsync();
        return await GetById(id);
    }

    // Фото виконавця (multipart, поле image) — адмін. Старий файл прибираємо зі сховища.
    [Authorize, AdminOnly]
    [HttpPut("{id:int}/image")]
    [RequestSizeLimit(AudioFiles.MaxImageBytes + 1024 * 1024)]
    public async Task<ActionResult<ArtistDetailDto>> SetImage(int id, IFormFile image)
    {
        var artist = await db.Artists.FindAsync(id);
        if (artist is null) return NotFound();
        var (name, error) = await storage.SaveImageAsync(image);
        if (name is null) return BadRequest(error);
        var old = artist.ImageUrl;
        artist.ImageUrl = name;
        await db.SaveChangesAsync();
        await storage.DeleteAsync(old);
        return await GetById(id);
    }

    [Authorize, AdminOnly]
    [HttpDelete("{id:int}/image")]
    public async Task<ActionResult<ArtistDetailDto>> DeleteImage(int id)
    {
        var artist = await db.Artists.FindAsync(id);
        if (artist is null) return NotFound();
        var old = artist.ImageUrl;
        artist.ImageUrl = null;
        await db.SaveChangesAsync();
        await storage.DeleteAsync(old);
        return await GetById(id);
    }

    // Схожі виконавці: за спільними жанрами пісень (Жаккар), найближчі 8.
    [AllowAnonymous]
    [HttpGet("{id:int}/similar")]
    public async Task<ActionResult<List<SimilarArtistDto>>> GetSimilar(int id)
    {
        var rows = await (
            from ma in db.MusicArtists
            join mg in db.MusicGenres on ma.MusicId equals mg.MusicId
            select new { ma.ArtistId, Genre = mg.Genre.GenreName }
        ).ToListAsync();
        var genresByArtist = rows
            .GroupBy(r => r.ArtistId)
            .ToDictionary(g => g.Key, g => g.Select(r => GenreNames.Key(r.Genre)).ToHashSet());
        if (!genresByArtist.TryGetValue(id, out var mine) || mine.Count == 0) return Ok(new List<SimilarArtistDto>());

        var scored = genresByArtist
            .Where(kv => kv.Key != id)
            .Select(kv =>
            {
                var inter = kv.Value.Count(mine.Contains);
                return (Id: kv.Key, Score: inter == 0 ? 0 : (double)inter / (mine.Count + kv.Value.Count - inter));
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(8)
            .ToList();
        var ids = scored.Select(x => x.Id).ToList();
        var artists = await db.Artists.Where(a => ids.Contains(a.Id))
            .Select(a => new { a.Id, a.Name, a.ImageUrl, SongCount = a.MusicArtists.Count })
            .ToDictionaryAsync(a => a.Id);
        return Ok(scored
            .Where(x => artists.ContainsKey(x.Id))
            .Select(x =>
            {
                var a = artists[x.Id];
                return new SimilarArtistDto(a.Id, a.Name, ImageLink(a.Id, a.ImageUrl), a.SongCount, (int)Math.Round(x.Score * 100));
            })
            .ToList());
    }

    // Повна дискографія — включно з колабораціями інших виконавців.
    [AllowAnonymous]
    [HttpGet("{id:int}/songs")]
    public async Task<ActionResult<List<SongDto>>> GetSongs(int id)
    {
        var musicIds = await db.MusicArtists.Where(ma => ma.ArtistId == id).Select(ma => ma.MusicId).ToListAsync();
        return Ok(await musicService.GetSongDtosByIdsAsync(musicIds));
    }

    [Authorize]
    [HttpPost("{id:int}/follow")]
    public async Task<IActionResult> Follow(int id)
    {
        if (!await db.Artists.AnyAsync(a => a.Id == id)) return NotFound();

        var userId = await CurrentUserIdAsync();
        var exists = await db.ArtistFollows.AnyAsync(f => f.ArtistId == id && f.UserId == userId);
        if (!exists)
        {
            db.ArtistFollows.Add(new ArtistFollow { ArtistId = id, UserId = userId });
            await db.SaveChangesAsync();
        }
        return Ok();
    }

    [Authorize]
    [HttpDelete("{id:int}/follow")]
    public async Task<IActionResult> Unfollow(int id)
    {
        var userId = await CurrentUserIdAsync();
        var follow = await db.ArtistFollows.FirstOrDefaultAsync(f => f.ArtistId == id && f.UserId == userId);
        if (follow is not null)
        {
            db.ArtistFollows.Remove(follow);
            await db.SaveChangesAsync();
        }
        return NoContent();
    }
}
