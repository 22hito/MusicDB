using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace MusicDB.Api.Services;

public record ExternalSongResult(
    string Artist,
    string Title,
    string? Release,     // "yyyy-MM-dd"
    string? Duration,    // "HH:mm:ss"
    string? Album,
    string? Genre
);

// Пошук пісень у публічному iTunes Search API для автозаповнення форми запиту.
public class ExternalMusicSearchService(HttpClient http)
{
    // attribute звужує пошук до одного поля (artistTerm/songTerm/albumTerm) —
    // збіг усередині нього нечіткий, тому фільтруємо ще раз нижче.
    // artistHint — лише сортує результати albumTerm-пошуку (не звужує запит).
    public async Task<List<ExternalSongResult>> SearchAsync(string query, string? attribute = null, int limit = 30, string? artistHint = null)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            return [];

        try
        {
            var attrPart = string.IsNullOrWhiteSpace(attribute) ? "" : $"&attribute={attribute}";
            // Запитуємо із запасом — частина відсіється фільтром/ярусами нижче.
            var url = $"https://itunes.apple.com/search?term={Uri.EscapeDataString(query)}&entity=song{attrPart}&limit={Math.Min(limit * 3, 200)}";
            var result = await http.GetFromJsonAsync<ITunesResponse>(url);
            if (result?.Results is null) return [];

            var candidates = result.Results
                .Where(r => !string.IsNullOrWhiteSpace(r.ArtistName) && !string.IsNullOrWhiteSpace(r.TrackName))
                .ToList();

            IEnumerable<ITunesResult> ordered;
            switch (attribute)
            {
                case "artistTerm":
                    ordered = candidates.Where(r => FuzzyText.FuzzyContains(r.ArtistName, query));
                    break;

                case "songTerm":
                    ordered = candidates.Where(r => FuzzyText.FuzzyContains(r.TrackName, query));
                    break;

                case "albumTerm":
                    // Ярусна релевантність: точний/частковий збіг альбому, потім назва
                    // пісні, потім виконавець; усередині ярусу — artistHint вище.
                    var tiered = candidates
                        .Select(r => (Item: r, Tier: AlbumRelevanceTier(r, query)))
                        .Where(x => x.Tier is not null)
                        .OrderBy(x => x.Tier)
                        .ThenByDescending(x => !string.IsNullOrWhiteSpace(artistHint)
                            && FuzzyText.FuzzyContains(x.Item.ArtistName, artistHint))
                        .Select(x => x.Item)
                        .ToList();

                    // /search не гарантує повний трек-лист альбому — довантажуємо
                    // найрелевантніші альбоми цілком через /lookup за collectionId.
                    var topCollectionIds = tiered
                        .Where(r => r.CollectionId.HasValue)
                        .Select(r => r.CollectionId!.Value)
                        .Distinct()
                        .Take(4)
                        .ToList();

                    if (topCollectionIds.Count > 0)
                    {
                        var fullAlbums = await Task.WhenAll(topCollectionIds.Select(FetchFullAlbumAsync));
                        var merged = new List<ITunesResult>();
                        foreach (var albumTracks in fullAlbums)
                            merged.AddRange(albumTracks);

                        // Лукап міг не спрацювати — тоді лишаємо часткові результати term-пошуку.
                        var coveredIds = fullAlbums
                            .Where(a => a.Count > 0)
                            .SelectMany(a => a.Select(t => t.CollectionId))
                            .ToHashSet();
                        merged.AddRange(tiered.Where(r => !coveredIds.Contains(r.CollectionId)));

                        ordered = merged;
                    }
                    else
                    {
                        ordered = tiered;
                    }
                    break;

                default:
                    ordered = candidates;
                    break;
            }

            return ordered
                .Take(limit)
                .Select(r => new ExternalSongResult(
                    Artist: r.ArtistName!,
                    Title: r.TrackName!,
                    Release: ParseReleaseDate(r.ReleaseDate),
                    Duration: FormatDuration(r.TrackTimeMillis),
                    Album: NormalizeAlbum(r.CollectionName, r.TrackName),
                    Genre: r.PrimaryGenreName
                ))
                .ToList();
        }
        catch
        {
            return [];
        }
    }

    // Повний трек-лист альбому за collectionId (/lookup, на відміну від /search).
    private async Task<List<ITunesResult>> FetchFullAlbumAsync(long collectionId)
    {
        try
        {
            var url = $"https://itunes.apple.com/lookup?id={collectionId}&entity=song";
            var result = await http.GetFromJsonAsync<ITunesResponse>(url);
            return result?.Results?
                .Where(r => r.WrapperType == "track" && !string.IsNullOrWhiteSpace(r.ArtistName) && !string.IsNullOrWhiteSpace(r.TrackName))
                .OrderBy(r => r.DiscNumber ?? 1)
                .ThenBy(r => r.TrackNumber ?? int.MaxValue)
                .ToList() ?? [];
        }
        catch
        {
            return [];
        }
    }

    // 1=точний збіг альбому, 2=альбом містить запит, 3=назва пісні містить
    // запит, 4=ім'я виконавця містить запит, null=не збіглось нічого.
    private static int? AlbumRelevanceTier(ITunesResult r, string album)
    {
        if (!string.IsNullOrWhiteSpace(r.CollectionName))
        {
            if (FuzzyText.FuzzyEquals(r.CollectionName, album)) return 1;
            if (FuzzyText.FuzzyContains(r.CollectionName, album)) return 2;
        }
        if (FuzzyText.FuzzyContains(r.TrackName, album)) return 3;
        if (FuzzyText.FuzzyContains(r.ArtistName, album)) return 4;
        return null;
    }

    // iTunes для синглів пише "альбом" як "{Назва пісні} - Single" — не справжній альбом.
    private static string? NormalizeAlbum(string? collectionName, string? trackName)
    {
        if (string.IsNullOrWhiteSpace(collectionName)) return null;
        var album = collectionName.Trim();

        if (album.EndsWith(" - Single", StringComparison.OrdinalIgnoreCase)) return null;
        if (!string.IsNullOrWhiteSpace(trackName) && album.Equals(trackName.Trim(), StringComparison.OrdinalIgnoreCase)) return null;

        return album;
    }

    private static string? ParseReleaseDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return DateTime.TryParse(raw, out var dt) ? dt.ToString("yyyy-MM-dd") : null;
    }

    private static string? FormatDuration(long? millis)
    {
        if (!millis.HasValue || millis <= 0) return null;
        var ts = TimeSpan.FromMilliseconds(millis.Value);
        return ts.ToString(@"hh\:mm\:ss");
    }

    private class ITunesResponse
    {
        [JsonPropertyName("results")]
        public List<ITunesResult>? Results { get; set; }
    }

    private class ITunesResult
    {
        [JsonPropertyName("wrapperType")] public string? WrapperType { get; set; }
        [JsonPropertyName("artistName")] public string? ArtistName { get; set; }
        [JsonPropertyName("trackName")] public string? TrackName { get; set; }
        [JsonPropertyName("collectionId")] public long? CollectionId { get; set; }
        [JsonPropertyName("collectionName")] public string? CollectionName { get; set; }
        [JsonPropertyName("releaseDate")] public string? ReleaseDate { get; set; }
        [JsonPropertyName("trackTimeMillis")] public long? TrackTimeMillis { get; set; }
        [JsonPropertyName("primaryGenreName")] public string? PrimaryGenreName { get; set; }
        [JsonPropertyName("discNumber")] public int? DiscNumber { get; set; }
        [JsonPropertyName("trackNumber")] public int? TrackNumber { get; set; }
    }
}
