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
// видаляти — автор або адмін (модерація).
[ApiController]
[Route("api/[controller]")]
public class ThreadsController(MusicDbContext db, UserDirectoryService userDirectory, IHubContext<MusicHub> hub) : ControllerBase
{
    private const int MaxTitleLength = 200;
    private const int MaxBodyLength = 10000;

    private bool IsAdmin => User.HasClaim("role", "admin");

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

        var authors = await userDirectory.GetUserCardsAsync(threads.Where(t => t.AuthorId.HasValue).Select(t => t.AuthorId!.Value));
        return Ok(threads.Select(t => new ThreadSummaryDto(
            t.Id, t.Title, AuthorRef(authors, t.AuthorId),
            t.CreatedAt.ToString("yyyy-MM-dd HH:mm"), t.LastPostAt.ToString("yyyy-MM-dd HH:mm"), t.PostCount)).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ThreadDetailDto>> GetById(int id)
    {
        var thread = await db.DiscussionThreads.FindAsync(id);
        if (thread is null) return NotFound();

        var posts = await db.DiscussionPosts.Where(p => p.ThreadId == id).OrderBy(p => p.CreatedAt).ToListAsync();
        var authorIds = posts.Where(p => p.AuthorId.HasValue).Select(p => p.AuthorId!.Value).ToList();
        if (thread.AuthorId.HasValue) authorIds.Add(thread.AuthorId.Value);
        var authors = await userDirectory.GetUserCardsAsync(authorIds);

        return Ok(new ThreadDetailDto(
            thread.Id, thread.Title, thread.Body, AuthorRef(authors, thread.AuthorId),
            thread.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
            posts.Select(p => new ThreadPostDto(p.Id, AuthorRef(authors, p.AuthorId), p.Body, p.CreatedAt.ToString("yyyy-MM-dd HH:mm"))).ToList()));
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

        await hub.Clients.All.SendAsync("threadsChanged", thread.Id);
        var authors = await userDirectory.GetUserCardsAsync([myId]);
        return Ok(new ThreadSummaryDto(thread.Id, thread.Title, AuthorRef(authors, myId),
            thread.CreatedAt.ToString("yyyy-MM-dd HH:mm"), thread.LastPostAt.ToString("yyyy-MM-dd HH:mm"), 0));
    }

    [Authorize]
    [HttpPost("{id:int}/posts")]
    public async Task<ActionResult<ThreadPostDto>> AddPost(int id, [FromBody] CreatePostDto dto)
    {
        var body = dto.Body?.Trim() ?? "";
        if (body.Length == 0 || body.Length > MaxBodyLength) return BadRequest("Reply must be 1–10000 characters.");

        var thread = await db.DiscussionThreads.FindAsync(id);
        if (thread is null) return NotFound();

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var post = new DiscussionPost { ThreadId = id, AuthorId = myId, Body = body };
        db.DiscussionPosts.Add(post);
        thread.LastPostAt = post.CreatedAt;
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("threadsChanged", id);
        var authors = await userDirectory.GetUserCardsAsync([myId]);
        return Ok(new ThreadPostDto(post.Id, AuthorRef(authors, myId), post.Body, post.CreatedAt.ToString("yyyy-MM-dd HH:mm")));
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

        db.DiscussionPosts.Remove(post);
        await db.SaveChangesAsync();
        await hub.Clients.All.SendAsync("threadsChanged", post.ThreadId);
        return NoContent();
    }

    private static UserRefDto? AuthorRef(Dictionary<int, UserDirectoryService.UserCard> authors, int? id) =>
        id is int uid && authors.TryGetValue(uid, out var card) ? card.ToRef() : null;
}
