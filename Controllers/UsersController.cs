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
public class UsersController(MusicDbContext db, UserDirectoryService userDirectory, TasteService taste) : ControllerBase
{
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? "";

    // Лише читання (і кеш у пам'яті) — не INSERT … ON CONFLICT DO UPDATE на кожен запит, як було.
    private Task<int> CurrentUserIdAsync() => userDirectory.GetCurrentUserIdAsync(User);

    // Аватарка користувача (своя — з data:-URI профілю; з Google — редирект). Публічна, як і гілки,
    // де її показують; адреса версійована (UserDirectoryService.AvatarLink), тож кеш — назавжди.
    [AllowAnonymous]
    [HttpGet("{id:int}/avatar")]
    public async Task<IActionResult> Avatar(int id)
    {
        var avatar = await userDirectory.GetAvatarSourceAsync(id);
        if (string.IsNullOrEmpty(avatar)) return NotFound();
        if (!avatar.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return Uri.TryCreate(avatar, UriKind.Absolute, out var url) && url.Scheme == Uri.UriSchemeHttps ? Redirect(avatar) : NotFound();
        var comma = avatar.IndexOf(',');
        var meta = comma > 5 ? avatar[5..comma] : "";
        if (comma < 0 || !meta.EndsWith(";base64", StringComparison.OrdinalIgnoreCase)) return NotFound();
        var mime = meta[..^7];
        if (!mime.StartsWith("image/", StringComparison.OrdinalIgnoreCase) || mime.Contains("svg", StringComparison.OrdinalIgnoreCase)) return NotFound();
        byte[] bytes;
        try { bytes = Convert.FromBase64String(avatar[(comma + 1)..]); }
        catch (FormatException) { return NotFound(); }
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(bytes, mime);
    }

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

        // Стосунки з усіма знайденими — одним запитом, а не окремим на кожен рядок.
        var ids = rows.Select(r => r.Id).ToList();
        var requests = await db.FriendRequests
            .Where(r => (r.RequesterId == myId && ids.Contains(r.AddresseeId)) || (r.AddresseeId == myId && ids.Contains(r.RequesterId)))
            .ToListAsync();
        string StatusWith(int otherId)
        {
            var req = requests.FirstOrDefault(r => r.RequesterId == otherId || r.AddresseeId == otherId);
            if (req is null) return "none";
            if (req.Status == "accepted") return "friends";
            return req.RequesterId == myId ? "pending_outgoing" : "pending_incoming";
        }
        return Ok(rows.Select(r => new UserSearchResultDto(
            r.Id,
            r.DisplayName ?? r.GoogleName ?? $"Учасник спільноти #{r.Id}",
            UserDirectoryService.AvatarLink(r.Id, r.AvatarUrl ?? r.GooglePicture),
            StatusWith(r.Id))).ToList());
    }

    // Граф "Схожий смак": люди, ребра схожості й список найближчих до мене.
    [HttpGet("taste")]
    public async Task<ActionResult<TasteGraphDto>> Taste() => Ok(await taste.BuildAsync(await CurrentUserIdAsync()));

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
            UserDirectoryService.AvatarLink(user.Id, profile?.AvatarUrl ?? user.GooglePicture),
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
