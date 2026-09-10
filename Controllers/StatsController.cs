using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatsController(MusicDbContext db, MusicService musicService) : ControllerBase
{
    [HttpGet]
    public async Task<object> Get()
    {
        var totalSongs = await db.Songs.CountAsync();
        var totalGenres = await db.MusicGenres.Select(mg => mg.GenreId).Distinct().CountAsync();
        var totalAlbums = await db.Albums.CountAsync();
        var singles = await db.Songs
            .CountAsync(m => m.AlbumIds == null || m.AlbumIds.Length == 0);

        return new { totalSongs, totalGenres, totalAlbums, singles };
    }

    // Топ-N найпрослуханіших пісень — за кількістю унікальних слухачів
    // (кожен користувач рахується один раз на пісню, див. HistoryController).
    [HttpGet("top-songs")]
    public async Task<IEnumerable<Models.SongDto>> GetTopSongs([FromQuery] int limit = 100)
    {
        var topIds = await db.ListeningHistory
            .GroupBy(h => h.MusicId)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .Take(limit)
            .ToListAsync();

        var dtos = await musicService.GetSongDtosByIdsAsync(topIds);
        return dtos.OrderByDescending(d => d.PlayCount).ToList();
    }
}