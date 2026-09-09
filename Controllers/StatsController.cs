using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatsController(MusicDbContext db) : ControllerBase
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
}