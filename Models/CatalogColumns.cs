using MusicDB.Api.Data;

namespace MusicDB.Api.Models;

// Каталог «стовпчиками» (GET /api/songs?format=cols): замість 18 000 об'єктів з однаковими ключами —
// по масиву на поле, а виконавці, альбоми й жанри — словниками (індекс замість рядка, що повторюється
// тисячі разів). Сирий JSON утричі менший, стиснутий — на чверть, і телефон розбирає його швидше.
// Клієнт відновлює звичайні пісні (сайт — auth.js _decodeCatalog, застосунок — endpoints.ts decodeCatalog).
// Поля, що майже завжди порожні (файл, оцінка, хто додав…), — розрідженими словниками «індекс → значення».
public record CatalogColumns(
    int[] Id,
    string[] Title,
    string[] ArtistDict,
    int[] Artist,                            // індекс у ArtistDict
    int[]?[] ArtistIds,                      // id виконавців, коли імена збігаються з полем Artist
    string[] AlbumDict,
    int[] Album,                             // індекс у AlbumDict, -1 — сингл
    string[] GenreDict,
    int[][] Genres,                          // індекси в GenreDict
    string[] Release,                        // "yyyy-MM-dd"
    int[] Dur,                               // секунди
    int[] Track,                             // номер у альбомі, 0 — немає
    string?[] Yt,
    int[]? Plays,                            // null — без лічильників (plays=0, див. SongsController.GetAll)
    Dictionary<int, ArtistRefDto[]> Artists, // лише де імена не збігаються з полем Artist
    Dictionary<int, string> Source,          // лише не "catalog"
    Dictionary<int, string> Audio,
    Dictionary<int, double> Rating,
    Dictionary<int, int> RatingCount,
    Dictionary<int, UserRefDto> SubmittedBy)
{
    public static CatalogColumns From(IReadOnlyList<SongDto> songs, bool includePlays = true)
    {
        var n = songs.Count;
        var artistDict = new Dictionary<string, int>(StringComparer.Ordinal);
        var albumDict = new Dictionary<string, int>(StringComparer.Ordinal);
        var genreDict = new Dictionary<string, int>(StringComparer.Ordinal);
        int Index(Dictionary<string, int> dict, string key) =>
            dict.TryGetValue(key, out var i) ? i : dict[key] = dict.Count;

        var c = new CatalogColumns(
            new int[n], new string[n], [], new int[n], new int[]?[n], [], new int[n], [], new int[n][], new string[n],
            new int[n], new int[n], new string?[n], includePlays ? new int[n] : null, [], [], [], [], [], []);
        for (var i = 0; i < n; i++)
        {
            var s = songs[i];
            c.Id[i] = s.Id;
            c.Title[i] = s.Title;
            c.Artist[i] = Index(artistDict, s.Artist);
            var names = s.Artist.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (s.Artists is { Length: > 0 } a)
            {
                if (a.Length == names.Length && a.Select(x => x.Name).SequenceEqual(names, StringComparer.Ordinal))
                    c.ArtistIds[i] = a.Select(x => x.Id).ToArray();
                else c.Artists[i] = a;
            }
            c.Album[i] = s.Album is null ? -1 : Index(albumDict, s.Album);
            c.Genres[i] = s.Genres.Select(g => Index(genreDict, g)).ToArray();
            c.Release[i] = s.Release;
            c.Dur[i] = TimeSpan.TryParse(s.Duration, out var d) ? (int)d.TotalSeconds : 0;
            c.Track[i] = s.TrackNumber ?? 0;
            c.Yt[i] = s.YoutubeVideoId;
            if (c.Plays is not null) c.Plays[i] = s.PlayCount;
            if (s.Source != SongSources.Catalog) c.Source[i] = s.Source;
            if (s.AudioUrl is not null) c.Audio[i] = s.AudioUrl;
            if (s.AvgRating is { } r) c.Rating[i] = r;
            if (s.RatingCount > 0) c.RatingCount[i] = s.RatingCount;
            if (s.SubmittedBy is not null) c.SubmittedBy[i] = s.SubmittedBy;
        }
        return c with
        {
            ArtistDict = [.. artistDict.OrderBy(kv => kv.Value).Select(kv => kv.Key)],
            AlbumDict = [.. albumDict.OrderBy(kv => kv.Value).Select(kv => kv.Key)],
            GenreDict = [.. genreDict.OrderBy(kv => kv.Value).Select(kv => kv.Key)],
        };
    }
}
