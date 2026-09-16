using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("history")]
public class HistoryController(MusicDbContext db) : ControllerBase
{
    // Фронтенд викликає це, коли пісня "прослухана" (перевірка на клієнті).
    // Захист від накрутки: один користувач рахується раз на пісню назавжди
    // (унікальний індекс (user_email, music_id) в БД) + rate limiter (Program.cs).
    [HttpPost]
    public async Task<IActionResult> Log([FromBody] Models.LogListenDto dto)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var alreadyLogged = await db.ListeningHistory
            .AnyAsync(h => h.UserEmail == email && h.MusicId == dto.MusicId);
        if (alreadyLogged) return Ok();

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
}
