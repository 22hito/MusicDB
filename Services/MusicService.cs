using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;

namespace MusicDB.Api.Services;

public class MusicService(MusicDbContext db, GenreNormalizationService genreNormalizer)
{
    // Знаходить або створює жанри за іменами, повертає їх id. Усі жанри одного
    // виклику нормалізуються ОДНИМ запитом до Gemini — не палить ліміт на кожен окремо.
    public async Task<List<int>> ResolveGenresAsync(IEnumerable<string> names)
    {
        // iTunes віддає жанри одним рядком через "/" (напр. "Hip-Hop/Rap"),
        // тож розбиваємо і по "/", і по ",".
        var flatNames = names
            .SelectMany(raw => raw.Split(['/', ','], StringSplitOptions.RemoveEmptyEntries))
            .Select(n => n.Trim())
            .Where(n => n.Length > 0)
            .ToList();

        if (flatNames.Count == 0) return [];

        var allExisting = await db.Genres.Select(g => g.GenreName).ToListAsync();
        var normalizedNames = await genreNormalizer.NormalizeGenresBatchAsync(flatNames, allExisting);
        var ids = new List<int>();

        foreach (var normalized in normalizedNames)
        {
            var genre = await db.Genres.FirstOrDefaultAsync(g => g.GenreName.Trim().ToLower() == normalized.ToLower())
                        ?? db.Genres.Local.FirstOrDefault(g => g.GenreName.Trim().ToLower() == normalized.ToLower());

            if (genre is null)
            {
                genre = new Genre { GenreName = normalized };
                db.Genres.Add(genre);
                await db.SaveChangesAsync();
                // Додаємо в локальний список, щоб наступні жанри цього ж запиту теж його бачили.
                allExisting.Add(normalized);
            }
            ids.Add(genre.Id);
        }

        // Кілька варіантів написання того самого жанру resolve-яться в один id —
        // без Distinct() це дало б дублікат (music_id, genre_id) і порушення PK.
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

    // Перетворює id пісень у SongDto (жанри + альбом). Спільна логіка для
    // улюблених, плейлистів і рекомендацій — щоб не дублювати в контролерах.
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

        var playCounts = await GetPlayCountsAsync(idList);
        var artistsBySong = await GetSongArtistsAsync(idList);

        return songs.Select(m =>
        {
            var genres = m.MusicGenres.Select(mg => mg.Genre.GenreName.Trim()).ToArray();
            var albumName = m.AlbumIds is { Length: > 0 } && albums.TryGetValue(m.AlbumIds[0], out var n) ? n : null;
            return new SongDto(m.Id, m.Artist, m.Title,
                m.Release.ToString("yyyy-MM-dd"),
                m.Duration.ToString(@"hh\:mm\:ss"),
                genres, albumName, playCounts.GetValueOrDefault(m.Id, 0), m.YoutubeVideoId,
                artistsBySong.GetValueOrDefault(m.Id));
        }).ToList();
    }

    // Кількість унікальних слухачів на пісню (1 запис в listening_history = 1
    // слухач, дублікати не пишуться — див. HistoryController). Спільний метод,
    // щоб SongsController/StatsController рахували однаково.
    public async Task<Dictionary<int, int>> GetPlayCountsAsync(IEnumerable<int> musicIds)
    {
        var idList = musicIds.Distinct().ToList();
        if (idList.Count == 0) return new Dictionary<int, int>();

        return await db.ListeningHistory
            .Where(h => idList.Contains(h.MusicId))
            .GroupBy(h => h.MusicId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);
    }

    // Розбиває "Artist" (напр. "A, B") на окремих виконавців, знаходить-або-створює
    // кожного в lab.artists. Без ШІ — лише split+trim, злиття через normalized_name.
    public async Task<List<int>> ResolveArtistsAsync(string rawArtistField)
    {
        var names = rawArtistField
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(n => n.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var ids = new List<int>();
        foreach (var name in names)
        {
            var normalized = name.ToLowerInvariant();
            var artist = await db.Artists.FirstOrDefaultAsync(a => a.NormalizedName == normalized)
                         ?? db.Artists.Local.FirstOrDefault(a => a.NormalizedName == normalized);

            if (artist is null)
            {
                artist = new Artist { Name = name, NormalizedName = normalized };
                db.Artists.Add(artist);
                try
                {
                    await db.SaveChangesAsync();
                }
                catch (DbUpdateException) // гонка: хтось інший щойно створив того ж артиста
                {
                    db.Entry(artist).State = EntityState.Detached;
                    artist = await db.Artists.FirstAsync(a => a.NormalizedName == normalized);
                }
            }
            ids.Add(artist.Id);
        }
        return ids.Distinct().ToList();
    }

    // Повністю замінює набір зв'язків music_artists для пісні (той самий
    // патерн replace-all, що й MusicGenres при редагуванні пісні).
    public async Task SyncMusicArtistsAsync(int musicId, List<int> artistIds)
    {
        var current = await db.MusicArtists.Where(ma => ma.MusicId == musicId).ToListAsync();
        db.MusicArtists.RemoveRange(current);
        for (var i = 0; i < artistIds.Count; i++)
            db.MusicArtists.Add(new MusicArtist { MusicId = musicId, ArtistId = artistIds[i], Position = (short)i });
        await db.SaveChangesAsync();
    }

    // Батчево підвантажує ArtistRefDto[] для набору пісень (один запит, не N+1) —
    // спільна логіка для GetSongDtosByIdsAsync і SongsController.ToDto.
    public async Task<Dictionary<int, ArtistRefDto[]>> GetSongArtistsAsync(IEnumerable<int> musicIds)
    {
        var idList = musicIds.Distinct().ToList();
        if (idList.Count == 0) return new Dictionary<int, ArtistRefDto[]>();

        var rows = await db.MusicArtists
            .Where(ma => idList.Contains(ma.MusicId))
            .OrderBy(ma => ma.Position)
            .Select(ma => new { ma.MusicId, ma.Artist.Id, ma.Artist.Name })
            .ToListAsync();

        return rows
            .GroupBy(r => r.MusicId)
            .ToDictionary(g => g.Key, g => g.Select(r => new ArtistRefDto(r.Id, r.Name)).ToArray());
    }
}
