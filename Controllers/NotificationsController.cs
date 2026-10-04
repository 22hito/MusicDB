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

    // Лише читання (і кеш у пам'яті) — не INSERT … ON CONFLICT DO UPDATE на кожен запит, як було.
    private Task<int> CurrentUserIdAsync() => userDirectory.GetCurrentUserIdAsync(User);

    // Непрочитане — без фан-ауту: один запис події на артиста, "прочитано" — ArtistFollow.LastReadAt.
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

    // ─── Обговорення: нові дописи в гілках, де я учасник ───
    // Окрема вкладка в сповіщеннях: останні дописи інших (прочитані теж — з позначкою), новіші зверху.
    [HttpGet("threads")]
    public async Task<ActionResult<ThreadNotificationsDto>> Threads([FromQuery] int limit = 30)
    {
        var userId = await CurrentUserIdAsync();

        var query =
            from p in db.DiscussionPosts
            join f in db.ThreadFollows.Where(f => f.UserId == userId) on p.ThreadId equals f.ThreadId
            join t in db.DiscussionThreads on p.ThreadId equals t.Id
            join rp in db.DiscussionPosts on p.ReplyToPostId equals rp.Id into replies
            from rp in replies.DefaultIfEmpty()
            where p.AuthorId != userId && p.CreatedAt > f.FollowedAt
            select new
            {
                p.Id, p.ThreadId, t.Title, p.AuthorId, p.Body, p.CreatedAt,
                Unread = p.CreatedAt > f.LastReadAt,
                ToMe = rp != null ? rp.AuthorId == userId : t.AuthorId == userId,
            };

        var unreadCount = await query.CountAsync(x => x.Unread);
        var recent = await query.OrderByDescending(x => x.CreatedAt).Take(Math.Clamp(limit, 1, 100)).ToListAsync();
        var authors = await userDirectory.GetUserCardsAsync(recent.Where(r => r.AuthorId.HasValue).Select(r => r.AuthorId!.Value));

        return Ok(new ThreadNotificationsDto(unreadCount, recent.Select(r => new ThreadNotificationDto(
            r.Id, r.ThreadId, r.Title,
            r.AuthorId is int a && authors.TryGetValue(a, out var card) ? card.ToRef() : null,
            ThreadsController.Snippet(r.Body), ThreadsController.Stamp(r.CreatedAt), r.ToMe, r.Unread)).ToList()));
    }

    [HttpPost("threads/mark-read")]
    public async Task<IActionResult> MarkThreadsRead()
    {
        var userId = await CurrentUserIdAsync();
        await db.ThreadFollows.Where(f => f.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(f => f.LastReadAt, DateTime.UtcNow));
        return Ok();
    }

    [HttpPost("threads/{threadId:int}/mark-read")]
    public async Task<IActionResult> MarkThreadRead(int threadId)
    {
        var userId = await CurrentUserIdAsync();
        await db.ThreadFollows.Where(f => f.UserId == userId && f.ThreadId == threadId)
            .ExecuteUpdateAsync(s => s.SetProperty(f => f.LastReadAt, DateTime.UtcNow));
        return Ok();
    }

    // "Прочитати одну" = підняти LastReadAt цього артиста до часу цієї події —
    // усе старіше/рівне теж стає прочитаним, новіші події лишаються непрочитаними.
    [HttpPost("{eventId:int}/mark-read")]
    public async Task<IActionResult> MarkOneRead(int eventId)
    {
        var evt = await db.ArtistEvents.FindAsync(eventId);
        if (evt is null) return NotFound();

        var userId = await CurrentUserIdAsync();
        var follow = await db.ArtistFollows.FirstOrDefaultAsync(f => f.UserId == userId && f.ArtistId == evt.ArtistId);
        if (follow is null) return NotFound();

        if (evt.CreatedAt > follow.LastReadAt)
            follow.LastReadAt = evt.CreatedAt;
        await db.SaveChangesAsync();
        return Ok();
    }
}
