using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Filters;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GenresController(MusicDbContext db, GenreNormalizationService genreNormalizer) : ControllerBase
{
    // GET /api/genres
    [HttpGet]
    public async Task<IEnumerable<GenreDto>> GetAll()
    {
        var genres = await db.Genres.OrderBy(g => g.GenreName).ToListAsync();
        return genres.Select(g => new GenreDto(g.Id, g.GenreName.Trim()));
    }

    // Сканує жанри через ШІ, знаходить дублікати з різним написанням і
    // об'єднує: переносить пісні на канонічний запис, видаляє зайві рядки.
    [Authorize, AdminOnly]
    [HttpPost("normalize")]
    public async Task<ActionResult<NormalizeGenresResultDto>> Normalize()
    {
        var allGenres = await db.Genres.ToListAsync();
        var names = allGenres.Select(g => g.GenreName.Trim()).ToList();

        var scan = await genreNormalizer.FindDuplicateGroupsAsync(names);
        if (!scan.Success)
            return Ok(new NormalizeGenresResultDto(0, [], scan.Error));

        var mergedPairs = new List<string>();

        foreach (var group in scan.Groups)
        {
            if (string.IsNullOrWhiteSpace(group.Canonical) || group.Duplicates is null) continue;

            var canonicalName = group.Canonical.Trim().ToLowerInvariant();
            var canonical = allGenres.FirstOrDefault(g =>
                g.GenreName.Trim().Equals(canonicalName, StringComparison.OrdinalIgnoreCase));

            // Канонічної назви може не бути серед наявних рядків — тоді
            // перейменовуємо перший знайдений дублікат і робимо його базовим.
            if (canonical is null)
            {
                canonical = allGenres.FirstOrDefault(g =>
                    group.Duplicates.Any(d => d.Trim().Equals(g.GenreName.Trim(), StringComparison.OrdinalIgnoreCase)));
                if (canonical is null) continue;
                canonical.GenreName = canonicalName;
            }

            foreach (var dupName in group.Duplicates)
            {
                var duplicate = allGenres.FirstOrDefault(g =>
                    g.Id != canonical.Id && g.GenreName.Trim().Equals(dupName.Trim(), StringComparison.OrdinalIgnoreCase));
                if (duplicate is null) continue;

                var links = await db.MusicGenres.Where(mg => mg.GenreId == duplicate.Id).ToListAsync();
                foreach (var link in links)
                {
                    var alreadyLinked = await db.MusicGenres.AnyAsync(mg =>
                        mg.MusicId == link.MusicId && mg.GenreId == canonical.Id);

                    // GenreId — частина складеного PK music_genre, EF не дає
                    // перепризначити його — видаляємо старий зв'язок і додаємо новий.
                    db.MusicGenres.Remove(link);
                    if (!alreadyLinked)
                        db.MusicGenres.Add(new MusicGenre { MusicId = link.MusicId, GenreId = canonical.Id });
                }

                db.Genres.Remove(duplicate);
                mergedPairs.Add($"{duplicate.GenreName.Trim()} → {canonical.GenreName.Trim()}");
            }
        }

        await db.SaveChangesAsync();
        return Ok(new NormalizeGenresResultDto(mergedPairs.Count, mergedPairs, null));
    }
}
