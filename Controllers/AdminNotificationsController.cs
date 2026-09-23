using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Filters;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

// Дзвіночок адміна: нові заявки й дії ІНШИХ адмінів ("hito схвалює запит …",
// "hito додав …"). Власні дії не показуємо — про них адмін і так знає.
[ApiController]
[Route("api/admin-notifications")]
[Authorize, AdminOnly]
public class AdminNotificationsController(MusicDbContext db, UserDirectoryService userDirectory) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AdminNotificationsSummaryDto>> Get([FromQuery] int limit = 30)
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var lastRead = await db.AdminNotificationReads
            .Where(r => r.UserId == myId)
            .Select(r => (DateTime?)r.LastReadAt)
            .FirstOrDefaultAsync() ?? DateTime.MinValue;

        var others = db.AdminEvents.Where(e => e.ActorUserId == null || e.ActorUserId != myId);
        var unreadCount = await others.CountAsync(e => e.CreatedAt > lastRead);
        var recent = await others
            .OrderByDescending(e => e.CreatedAt)
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync();

        var actors = await userDirectory.GetUserCardsAsync(
            recent.Where(e => e.ActorUserId.HasValue).Select(e => e.ActorUserId!.Value));

        var dtos = recent.Select(e => new AdminNotificationDto(
            e.Id,
            e.ActorUserId is int id && actors.TryGetValue(id, out var card) ? card.ToRef() : null,
            e.EventType, e.Label, e.Source,
            e.CreatedAt.ToString("yyyy-MM-dd HH:mm"))).ToList();

        return Ok(new AdminNotificationsSummaryDto(unreadCount, dtos));
    }

    [HttpPost("mark-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var row = await db.AdminNotificationReads.FindAsync(myId);
        if (row is null) db.AdminNotificationReads.Add(new AdminNotificationRead { UserId = myId, LastReadAt = DateTime.UtcNow });
        else row.LastReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }
}
