using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Hubs;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

// Гілки обговорень ком'юніті. Читати може будь-хто, писати — залогінені;
// видаляти — автор або адмін (модерація). Автор гілки й ті, хто в ній відповідав, —
// учасники: їм приходять сповіщення про нові дописи (NotificationsController.Threads).
[ApiController]
[Route("api/[controller]")]
public class ThreadsController(MusicDbContext db, UserDirectoryService userDirectory, IHubContext<MusicHub> hub) : ControllerBase
{
    private const int MaxTitleLength = 200;
    private const int MaxBodyLength = 10000;
    private const int SnippetLength = 140;

    private bool IsAdmin => User.HasClaim("role", "admin");
    private bool IsAuthenticated => User.Identity?.IsAuthenticated ?? false;

    [HttpGet]
    public async Task<ActionResult<List<ThreadSummaryDto>>> GetAll([FromQuery] string? q)
    {
        var query = db.DiscussionThreads.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(t => EF.Functions.ILike(t.Title, $"%{q.Trim()}%"));

        var threads = await query
            .OrderByDescending(t => t.LastPostAt)
            .Take(200)
            .Select(t => new { t.Id, t.Title, t.AuthorId, t.CreatedAt, t.LastPostAt, PostCount = t.Posts.Count })
            .ToListAsync();

        // Скільки нового в гілках, де я учасник — бейдж на картці гілки.
        var unread = new Dictionary<int, int>();
        if (IsAuthenticated)
        {
            var myId = await userDirectory.GetCurrentUserIdAsync(User);
            var ids = threads.Select(t => t.Id).ToList();
            unread = await (
                from p in db.DiscussionPosts
                join f in db.ThreadFollows.Where(f => f.UserId == myId && ids.Contains(f.ThreadId)) on p.ThreadId equals f.ThreadId
                where p.AuthorId != myId && p.CreatedAt > f.LastReadAt
                group p by p.ThreadId into g
                select new { ThreadId = g.Key, Count = g.Count() }
            ).ToDictionaryAsync(x => x.ThreadId, x => x.Count);
        }

        var authors = await userDirectory.GetUserCardsAsync(threads.Where(t => t.AuthorId.HasValue).Select(t => t.AuthorId!.Value));
        return Ok(threads.Select(t => new ThreadSummaryDto(
            t.Id, t.Title, AuthorRef(authors, t.AuthorId),
            Stamp(t.CreatedAt), Stamp(t.LastPostAt), t.PostCount, unread.GetValueOrDefault(t.Id))).ToList());
    }

    // Відкрили гілку — її сповіщення прочитані (для учасника).
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ThreadDetailDto>> GetById(int id)
    {
        var thread = await db.DiscussionThreads.FindAsync(id);
        if (thread is null) return NotFound();

        var posts = await db.DiscussionPosts.Where(p => p.ThreadId == id).OrderBy(p => p.CreatedAt).ToListAsync();
        var authorIds = posts.Where(p => p.AuthorId.HasValue).Select(p => p.AuthorId!.Value).ToList();
        if (thread.AuthorId.HasValue) authorIds.Add(thread.AuthorId.Value);
        var authors = await userDirectory.GetUserCardsAsync(authorIds);
        var byId = posts.ToDictionary(p => p.Id);

        var following = false;
        if (IsAuthenticated)
        {
            var myId = await userDirectory.GetCurrentUserIdAsync(User);
            var follow = await db.ThreadFollows.FirstOrDefaultAsync(f => f.UserId == myId && f.ThreadId == id);
            if (follow is not null)
            {
                following = true;
                var hadUnread = posts.Any(p => p.AuthorId != myId && p.CreatedAt > follow.LastReadAt);
                follow.LastReadAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                if (hadUnread) await NotifySelfAsync("threadNotificationsChanged", id);
            }
        }

        return Ok(new ThreadDetailDto(
            thread.Id, thread.Title, thread.Body, AuthorRef(authors, thread.AuthorId),
            Stamp(thread.CreatedAt),
            posts.Select(p => ToDto(p, authors, byId)).ToList(),
            following));
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ThreadSummaryDto>> Create([FromBody] CreateThreadDto dto)
    {
        var title = dto.Title?.Trim() ?? "";
        var body = dto.Body?.Trim() ?? "";
        if (title.Length == 0 || title.Length > MaxTitleLength || body.Length == 0 || body.Length > MaxBodyLength)
            return BadRequest("Title (1–200) and body (1–10000) are required.");

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var thread = new DiscussionThread { AuthorId = myId, Title = title, Body = body };
        db.DiscussionThreads.Add(thread);
        await db.SaveChangesAsync();
        db.ThreadFollows.Add(new ThreadFollow { UserId = myId, ThreadId = thread.Id, FollowedAt = thread.CreatedAt, LastReadAt = thread.CreatedAt });
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("threadsChanged", thread.Id);
        var authors = await userDirectory.GetUserCardsAsync([myId]);
        return Ok(new ThreadSummaryDto(thread.Id, thread.Title, AuthorRef(authors, myId),
            Stamp(thread.CreatedAt), Stamp(thread.LastPostAt), 0));
    }

    [Authorize]
    [HttpPost("{id:int}/posts")]
    public async Task<ActionResult<ThreadPostDto>> AddPost(int id, [FromBody] CreatePostDto dto)
    {
        var body = dto.Body?.Trim() ?? "";
        if (body.Length == 0 || body.Length > MaxBodyLength) return BadRequest("Reply must be 1–10000 characters.");

        var thread = await db.DiscussionThreads.FindAsync(id);
        if (thread is null) return NotFound();

        // Відповідь на конкретний допис — лише цієї ж гілки.
        DiscussionPost? replyTo = null;
        if (dto.ReplyToPostId is int replyId)
        {
            replyTo = await db.DiscussionPosts.FirstOrDefaultAsync(p => p.Id == replyId && p.ThreadId == id);
            if (replyTo is null) return BadRequest("Reply target not found in this thread.");
        }

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var post = new DiscussionPost { ThreadId = id, AuthorId = myId, Body = body, ReplyToPostId = replyTo?.Id };
        db.DiscussionPosts.Add(post);
        thread.LastPostAt = post.CreatedAt;

        // Відповів — тепер учасник (і все, що було до мого допису, вже прочитано).
        var mine = await db.ThreadFollows.FirstOrDefaultAsync(f => f.UserId == myId && f.ThreadId == id);
        if (mine is null) db.ThreadFollows.Add(new ThreadFollow { UserId = myId, ThreadId = id, FollowedAt = post.CreatedAt, LastReadAt = post.CreatedAt });
        else mine.LastReadAt = post.CreatedAt;
        // Автор допису, на який відповіли, дізнається про відповідь, навіть якщо раніше не стежив за гілкою.
        if (replyTo?.AuthorId is int targetId && targetId != myId
            && !await db.ThreadFollows.AnyAsync(f => f.UserId == targetId && f.ThreadId == id))
        {
            var before = post.CreatedAt.AddTicks(-1);
            db.ThreadFollows.Add(new ThreadFollow { UserId = targetId, ThreadId = id, FollowedAt = before, LastReadAt = before });
        }
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("threadsChanged", id);
        var authors = await userDirectory.GetUserCardsAsync(replyTo?.AuthorId is int ra ? [myId, ra] : [myId]);
        await NotifyFollowersAsync(thread, myId, authors.GetValueOrDefault(myId)?.DisplayName, replyTo?.AuthorId);
        return Ok(ToDto(post, authors, replyTo is null ? [] : new() { [replyTo.Id] = replyTo }));
    }

    // Стежити / не стежити за гілкою (дзвіночок у гілці).
    [Authorize]
    [HttpPost("{id:int}/follow")]
    public async Task<IActionResult> Follow(int id)
    {
        if (!await db.DiscussionThreads.AnyAsync(t => t.Id == id)) return NotFound();
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        if (!await db.ThreadFollows.AnyAsync(f => f.UserId == myId && f.ThreadId == id))
        {
            db.ThreadFollows.Add(new ThreadFollow { UserId = myId, ThreadId = id });
            await db.SaveChangesAsync();
        }
        return Ok();
    }

    [Authorize]
    [HttpDelete("{id:int}/follow")]
    public async Task<IActionResult> Unfollow(int id)
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        await db.ThreadFollows.Where(f => f.UserId == myId && f.ThreadId == id).ExecuteDeleteAsync();
        await NotifySelfAsync("threadNotificationsChanged", id);
        return Ok();
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var thread = await db.DiscussionThreads.FindAsync(id);
        if (thread is null) return NotFound();
        if (!IsAdmin && thread.AuthorId != await userDirectory.GetCurrentUserIdAsync(User)) return Forbid();

        db.DiscussionThreads.Remove(thread);
        await db.SaveChangesAsync();
        await hub.Clients.All.SendAsync("threadsChanged", id);
        return NoContent();
    }

    [Authorize]
    [HttpDelete("posts/{postId:int}")]
    public async Task<IActionResult> DeletePost(int postId)
    {
        var post = await db.DiscussionPosts.FindAsync(postId);
        if (post is null) return NotFound();
        if (!IsAdmin && post.AuthorId != await userDirectory.GetCurrentUserIdAsync(User)) return Forbid();

        // Відповіді на видалений допис лишаються — лише без цитати.
        await db.DiscussionPosts.Where(p => p.ReplyToPostId == postId).ExecuteUpdateAsync(s => s.SetProperty(p => p.ReplyToPostId, (int?)null));
        db.DiscussionPosts.Remove(post);
        await db.SaveChangesAsync();
        await hub.Clients.All.SendAsync("threadsChanged", post.ThreadId);
        return NoContent();
    }

    // Учасникам гілки (крім автора допису): «threadReply» — тост і бейдж дзвіночка.
    // Аргументи: id гілки, ім'я автора, назва гілки, чи це відповідь саме мені.
    private async Task NotifyFollowersAsync(DiscussionThread thread, int authorId, string? authorName, int? repliedToUserId)
    {
        var followers = await (
            from f in db.ThreadFollows
            join u in db.Users on f.UserId equals u.Id
            where f.ThreadId == thread.Id && f.UserId != authorId
            select new { u.Id, u.Email }
        ).ToListAsync();
        foreach (var f in followers)
        {
            var toMe = f.Id == repliedToUserId || (repliedToUserId is null && f.Id == thread.AuthorId);
            await hub.Clients.Group(MusicHub.UserGroup(f.Email)).SendAsync("threadReply", thread.Id, authorName, thread.Title, toMe);
        }
    }

    private Task NotifySelfAsync(string evt, int arg) =>
        hub.Clients.Group(MusicHub.UserGroup(User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "")).SendAsync(evt, arg);

    private static ThreadPostDto ToDto(DiscussionPost p, Dictionary<int, UserDirectoryService.UserCard> authors, Dictionary<int, DiscussionPost> byId)
    {
        ThreadReplyRefDto? reply = null;
        if (p.ReplyToPostId is int rid && byId.TryGetValue(rid, out var target))
            reply = new ThreadReplyRefDto(target.Id, AuthorRef(authors, target.AuthorId), Snippet(target.Body));
        return new ThreadPostDto(p.Id, AuthorRef(authors, p.AuthorId), p.Body, Stamp(p.CreatedAt), reply);
    }

    internal static string Snippet(string body)
    {
        var flat = string.Join(' ', body.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        return flat.Length > SnippetLength ? flat[..SnippetLength].TrimEnd() + "…" : flat;
    }

    // Час — UTC у тому самому форматі, що й скрізь в API; клієнти показують його у своєму часовому поясі.
    internal static string Stamp(DateTime at) => at.ToString("yyyy-MM-dd HH:mm");

    private static UserRefDto? AuthorRef(Dictionary<int, UserDirectoryService.UserCard> authors, int? id) =>
        id is int uid && authors.TryGetValue(uid, out var card) ? card.ToRef() : null;
}
