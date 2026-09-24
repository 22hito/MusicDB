using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Filters;
using MusicDB.Api.Hubs;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

// Баг-репорти: надсилає будь-який залогінений користувач (меню профілю),
// бачать і закривають адміни (адмін-панель); нове — одразу в дзвіночок адмінів.
[ApiController]
[Route("api/bug-reports")]
[Authorize]
public class BugReportsController(
    MusicDbContext db, UserDirectoryService userDirectory, AdminActivityService adminActivity, IHubContext<MusicHub> hub) : ControllerBase
{
    public const int MaxDescriptionLength = 4000;
    public const int MaxContextLength = 2000;
    public const int MaxPerHour = 5; // проти випадкового/навмисного флуду

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBugReportDto dto)
    {
        var description = dto.Description?.Trim() ?? "";
        if (description.Length < 10 || description.Length > MaxDescriptionLength)
            return BadRequest("Description must be 10–4000 characters.");

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var hourAgo = DateTime.UtcNow.AddHours(-1);
        if (await db.BugReports.CountAsync(r => r.UserId == myId && r.CreatedAt > hourAgo) >= MaxPerHour)
            return StatusCode(StatusCodes.Status429TooManyRequests, "Too many reports, try again later.");

        var context = dto.Context?.Trim();
        var report = new BugReport
        {
            UserId = myId,
            Description = description,
            Context = string.IsNullOrEmpty(context) ? null : context.Length > MaxContextLength ? context[..MaxContextLength] : context
        };
        db.BugReports.Add(report);
        await db.SaveChangesAsync();

        var label = description.Length > 80 ? description[..80] + "…" : description;
        await adminActivity.RecordAsync(myId, AdminActivityService.BugReported, label, "bug");
        await hub.Clients.Group(MusicHub.AdminsGroup).SendAsync("bugReportsChanged");
        return Ok(new { report.Id });
    }

    [AdminOnly]
    [HttpGet]
    public async Task<ActionResult<List<BugReportDto>>> GetAll([FromQuery] string status = "open")
    {
        var query = db.BugReports.AsQueryable();
        if (status != "all") query = query.Where(r => r.Status == status);
        var reports = await query.OrderByDescending(r => r.CreatedAt).Take(200).ToListAsync();

        var cards = await userDirectory.GetUserCardsAsync(
            reports.SelectMany(r => new[] { r.UserId, r.ResolvedBy }).Where(id => id.HasValue).Select(id => id!.Value));
        UserRefDto? Ref(int? id) => id is int uid && cards.TryGetValue(uid, out var c) ? c.ToRef() : null;

        return Ok(reports.Select(r => new BugReportDto(
            r.Id, Ref(r.UserId), r.Description, r.Context, r.Status,
            r.CreatedAt.ToString("yyyy-MM-dd HH:mm"), Ref(r.ResolvedBy))).ToList());
    }

    [AdminOnly]
    [HttpGet("open-count")]
    public async Task<ActionResult<int>> GetOpenCount() => Ok(await db.BugReports.CountAsync(r => r.Status == "open"));

    [AdminOnly]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] SetBugReportStatusDto dto)
    {
        if (dto.Status is not ("open" or "resolved")) return BadRequest("Status must be open or resolved.");
        var report = await db.BugReports.FindAsync(id);
        if (report is null) return NotFound();

        report.Status = dto.Status;
        var resolved = dto.Status == "resolved";
        report.ResolvedAt = resolved ? DateTime.UtcNow : null;
        report.ResolvedBy = resolved ? await userDirectory.GetCurrentUserIdAsync(User) : null;
        await db.SaveChangesAsync();
        await hub.Clients.Group(MusicHub.AdminsGroup).SendAsync("bugReportsChanged");
        return Ok();
    }
}
