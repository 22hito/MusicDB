using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController(MusicDbContext db) : ControllerBase
{
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get()
    {
        var email = CurrentEmail;
        var name = User.FindFirstValue(ClaimTypes.Name) ?? "";
        var picture = User.FindFirstValue("picture") ?? User.FindFirstValue("urn:google:picture");
        var isAdmin = User.HasClaim("role", "admin");

        var profile = await db.UserProfiles.FindAsync(email);

        // Три лічильники — одним запитом, а не трьома послідовними.
        var counts = await db.Users.Where(u => u.Email == email).Select(u => new
        {
            Listened = db.ListeningHistory.Count(h => h.UserEmail == email),
            Favorites = db.Favorites.Count(f => f.UserEmail == email),
            Playlists = db.Playlists.Count(p => p.UserEmail == email),
        }).FirstOrDefaultAsync();
        var totalListened = counts?.Listened ?? 0;
        var favoritesCount = counts?.Favorites ?? 0;
        var playlistsCount = counts?.Playlists ?? 0;

        // Топ-3 жанри за прослуховуваннями — для короткого "музичного портрету" в профілі. Підзапитом,
        // а не списком усіх прослуханих id, переданим назад у базу.
        var topGenres = await db.MusicGenres
            .Where(mg => db.ListeningHistory.Any(h => h.UserEmail == email && h.MusicId == mg.MusicId))
            .GroupBy(mg => mg.Genre.GenreName)
            .OrderByDescending(g => g.Count())
            .Take(3)
            .Select(g => g.Key.Trim())
            .ToListAsync();

        return Ok(new ProfileDto(
            email, name, profile?.DisplayName, picture, profile?.AvatarUrl, isAdmin,
            totalListened, favoritesCount, playlistsCount, topGenres.ToArray()
        ));
    }

    [HttpPut]
    public async Task<ActionResult<ProfileDto>> Update([FromBody] UpdateProfileDto dto)
    {
        var email = CurrentEmail;
        var profile = await db.UserProfiles.FindAsync(email);

        if (profile is null)
        {
            profile = new UserProfile { UserEmail = email };
            db.UserProfiles.Add(profile);
        }

        profile.DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? null : dto.DisplayName.Trim();
        profile.AvatarUrl = string.IsNullOrWhiteSpace(dto.AvatarUrl) ? null : dto.AvatarUrl.Trim();
        profile.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return await Get();
    }
}
