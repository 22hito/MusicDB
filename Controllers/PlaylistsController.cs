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
[Authorize]
public class PlaylistsController(MusicDbContext db, MusicService musicService) : ControllerBase
{
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PlaylistDto>>> GetAll()
    {
        var playlists = await db.Playlists
            .Where(p => p.UserEmail == CurrentEmail)
            .Include(p => p.PlaylistSongs)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return Ok(playlists.Select(p => new PlaylistDto(
            p.Id, p.Name, p.PlaylistSongs.Count, p.CreatedAt.ToString("yyyy-MM-dd"), p.IsPublic)));
    }

    // Публічні плейлисти інших користувачів — для сторінки "Батл рояль".
    // Без [Authorize]: видно й неавторизованим відвідувачам.
    [AllowAnonymous]
    [HttpGet("public")]
    public async Task<ActionResult<IEnumerable<PublicPlaylistDto>>> GetPublic()
    {
        var playlists = await db.Playlists
            .Where(p => p.IsPublic)
            .Include(p => p.PlaylistSongs)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var emails = playlists.Select(p => p.UserEmail).Distinct().ToList();
        var names = await db.UserProfiles
            .Where(u => emails.Contains(u.UserEmail))
            .ToDictionaryAsync(u => u.UserEmail, u => u.DisplayName);

        return Ok(playlists.Select(p => new PublicPlaylistDto(
            p.Id, p.Name, p.PlaylistSongs.Count,
            (names.TryGetValue(p.UserEmail, out var dn) && !string.IsNullOrWhiteSpace(dn)) ? dn! : "учасника спільноти")));
    }

    // Без [Authorize]: публічний плейлист теж має відкриватись анонімно (Батл рояль).
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<PlaylistDetailDto>> GetById(int id)
    {
        var playlist = await db.Playlists
            .Include(p => p.PlaylistSongs)
            .FirstOrDefaultAsync(p => p.Id == id && (p.UserEmail == CurrentEmail || p.IsPublic));

        if (playlist is null) return NotFound();

        var songs = await musicService.GetSongDtosByIdsAsync(playlist.PlaylistSongs.Select(ps => ps.MusicId));
        return Ok(new PlaylistDetailDto(playlist.Id, playlist.Name, songs));
    }

    [HttpPost]
    public async Task<ActionResult<PlaylistDto>> Create([FromBody] CreatePlaylistDto dto)
    {
        var name = dto.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return BadRequest();

        var playlist = new Playlist { UserEmail = CurrentEmail, Name = name, IsPublic = dto.IsPublic };
        db.Playlists.Add(playlist);
        await db.SaveChangesAsync();

        return Ok(new PlaylistDto(playlist.Id, playlist.Name, 0, playlist.CreatedAt.ToString("yyyy-MM-dd"), playlist.IsPublic));
    }

    // Перемикає публічність уже створеного плейлиста.
    [HttpPatch("{id}")]
    public async Task<ActionResult<PlaylistDto>> UpdatePublic(int id, [FromBody] UpdatePlaylistPublicDto dto)
    {
        var playlist = await db.Playlists
            .Include(p => p.PlaylistSongs)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserEmail == CurrentEmail);
        if (playlist is null) return NotFound();

        playlist.IsPublic = dto.IsPublic;
        await db.SaveChangesAsync();

        return Ok(new PlaylistDto(playlist.Id, playlist.Name, playlist.PlaylistSongs.Count, playlist.CreatedAt.ToString("yyyy-MM-dd"), playlist.IsPublic));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var playlist = await db.Playlists.FirstOrDefaultAsync(p => p.Id == id && p.UserEmail == CurrentEmail);
        if (playlist is null) return NotFound();
        db.Playlists.Remove(playlist);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/songs/{musicId}")]
    public async Task<IActionResult> AddSong(int id, int musicId)
    {
        var playlist = await db.Playlists.FirstOrDefaultAsync(p => p.Id == id && p.UserEmail == CurrentEmail);
        if (playlist is null) return NotFound();

        var exists = await db.PlaylistSongs.AnyAsync(ps => ps.PlaylistId == id && ps.MusicId == musicId);
        if (!exists)
        {
            db.PlaylistSongs.Add(new PlaylistSong { PlaylistId = id, MusicId = musicId });
            await db.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpDelete("{id}/songs/{musicId}")]
    public async Task<IActionResult> RemoveSong(int id, int musicId)
    {
        var playlist = await db.Playlists.FirstOrDefaultAsync(p => p.Id == id && p.UserEmail == CurrentEmail);
        if (playlist is null) return NotFound();

        var link = await db.PlaylistSongs.FirstOrDefaultAsync(ps => ps.PlaylistId == id && ps.MusicId == musicId);
        if (link is not null)
        {
            db.PlaylistSongs.Remove(link);
            await db.SaveChangesAsync();
        }
        return NoContent();
    }
}
