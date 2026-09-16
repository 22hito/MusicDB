using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

// "Друзі" — концепція для залогінених, тож увесь контролер вимагає логіну.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(MusicDbContext db, UserDirectoryService userDirectory) : ControllerBase
{
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? "";

    private async Task<int> CurrentUserIdAsync() => await userDirectory.GetOrCreateUserIdAsync(
        CurrentEmail,
        User.FindFirstValue(ClaimTypes.Name),
        User.FindFirstValue("picture") ?? User.FindFirstValue("urn:google:picture"));

    [HttpGet("search")]
    public async Task<ActionResult<List<UserSearchResultDto>>> Search([FromQuery] string q, [FromQuery] int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new List<UserSearchResultDto>());
        var myId = await CurrentUserIdAsync();
        var term = q.Trim();

        var rows = await (
            from u in db.Users
            join p in db.UserProfiles on u.Email equals p.UserEmail into profiles
            from p in profiles.DefaultIfEmpty()
            where u.Id != myId && EF.Functions.ILike(p != null ? (p.DisplayName ?? u.GoogleName ?? "") : (u.GoogleName ?? ""), $"%{term}%")
            select new { u.Id, DisplayName = p != null ? p.DisplayName : null, u.GoogleName, AvatarUrl = p != null ? p.AvatarUrl : null, u.GooglePicture }
        ).Take(Math.Clamp(limit, 1, 50)).ToListAsync();

        var results = new List<UserSearchResultDto>();
        foreach (var r in rows)
        {
            var status = await RelationshipStatusAsync(myId, r.Id);
            results.Add(new UserSearchResultDto(
                r.Id,
                r.DisplayName ?? r.GoogleName ?? $"Учасник спільноти #{r.Id}",
                r.AvatarUrl ?? r.GooglePicture,
                status));
        }
        return Ok(results);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PublicProfileDto>> GetById(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        var profile = await db.UserProfiles.FindAsync(user.Email);
        var myId = await CurrentUserIdAsync();
        var status = id == myId ? "self" : await RelationshipStatusAsync(myId, id);

        var totalListened = await db.ListeningHistory.CountAsync(h => h.UserEmail == user.Email);
        var favoritesCount = await db.Favorites.CountAsync(f => f.UserEmail == user.Email);

        var listenedMusicIds = await db.ListeningHistory
            .Where(h => h.UserEmail == user.Email)
            .Select(h => h.MusicId)
            .ToListAsync();
        var topGenres = await db.MusicGenres
            .Where(mg => listenedMusicIds.Contains(mg.MusicId))
            .GroupBy(mg => mg.Genre.GenreName)
            .OrderByDescending(g => g.Count())
            .Take(3)
            .Select(g => g.Key.Trim())
            .ToListAsync();

        // Лише публічні плейлисти — приватні чужим очам не видно.
        var playlists = await db.Playlists
            .Where(p => p.UserEmail == user.Email && p.IsPublic)
            .Include(p => p.PlaylistSongs)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        var ownerLabel = profile?.DisplayName ?? user.GoogleName ?? $"Учасник спільноти #{user.Id}";
        var publicPlaylists = playlists
            .Select(p => new PublicPlaylistDto(p.Id, p.Name, p.PlaylistSongs.Count, ownerLabel))
            .ToList();

        return Ok(new PublicProfileDto(
            user.Id,
            ownerLabel,
            profile?.AvatarUrl ?? user.GooglePicture,
            status,
            user.CreatedAt.ToString("yyyy-MM-dd"),
            totalListened,
            favoritesCount,
            topGenres.ToArray(),
            publicPlaylists));
    }

    // "none" | "friends" | "pending_outgoing" | "pending_incoming" — стосовно myId.
    internal static async Task<string> RelationshipStatusAsync(MusicDbContext db, int myId, int otherId)
    {
        var req = await db.FriendRequests.FirstOrDefaultAsync(r =>
            (r.RequesterId == myId && r.AddresseeId == otherId) ||
            (r.RequesterId == otherId && r.AddresseeId == myId));

        if (req is null) return "none";
        if (req.Status == "accepted") return "friends";
        return req.RequesterId == myId ? "pending_outgoing" : "pending_incoming";
    }

    private Task<string> RelationshipStatusAsync(int myId, int otherId) => RelationshipStatusAsync(db, myId, otherId);
}
