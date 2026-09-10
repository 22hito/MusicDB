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
    // Фронтенд викликає це, коли пісня "прослухана" (програло принаймні
    // 20 секунд або більше половини тривалості — перевірка на клієнті).
    //
    // Захист від накрутки лічильника прослуховувань (як у Spotify):
    // 1) один користувач рахується максимум один раз на пісню — назавжди
    //    (перевірка нижче + унікальний індекс (user_email, music_id) в БД —
    //    прибирає й race condition при паралельних запитах);
    // 2) rate limiter на маршруті (див. Program.cs, політика "history") —
    //    відсікає швидкі скриптові запити без реального прослуховування.
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
            // Унікальний індекс в БД — паралельний запит вже встиг зарахувати
            // те саме прослуховування першим, це нормально, просто ігноруємо.
        }
        return Ok();
    }
}
