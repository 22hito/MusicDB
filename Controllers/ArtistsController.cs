using System.Security.Claims;
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
public class ArtistsController(MusicDbContext db, MusicService musicService, UserDirectoryService userDirectory, IAudioStorage storage,
    CatalogCache catalogCache) : ControllerBase
{
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? "";
    private bool IsAuthenticated => User.Identity?.IsAuthenticated ?? false;

    // Лише читання (і кеш у пам'яті) — не INSERT … ON CONFLICT DO UPDATE на кожен запит, як було.
    private Task<int> CurrentUserIdAsync() => userDirectory.GetCurrentUserIdAsync(User);

    // Імена різними абетками (латиниця, кирилиця) — в одному природному порядку, без огляду на регістр.
    private static readonly StringComparer NameOrder = StringComparer.Create(new System.Globalization.CultureInfo("uk-UA"), ignoreCase: true);

    // Каталог виконавців — публічний, як і сам список пісень. Увесь (їх тисячі, а не сотні — інакше сортування
    // за алфавітом показувало б лише перших за кількістю пісень); клієнт малює порціями.
    // sort: songs (типово) | name | name_desc | plays (унікальні слухачі пісень) | followers | new (нові в каталозі).
    // Лічильники — трьома згрупованими запитами (а не підзапитом на кожного з тисяч виконавців,
    // що сканував усю історію прослуховувань для кожного), і в кеші: пошук і сортування — у пам'яті.
    private sealed record ArtistRow(int Id, string Name, string? ImageUrl, DateTime CreatedAt, int SongCount, int Followers, int Plays);

    private Task<List<ArtistRow>> ArtistRowsAsync() => catalogCache.GetOrRefreshAsync("artists-all", async sp =>
    {
        var ctx = sp.GetRequiredService<MusicDbContext>(); // свій scope — див. CatalogCache.GetOrRefreshAsync
        var songCounts = await ctx.MusicArtists.GroupBy(ma => ma.ArtistId)
            .Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count);
        var followers = await ctx.ArtistFollows.GroupBy(f => f.ArtistId)
            .Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count);
        var plays = await (
            from h in ctx.ListeningHistory
            join ma in ctx.MusicArtists on h.MusicId equals ma.MusicId
            group h by ma.ArtistId into g
            select new { g.Key, Count = g.Count() }
        ).ToDictionaryAsync(x => x.Key, x => x.Count);
        var artists = await ctx.Artists.AsNoTracking()
            .Select(a => new { a.Id, a.Name, a.ImageUrl, a.CreatedAt }).ToListAsync();
        return artists
            .Where(a => songCounts.ContainsKey(a.Id))
            .Select(a => new ArtistRow(a.Id, a.Name, a.ImageUrl, a.CreatedAt, songCounts[a.Id],
                followers.GetValueOrDefault(a.Id), plays.GetValueOrDefault(a.Id)))
            .ToList();
    }, TimeSpan.FromMinutes(2));

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<List<ArtistSummaryDto>>> GetAll([FromQuery] string? q, [FromQuery] string? sort)
    {
        IEnumerable<ArtistRow> artists = await ArtistRowsAsync();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim();
            artists = artists.Where(a => a.Name.Contains(needle, StringComparison.OrdinalIgnoreCase));
        }

        var ordered = (sort ?? "").ToLowerInvariant() switch
        {
            "name" => artists.OrderBy(a => a.Name, NameOrder),
            "name_desc" => artists.OrderByDescending(a => a.Name, NameOrder),
            "plays" => artists.OrderByDescending(a => a.Plays).ThenByDescending(a => a.SongCount).ThenBy(a => a.Name, NameOrder),
            "followers" => artists.OrderByDescending(a => a.Followers).ThenByDescending(a => a.Plays).ThenBy(a => a.Name, NameOrder),
            "new" => artists.OrderByDescending(a => a.CreatedAt).ThenBy(a => a.Name, NameOrder),
            _ => artists.OrderByDescending(a => a.SongCount).ThenBy(a => a.Name, NameOrder),
        };
        return Ok(ordered.Select(a => new ArtistSummaryDto(a.Id, a.Name, a.SongCount, ImageLink(a.Id, a.ImageUrl), a.Followers, a.Plays)).ToList());
    }

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ArtistDetailDto>> GetById(int id)
    {
        // Один запит до бази замість чотирьох послідовних (виконавець, кількість пісень, підписники, чи стежу я).
        int? userId = IsAuthenticated ? await CurrentUserIdAsync() : null;
        var row = await db.Artists.AsNoTracking().Where(a => a.Id == id).Select(a => new
        {
            a.Id, a.Name, a.Bio, a.BioEn, a.ImageUrl,
            Songs = db.MusicArtists.Count(ma => ma.ArtistId == id),
            Followers = db.ArtistFollows.Count(f => f.ArtistId == id),
            Following = userId != null && db.ArtistFollows.Any(f => f.ArtistId == id && f.UserId == userId),
        }).FirstOrDefaultAsync();
        if (row is null) return NotFound();

        return Ok(new ArtistDetailDto(row.Id, row.Name, row.Bio, ImageLink(row.Id, row.ImageUrl), row.Songs, row.Followers, row.Following, row.BioEn));
    }

    // Фото виконавця лежить у сховищі файлів (R2), у БД — лише ім'я файлу.
    // Назовні — адреса нашого ендпоінта з версією, щоб нове фото не бралось із кешу.
    internal static string? ImageLink(int id, string? file) =>
        AudioFiles.IsSafeName(file) ? $"/api/artists/{id}/image?v={Path.GetFileNameWithoutExtension(file)![^8..]}" : null;

    [AllowAnonymous]
    [HttpGet("{id:int}/image")]
    public async Task<IActionResult> GetImage(int id)
    {
        var artist = await db.Artists.FindAsync(id);
        return this.ToResult(artist is null ? null : await storage.OpenAsync(artist.ImageUrl));
    }

    // Опис виконавця — адмін.
    [Authorize, AdminOnly]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ArtistDetailDto>> Update(int id, [FromBody] UpdateArtistDto dto)
    {
        var artist = await db.Artists.FindAsync(id);
        if (artist is null) return NotFound();
        var bio = dto.Bio?.Trim();
        var bioEn = dto.BioEn?.Trim();
        if (bio is { Length: > 5000 } || bioEn is { Length: > 5000 }) return BadRequest("Bio is too long.");
        artist.Bio = string.IsNullOrEmpty(bio) ? null : bio;
        if (bioEn is not null) artist.BioEn = bioEn.Length == 0 ? null : bioEn;
        await db.SaveChangesAsync();
        return await GetById(id);
    }

    // Фото виконавця (multipart, поле image) — адмін. Старий файл прибираємо зі сховища.
    [Authorize, AdminOnly]
    [HttpPut("{id:int}/image")]
    [RequestSizeLimit(AudioFiles.MaxImageBytes + 1024 * 1024)]
    public async Task<ActionResult<ArtistDetailDto>> SetImage(int id, IFormFile image)
    {
        var artist = await db.Artists.FindAsync(id);
        if (artist is null) return NotFound();
        var (name, error) = await storage.SaveImageAsync(image);
        if (name is null) return BadRequest(error);
        var old = artist.ImageUrl;
        artist.ImageUrl = name;
        await db.SaveChangesAsync();
        await storage.DeleteAsync(old);
        catalogCache.Remove("artists-all");
        return await GetById(id);
    }

    [Authorize, AdminOnly]
    [HttpDelete("{id:int}/image")]
    public async Task<ActionResult<ArtistDetailDto>> DeleteImage(int id)
    {
        var artist = await db.Artists.FindAsync(id);
        if (artist is null) return NotFound();
        var old = artist.ImageUrl;
        artist.ImageUrl = null;
        await db.SaveChangesAsync();
        await storage.DeleteAsync(old);
        catalogCache.Remove("artists-all");
        return await GetById(id);
    }

    // Схожі виконавці: за спільними жанрами пісень (Жаккар), найближчі 8.
    [AllowAnonymous]
    [HttpGet("{id:int}/similar")]
    public async Task<ActionResult<List<SimilarArtistDto>>> GetSimilar(int id)
    {
        // Жанри всіх виконавців — десятки тисяч зв'язків на великому каталозі; збираємо раз на 10 хв
        // (зміни каталогу скидають кеш), а не на кожне відкриття сторінки виконавця.
        var genresByArtist = await catalogCache.GetOrCreateAsync("artist-genres", async () =>
        {
            var rows = await (
                from ma in db.MusicArtists
                join mg in db.MusicGenres on ma.MusicId equals mg.MusicId
                select new { ma.ArtistId, Genre = mg.Genre.GenreName }
            ).ToListAsync();
            return rows
                .GroupBy(r => r.ArtistId)
                .ToDictionary(g => g.Key, g => g.Select(r => GenreNames.Key(r.Genre)).ToHashSet());
        }, TimeSpan.FromMinutes(10));
        if (!genresByArtist.TryGetValue(id, out var mine) || mine.Count == 0) return Ok(new List<SimilarArtistDto>());

        var scored = genresByArtist
            .Where(kv => kv.Key != id)
            .Select(kv =>
            {
                var inter = kv.Value.Count(mine.Contains);
                return (Id: kv.Key, Score: inter == 0 ? 0 : (double)inter / (mine.Count + kv.Value.Count - inter));
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(8)
            .ToList();
        var ids = scored.Select(x => x.Id).ToList();
        var artists = await db.Artists.Where(a => ids.Contains(a.Id))
            .Select(a => new { a.Id, a.Name, a.ImageUrl, SongCount = a.MusicArtists.Count })
            .ToDictionaryAsync(a => a.Id);
        return Ok(scored
            .Where(x => artists.ContainsKey(x.Id))
            .Select(x =>
            {
                var a = artists[x.Id];
                return new SimilarArtistDto(a.Id, a.Name, ImageLink(a.Id, a.ImageUrl), a.SongCount, (int)Math.Round(x.Score * 100));
            })
            .ToList());
    }

    // Повна дискографія — включно з колабораціями інших виконавців.
    [AllowAnonymous]
    [HttpGet("{id:int}/songs")]
    public async Task<ActionResult<List<SongDto>>> GetSongs(int id)
    {
        var musicIds = await db.MusicArtists.Where(ma => ma.ArtistId == id).Select(ma => ma.MusicId).ToListAsync();
        return Ok(await musicService.GetSongDtosByIdsAsync(musicIds));
    }

    [Authorize]
    [HttpPost("{id:int}/follow")]
    public async Task<IActionResult> Follow(int id)
    {
        if (!await db.Artists.AnyAsync(a => a.Id == id)) return NotFound();

        var userId = await CurrentUserIdAsync();
        var exists = await db.ArtistFollows.AnyAsync(f => f.ArtistId == id && f.UserId == userId);
        if (!exists)
        {
            db.ArtistFollows.Add(new ArtistFollow { ArtistId = id, UserId = userId });
            await db.SaveChangesAsync();
            catalogCache.Remove("artists-all");
        }
        return Ok();
    }

    [Authorize]
    [HttpDelete("{id:int}/follow")]
    public async Task<IActionResult> Unfollow(int id)
    {
        var userId = await CurrentUserIdAsync();
        var follow = await db.ArtistFollows.FirstOrDefaultAsync(f => f.ArtistId == id && f.UserId == userId);
        if (follow is not null)
        {
            db.ArtistFollows.Remove(follow);
            await db.SaveChangesAsync();
            catalogCache.Remove("artists-all");
        }
        return NoContent();
    }
}
