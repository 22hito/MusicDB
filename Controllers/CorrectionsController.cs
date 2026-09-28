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

// Запити на правку: будь-який залогінений користувач повідомляє адмінам, що в пісні чи на сторінці виконавця
// щось неправильне/неточне, або надає файл пісні. Адміни розглядають в адмін-панелі (вкладка «Правки»),
// автор бачить стан і відповідь у «Моїх запитах». Самі дані правлять адміни — запит нічого не змінює сам.
[ApiController]
[Route("api/corrections")]
[Authorize]
public class CorrectionsController(
    MusicDbContext db, UserDirectoryService userDirectory, AdminActivityService adminActivity, IHubContext<MusicHub> hub,
    IAudioStorage storage, CatalogCache catalogCache) : ControllerBase
{
    public const int MaxMessageLength = 2000;
    public const int MaxNoteLength = 1000;
    public const int MaxPerHour = 10; // проти флуду

    // multipart/form-data: musicId | artistId, field, message, sourceUrl?, audio? (лише для field=audio)
    [HttpPost]
    [RequestSizeLimit(AudioFiles.MaxRequestBytes)]
    public async Task<IActionResult> Create([FromForm] int? musicId, [FromForm] int? artistId, [FromForm] string? field,
        [FromForm] string? message, [FromForm] string? sourceUrl, IFormFile? audio)
    {
        field = field?.Trim().ToLowerInvariant() ?? "";
        message = message?.Trim() ?? "";
        sourceUrl = sourceUrl?.Trim();
        if ((musicId is null) == (artistId is null)) return BadRequest("Specify either a song or an artist.");

        string label;
        if (musicId is int mid)
        {
            if (!CorrectionFields.Song.Contains(field)) return BadRequest("Unknown field.");
            var song = await db.Songs.Where(m => m.Id == mid).Select(m => new { m.Artist, m.Title }).FirstOrDefaultAsync();
            if (song is null) return NotFound();
            label = $"{song.Artist} — {song.Title}";
        }
        else
        {
            if (!CorrectionFields.Artist.Contains(field)) return BadRequest("Unknown field.");
            var name = await db.Artists.Where(a => a.Id == artistId).Select(a => a.Name).FirstOrDefaultAsync();
            if (name is null) return NotFound();
            label = name;
        }

        // Файл пісні сам по собі і є запитом — опис тоді не обов'язковий; інакше — хоч кілька слів, що не так.
        var withAudio = field == "audio";
        if (withAudio && audio is null) return BadRequest("Attach the audio file.");
        if (!withAudio && audio is not null) return BadRequest("Audio is accepted only for the audio field.");
        if ((!withAudio && message.Length < 5) || message.Length > MaxMessageLength) return BadRequest("Message must be 5–2000 characters.");
        if (!string.IsNullOrEmpty(sourceUrl) &&
            (sourceUrl.Length > 500 || !Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https")))
            return BadRequest("Source must be an http(s) link.");

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var hourAgo = DateTime.UtcNow.AddHours(-1);
        if (await db.CorrectionRequests.CountAsync(r => r.UserId == myId && r.CreatedAt > hourAgo) >= MaxPerHour)
            return StatusCode(StatusCodes.Status429TooManyRequests, "Too many requests, try again later.");

        string? audioFile = null;
        if (audio is not null)
        {
            (audioFile, var error) = await storage.SaveAsync(audio);
            if (audioFile is null) return BadRequest(error);
        }

        var request = new CorrectionRequest
        {
            UserId = myId, MusicId = musicId, ArtistId = artistId, Field = field, Message = message,
            SourceUrl = string.IsNullOrEmpty(sourceUrl) ? null : sourceUrl, TargetLabel = label, AudioFile = audioFile,
        };
        db.CorrectionRequests.Add(request);
        await db.SaveChangesAsync();

        await adminActivity.RecordAsync(myId, AdminActivityService.CorrectionRequested, label, "correction");
        await hub.Clients.Group(MusicHub.AdminsGroup).SendAsync("correctionsChanged");
        return Ok(new { request.Id });
    }

    // Мої запити — стан і відповідь адміна.
    [HttpGet("mine")]
    public async Task<ActionResult<List<CorrectionDto>>> GetMine()
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var list = await db.CorrectionRequests.Where(r => r.UserId == myId).OrderByDescending(r => r.CreatedAt).Take(50).ToListAsync();
        return Ok(await ToDtosAsync(list));
    }

    [AdminOnly]
    [HttpGet]
    public async Task<ActionResult<List<CorrectionDto>>> GetAll([FromQuery] string status = "open")
    {
        var query = db.CorrectionRequests.AsQueryable();
        if (status != "all") query = query.Where(r => r.Status == status);
        return Ok(await ToDtosAsync(await query.OrderByDescending(r => r.CreatedAt).Take(200).ToListAsync()));
    }

    [AdminOnly]
    [HttpGet("open-count")]
    public async Task<ActionResult<int>> GetOpenCount() => Ok(await db.CorrectionRequests.CountAsync(r => r.Status == "open"));

    // Послухати наданий файл перед тим, як прикріпити.
    [AdminOnly]
    [HttpGet("{id:int}/audio")]
    public async Task<IActionResult> GetAudio(int id)
    {
        var file = await db.CorrectionRequests.Where(r => r.Id == id).Select(r => r.AudioFile).FirstOrDefaultAsync();
        return file is null ? NotFound() : this.ToResult(await storage.OpenAsync(file));
    }

    // Пряме посилання (R2) для нативного плеєра застосунку; локальне сховище — шлях до ендпоінта вище.
    [AdminOnly]
    [HttpGet("{id:int}/audio/link")]
    public async Task<IActionResult> GetAudioLink(int id)
    {
        var file = await db.CorrectionRequests.Where(r => r.Id == id).Select(r => r.AudioFile).FirstOrDefaultAsync();
        var source = file is null ? null : await storage.OpenAsync(file);
        return source is null ? NotFound() : Ok(new { url = source.RedirectUrl ?? $"/api/corrections/{id}/audio" });
    }

    // Прикріпити наданий файл до пісні (попередній файл пісні, якщо був, видаляється) і закрити запит.
    [AdminOnly]
    [HttpPost("{id:int}/apply-audio")]
    public async Task<IActionResult> ApplyAudio(int id)
    {
        var request = await db.CorrectionRequests.FindAsync(id);
        if (request?.AudioFile is null || request.MusicId is null) return NotFound();
        var song = await db.Songs.FindAsync(request.MusicId.Value);
        if (song is null) return NotFound();

        var old = song.AudioFile;
        song.AudioFile = request.AudioFile;
        request.AudioFile = null; // файл тепер належить пісні — видалення запиту його не зачепить
        await ResolveAsync(request, "done", request.AdminNote);
        await db.SaveChangesAsync();
        if (old is not null && old != song.AudioFile) await storage.DeleteAsync(old);

        catalogCache.Invalidate();
        await hub.Clients.All.SendAsync("songsChanged");
        await hub.Clients.Group(MusicHub.AdminsGroup).SendAsync("correctionsChanged");
        return Ok();
    }

    // Виконано / відхилено (з відповіддю автору) або повернути у відкриті.
    [AdminOnly]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] ResolveCorrectionDto dto)
    {
        if (dto.Status is not ("open" or "done" or "rejected")) return BadRequest("Status must be open, done or rejected.");
        var note = dto.Note?.Trim();
        if (note?.Length > MaxNoteLength) return BadRequest("Note is too long.");
        var request = await db.CorrectionRequests.FindAsync(id);
        if (request is null) return NotFound();
        await ResolveAsync(request, dto.Status, string.IsNullOrEmpty(note) ? null : note);
        await db.SaveChangesAsync();
        await hub.Clients.Group(MusicHub.AdminsGroup).SendAsync("correctionsChanged");
        return Ok();
    }

    [AdminOnly]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var request = await db.CorrectionRequests.FindAsync(id);
        if (request is null) return NotFound();
        var file = request.AudioFile;
        db.CorrectionRequests.Remove(request);
        await db.SaveChangesAsync();
        await storage.DeleteAsync(file);
        await hub.Clients.Group(MusicHub.AdminsGroup).SendAsync("correctionsChanged");
        return NoContent();
    }

    private async Task ResolveAsync(CorrectionRequest request, string status, string? note)
    {
        request.Status = status;
        request.AdminNote = note;
        var closed = status != "open";
        request.ResolvedAt = closed ? DateTime.UtcNow : null;
        request.ResolvedBy = closed ? await userDirectory.GetCurrentUserIdAsync(User) : null;
    }

    private async Task<List<CorrectionDto>> ToDtosAsync(List<CorrectionRequest> list)
    {
        var cards = await userDirectory.GetUserCardsAsync(
            list.SelectMany(r => new[] { r.UserId, r.ResolvedBy }).Where(id => id.HasValue).Select(id => id!.Value));
        UserRefDto? Ref(int? id) => id is int uid && cards.TryGetValue(uid, out var c) ? c.ToRef() : null;
        return list.Select(r => new CorrectionDto(r.Id, r.Field, r.Message, r.SourceUrl, r.TargetLabel, r.MusicId, r.ArtistId,
            r.AudioFile is not null, r.Status, r.AdminNote, r.CreatedAt.ToString("yyyy-MM-dd HH:mm"), Ref(r.UserId), Ref(r.ResolvedBy))).ToList();
    }
}
