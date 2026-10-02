using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("history")]
public class HistoryController(MusicDbContext db, MusicService musicService) : ControllerBase
{
    // Фронтенд викликає це, коли пісня "прослухана" (перевірка на клієнті).
    // Захист від накрутки: один користувач рахується раз на пісню назавжди
    // (унікальний індекс (user_email, music_id) в БД) + rate limiter (Program.cs).
    // Повторне прослуховування лише оновлює час — для "Нещодавно прослуханих"
    // (лічильник слухачів від цього не змінюється).
    [HttpPost]
    public async Task<IActionResult> Log([FromBody] LogListenDto dto)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var existing = await db.ListeningHistory
            .FirstOrDefaultAsync(h => h.UserEmail == email && h.MusicId == dto.MusicId);
        if (existing is not null)
        {
            existing.ListenedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Ok();
        }

        db.ListeningHistory.Add(new ListeningHistory { UserEmail = email, MusicId = dto.MusicId });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Паралельний запит вже встиг зарахувати те саме — ігноруємо.
        }
        return Ok();
    }

    // Нещодавно прослухані (черга плеєра, профіль) — новіші першими. offset — для довантаження
    // наступної сторінки в повному списку історії (профіль): прослуханих бувають сотні.
    [HttpGet]
    [DisableRateLimiting]
    public async Task<ActionResult<List<HistoryItemDto>>> Recent([FromQuery] int limit = 30, [FromQuery] int offset = 0)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var rows = await db.ListeningHistory
            .Where(h => h.UserEmail == email)
            .OrderByDescending(h => h.ListenedAt)
            .ThenByDescending(h => h.MusicId)
            .Skip(Math.Max(0, offset))
            .Take(Math.Clamp(limit, 1, 100))
            .Select(h => new { h.MusicId, h.ListenedAt })
            .ToListAsync();

        // Пісні, яких уже немає в каталозі, просто пропускаємо.
        var songs = (await musicService.GetSongDtosByIdsAsync(rows.Select(r => r.MusicId))).ToDictionary(s => s.Id);
        return Ok(rows
            .Where(r => songs.ContainsKey(r.MusicId))
            .Select(r => new HistoryItemDto(songs[r.MusicId], DateTime.SpecifyKind(r.ListenedAt, DateTimeKind.Utc)))
            .ToList());
    }
}
