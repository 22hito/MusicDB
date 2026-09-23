using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatsController(MusicDbContext db, MusicService musicService, CatalogCache catalogCache) : ControllerBase
{
    // source — яка головна таблиця: "catalog" (за замовчуванням) або "community".
    [HttpGet]
    public async Task<object> Get([FromQuery] string source = SongSources.Catalog)
    {
        // Чотири COUNT-запити до БД — кешуємо разом зі списком пісень (CatalogCache).
        return await catalogCache.GetOrCreateAsync<object>($"stats:{source}", async () =>
        {
            var songs = db.Songs.Where(m => m.Source == source);
            var totalSongs = await songs.CountAsync();
            var totalGenres = await db.MusicGenres.Where(mg => mg.Music.Source == source).Select(mg => mg.GenreId).Distinct().CountAsync();
            var totalAlbums = await songs
                .Where(m => m.AlbumIds != null && m.AlbumIds.Length > 0)
                .Select(m => m.AlbumIds![0])
                .Distinct()
                .CountAsync();
            var singles = await songs
                .CountAsync(m => m.AlbumIds == null || m.AlbumIds.Length == 0);

            return new { totalSongs, totalGenres, totalAlbums, singles };
        });
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