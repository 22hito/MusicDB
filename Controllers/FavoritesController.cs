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
public class FavoritesController(MusicDbContext db, MusicService musicService) : ControllerBase
{
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SongDto>>> GetAll()
    {
        var musicIds = await db.Favorites
            .Where(f => f.UserEmail == CurrentEmail)
            .Select(f => f.MusicId)
            .ToListAsync();

        return Ok(await musicService.GetSongDtosByIdsAsync(musicIds));
    }

    [HttpPost("{musicId}")]
    public async Task<IActionResult> Add(int musicId)
    {
        var email = CurrentEmail;
        var exists = await db.Favorites.AnyAsync(f => f.UserEmail == email && f.MusicId == musicId);
        if (!exists)
        {
            db.Favorites.Add(new Favorite { UserEmail = email, MusicId = musicId });
            await db.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpDelete("{musicId}")]
    public async Task<IActionResult> Remove(int musicId)
    {
        var email = CurrentEmail;
        var fav = await db.Favorites.FirstOrDefaultAsync(f => f.UserEmail == email && f.MusicId == musicId);
        if (fav is not null)
        {
            db.Favorites.Remove(fav);
            await db.SaveChangesAsync();
        }
        return NoContent();
    }
}
