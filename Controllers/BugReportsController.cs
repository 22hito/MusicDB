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
    MusicDbContext db, UserDirectoryService userDirectory, AdminActivityService adminActivity, IHubContext<MusicHub> hub,
    IAudioStorage storage) : ControllerBase
{
    public const int MaxDescriptionLength = 4000;
    public const int MaxContextLength = 2000;
    public const int MaxPerHour = 5; // проти випадкового/навмисного флуду
    public const int MaxScreenshots = 3;

    [HttpPost]
    public Task<IActionResult> Create([FromBody] CreateBugReportDto dto) => CreateCoreAsync(dto.Description, dto.Context, null);

    // Той самий звіт + до 3 скріншотів (multipart/form-data: description, context, screenshots[]).
    [HttpPost("with-screenshots")]
    [RequestSizeLimit(MaxScreenshots * AudioFiles.MaxImageBytes + 1024 * 1024)]
    public Task<IActionResult> CreateWithScreenshots([FromForm] string description, [FromForm] string? context, [FromForm] List<IFormFile>? screenshots) =>
        CreateCoreAsync(description, context, screenshots);

    private async Task<IActionResult> CreateCoreAsync(string? rawDescription, string? rawContext, List<IFormFile>? screenshots)
    {
        var description = rawDescription?.Trim() ?? "";
        if (description.Length < 10 || description.Length > MaxDescriptionLength)
            return BadRequest("Description must be 10–4000 characters.");

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var hourAgo = DateTime.UtcNow.AddHours(-1);
        if (await db.BugReports.CountAsync(r => r.UserId == myId && r.CreatedAt > hourAgo) >= MaxPerHour)
            return StatusCode(StatusCodes.Status429TooManyRequests, "Too many reports, try again later.");

        // Спершу перевіряємо ВСІ файли, щоб не лишати в сховищі половину збереженого.
        screenshots ??= [];
        if (screenshots.Count > MaxScreenshots) return BadRequest($"At most {MaxScreenshots} screenshots.");
        foreach (var file in screenshots)
            if (AudioFiles.ValidateImage(file).Error is { } imageError) return BadRequest(imageError);
        var saved = new List<string>();
        foreach (var file in screenshots)
        {
            var (name, error) = await storage.SaveImageAsync(file);
            if (name is null) return BadRequest(error);
            saved.Add(name);
        }

        var context = rawContext?.Trim();
        var report = new BugReport
        {
            UserId = myId,
            Description = description,
            Context = string.IsNullOrEmpty(context) ? null : context.Length > MaxContextLength ? context[..MaxContextLength] : context,
            Screenshots = [.. saved]
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
            r.CreatedAt.ToString("yyyy-MM-dd HH:mm"), Ref(r.ResolvedBy), r.Screenshots.Length)).ToList());
    }

    // Видалення звіту разом із його скріншотами у сховищі.
    [AdminOnly]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var report = await db.BugReports.FindAsync(id);
        if (report is null) return NotFound();
        var files = report.Screenshots;
        db.BugReports.Remove(report);
        await db.SaveChangesAsync();
        foreach (var file in files) await storage.DeleteAsync(file);
        await hub.Clients.Group(MusicHub.AdminsGroup).SendAsync("bugReportsChanged");
        return NoContent();
    }

    [AdminOnly]
    [HttpGet("{id:int}/screenshots/{index:int}")]
    public async Task<IActionResult> GetScreenshot(int id, int index)
    {
        var report = await db.BugReports.FindAsync(id);
        if (report is null || index < 0 || index >= report.Screenshots.Length) return NotFound();
        return this.ToResult(await storage.OpenAsync(report.Screenshots[index]));
    }

    // Для мобільного застосунку: пряме (підписане) посилання на R2 замість редиректу —
    // нативний <Image> тоді тягне картинку без куки сесії. Локальне сховище
    // (розробка) редиректу не має — віддаємо шлях до ендпоінта вище.
    [AdminOnly]
    [HttpGet("{id:int}/screenshots/{index:int}/link")]
    public async Task<IActionResult> GetScreenshotLink(int id, int index)
    {
        var report = await db.BugReports.FindAsync(id);
        if (report is null || index < 0 || index >= report.Screenshots.Length) return NotFound();
        var source = await storage.OpenAsync(report.Screenshots[index]);
        if (source is null) return NotFound();
        return Ok(new { url = source.RedirectUrl ?? $"/api/bug-reports/{id}/screenshots/{index}" });
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
