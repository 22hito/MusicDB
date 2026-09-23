using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Hubs;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

// Оцінка пісні 0–100 (тимчасова шкала-заглушка) + необов'язкова рецензія.
// Один рядок на (користувач, пісня); рецензія без оцінки неможлива.
[ApiController]
[Route("api/songs/{musicId:int}/ratings")]
public class RatingsController(MusicDbContext db, UserDirectoryService userDirectory, MusicService musicService, CatalogCache catalogCache, IHubContext<MusicHub> hub) : ControllerBase
{
    public const int MaxReviewLength = 5000;

    [HttpGet]
    public async Task<ActionResult<SongRatingsDto>> Get(int musicId)
    {
        if (!await db.Songs.AnyAsync(m => m.Id == musicId)) return NotFound();

        var ratings = await db.SongRatings
            .Where(r => r.MusicId == musicId)
            .OrderByDescending(r => r.UpdatedAt)
            .ToListAsync();
        var users = await userDirectory.GetUserCardsAsync(ratings.Select(r => r.UserId));

        int? myId = User.Identity?.IsAuthenticated == true ? await userDirectory.GetCurrentUserIdAsync(User) : null;
        var mine = ratings.FirstOrDefault(r => r.UserId == myId);

        return Ok(new SongRatingsDto(
            musicId,
            ratings.Count > 0 ? Math.Round(ratings.Average(r => (double)r.Score), 1) : null,
            ratings.Count,
            mine is null ? null : ToDto(mine, users),
            // У списку рецензій — лише ті, хто щось написав; голі оцінки йдуть у середнє.
            ratings.Where(r => !string.IsNullOrWhiteSpace(r.Review)).Select(r => ToDto(r, users)).ToList()));
    }

    [Authorize]
    [HttpPut]
    public async Task<ActionResult<SongRatingsDto>> Save(int musicId, [FromBody] SaveRatingDto dto)
    {
        if (dto.Score is < 0 or > 100) return BadRequest("Score must be between 0 and 100.");
        var review = string.IsNullOrWhiteSpace(dto.Review) ? null : dto.Review.Trim();
        if (review?.Length > MaxReviewLength) return BadRequest("Review is too long.");
        if (!await db.Songs.AnyAsync(m => m.Id == musicId)) return NotFound();

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var rating = await db.SongRatings.FindAsync(myId, musicId);
        if (rating is null)
        {
            rating = new SongRating { UserId = myId, MusicId = musicId };
            db.SongRatings.Add(rating);
        }
        rating.Score = (short)dto.Score;
        rating.Review = review;
        rating.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await BroadcastSummaryAsync(musicId);
        return await Get(musicId);
    }

    // Власну оцінку прибирає автор; адмін може прибрати чужу (?userId=) — модерація рецензій.
    [Authorize]
    [HttpDelete]
    public async Task<IActionResult> Delete(int musicId, [FromQuery] int? userId)
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var targetId = userId ?? myId;
        if (targetId != myId && !User.HasClaim("role", "admin")) return Forbid();

        var rating = await db.SongRatings.FindAsync(targetId, musicId);
        if (rating is null) return NotFound();
        db.SongRatings.Remove(rating);
        await db.SaveChangesAsync();

        await BroadcastSummaryAsync(musicId);
        return NoContent();
    }

    // Точкове оновлення середнього в таблицях замість повного songsChanged.
    private async Task BroadcastSummaryAsync(int musicId)
    {
        catalogCache.Invalidate();
        var summary = (await musicService.GetRatingSummariesAsync([musicId])).GetValueOrDefault(musicId);
        await hub.Clients.All.SendAsync("ratingChanged", musicId, summary.Avg, summary.Count);
    }

    private static RatingDto ToDto(SongRating r, Dictionary<int, UserDirectoryService.UserCard> users) => new(
        users.TryGetValue(r.UserId, out var card) ? card.ToRef() : new UserRefDto(r.UserId, $"Учасник спільноти #{r.UserId}"),
        r.Score, r.Review, r.UpdatedAt.ToString("yyyy-MM-dd HH:mm"));
}
