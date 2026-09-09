using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicDB.Api.Data;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HistoryController(MusicDbContext db) : ControllerBase
{
    // Фронтенд викликає це, коли пісня "прослухана" (програло принаймні
    // 20 секунд або більше половини тривалості — перевірка на клієнті).
    [HttpPost]
    public async Task<IActionResult> Log([FromBody] Models.LogListenDto dto)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
        db.ListeningHistory.Add(new ListeningHistory { UserEmail = email, MusicId = dto.MusicId });
        await db.SaveChangesAsync();
        return Ok();
    }
}
