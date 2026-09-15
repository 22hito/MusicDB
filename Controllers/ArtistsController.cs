using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ArtistsController(MusicDbContext db, MusicService musicService, UserDirectoryService userDirectory) : ControllerBase
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
            .Select(a => new { a.Id, a.Name, SongCount = a.MusicArtists.Count })
            .OrderByDescending(a => a.SongCount)
            .ThenBy(a => a.Name)
            .Take(200)
            .ToListAsync();

        return Ok(artists.Select(a => new ArtistSummaryDto(a.Id, a.Name, a.SongCount)).ToList());
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

        return Ok(new ArtistDetailDto(artist.Id, artist.Name, artist.Bio, artist.ImageUrl, songCount, followerCount, isFollowing));
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
