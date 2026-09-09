using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;

namespace MusicDB.Api.Services;

public class MusicService(MusicDbContext db, GenreNormalizationService genreNormalizer)
{
    // Знаходить або створює жанри за іменами, повертає їх id.
    // Спершу жанр перевіряється через ШІ (GenreNormalizationService) —
    // чи не є він уже наявним жанром, написаним по-іншому (без пробілу,
    // з дефісом, іншим регістром тощо). Це замінило просте порівняння
    // рядків, щоб гарантовано уникати дублікатів типу "hardrock"/"hard rock".
    public async Task<List<int>> ResolveGenresAsync(IEnumerable<string> names)
    {
        var allExisting = await db.Genres.Select(g => g.GenreName).ToListAsync();
        var ids = new List<int>();

        foreach (var raw in names)
        {
            var name = raw.Trim();
            if (string.IsNullOrEmpty(name)) continue;

            var normalized = await genreNormalizer.NormalizeGenreAsync(name, allExisting);

            var genre = await db.Genres.FirstOrDefaultAsync(g => g.GenreName.Trim().ToLower() == normalized.ToLower())
                        ?? db.Genres.Local.FirstOrDefault(g => g.GenreName.Trim().ToLower() == normalized.ToLower());

            if (genre is null)
            {
                genre = new Genre { GenreName = normalized };
                db.Genres.Add(genre);
                await db.SaveChangesAsync();
                // Додаємо в локальний список, щоб наступні жанри з цього ж запиту
                // теж бачили щойно створений (наприклад, дві близькі назви поспіль).
                allExisting.Add(normalized);
            }
            ids.Add(genre.Id);
        }

        // Якщо в одному запиті передали кілька варіантів написання того самого
        // жанру, вони resolve-яться в один і той самий id. Без Distinct() це
        // призводило б до спроби вставити в music_genre два рядки з однаковим
        // (music_id, genre_id) і падіння запиту через порушення первинного ключа.
        return ids.Distinct().ToList();
    }

    // Знаходить або створює альбом за назвою, повертає його id
    public async Task<int?> ResolveAlbumAsync(string? albumTitle)
    {
        if (string.IsNullOrWhiteSpace(albumTitle)) return null;

        var name = albumTitle.Trim();
        var album = await db.Albums.FirstOrDefaultAsync(a => a.Name == name);
        if (album is null)
        {
            album = new Album { Name = name };
            db.Albums.Add(album);
            await db.SaveChangesAsync();
        }
        return album.Id;
    }

    // Перетворює список id пісень у SongDto (з жанрами й назвою альбому).
    // Використовується улюбленими, плейлистами й рекомендаціями, щоб не
    // дублювати логіку "склеювання" пісня + жанри + альбом у кожному контролері.
    public async Task<List<SongDto>> GetSongDtosByIdsAsync(IEnumerable<int> ids)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return [];

        var songs = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .Where(m => idList.Contains(m.Id))
            .ToListAsync();

        var albumIds = songs
            .Where(m => m.AlbumIds is { Length: > 0 })
            .Select(m => m.AlbumIds![0])
            .Distinct()
            .ToList();

        var albums = albumIds.Count > 0
            ? await db.Albums.Where(a => albumIds.Contains(a.Id)).ToDictionaryAsync(a => a.Id, a => a.Name)
            : new Dictionary<int, string>();

        return songs.Select(m =>
        {
            var genres = m.MusicGenres.Select(mg => mg.Genre.GenreName.Trim()).ToArray();
            var albumName = m.AlbumIds is { Length: > 0 } && albums.TryGetValue(m.AlbumIds[0], out var n) ? n : null;
            return new SongDto(m.Id, m.Artist, m.Title,
                m.Release.ToString("yyyy-MM-dd"),
                m.Duration.ToString(@"hh\:mm\:ss"),
                genres, albumName);
        }).ToList();
    }
}
