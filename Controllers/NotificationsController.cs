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
public class NotificationsController(MusicDbContext db, UserDirectoryService userDirectory) : ControllerBase
{
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? "";

    private async Task<int> CurrentUserIdAsync() => await userDirectory.GetOrCreateUserIdAsync(
        CurrentEmail,
        User.FindFirstValue(ClaimTypes.Name),
        User.FindFirstValue("picture") ?? User.FindFirstValue("urn:google:picture"));

    // Непрочитане — без фан-ауту (рядок-на-підписника-на-подію): один запис
    // події на артиста, "прочитано" — ArtistFollow.LastReadAt. LINQ-join
    // компілюється в реальний SQL JOIN + WHERE, без фільтрації в памʼяті.
    [HttpGet]
    public async Task<ActionResult<NotificationsSummaryDto>> Get([FromQuery] int limit = 30)
    {
        var userId = await CurrentUserIdAsync();

        var query =
            from e in db.ArtistEvents
            join f in db.ArtistFollows.Where(f => f.UserId == userId) on e.ArtistId equals f.ArtistId
            where e.CreatedAt > f.LastReadAt
            orderby e.CreatedAt descending
            select e;

        var unreadCount = await query.CountAsync();
        var recent = await query
            .Take(Math.Clamp(limit, 1, 100))
            .Select(e => new { e.Id, e.ArtistId, e.EventType, e.SongLabel, e.CreatedAt })
            .ToListAsync();

        var artistNames = await db.Artists
            .Where(a => recent.Select(r => r.ArtistId).Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, a => a.Name);

        var dtos = recent
            .Select(r => new ArtistNotificationDto(
                r.Id, r.ArtistId, artistNames.GetValueOrDefault(r.ArtistId, "?"),
                r.EventType, r.SongLabel, r.CreatedAt.ToString("yyyy-MM-dd HH:mm")))
            .ToList();

        return Ok(new NotificationsSummaryDto(unreadCount, dtos));
    }

    [HttpPost("mark-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = await CurrentUserIdAsync();
        await db.ArtistFollows
            .Where(f => f.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(f => f.LastReadAt, DateTime.UtcNow));
        return Ok();
    }
}
