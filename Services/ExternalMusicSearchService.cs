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

// Пошук пісень у безкоштовному публічному iTunes Search API (без API-ключа)
// для автозаповнення форми запиту користувача — менше вводити вручну.
public class ExternalMusicSearchService(HttpClient http)
{
    // attribute — необов'язкове звуження пошуку iTunes до конкретного поля
    // (artistTerm / songTerm / albumTerm). Без нього iTunes шукає збіги
    // одразу по виконавцю, назві й альбому — тому пошук лише за іменем
    // артиста міг випадково підтягнути чужі пісні, назва яких просто
    // збігається з цим ім'ям. albumTerm, навпаки, дозволяє знайти ВСІ
    // пісні конкретного альбому.
    public async Task<List<ExternalSongResult>> SearchAsync(string query, string? attribute = null, int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            return [];

        try
        {
            var attrPart = string.IsNullOrWhiteSpace(attribute) ? "" : $"&attribute={attribute}";
            // Запитуємо трохи більше, ніж треба — частина відсіється
            // нижче суворим фільтром/ярусами релевантності, тож без
            // запасу могло б лишитись замало результатів.
            var url = $"https://itunes.apple.com/search?term={Uri.EscapeDataString(query)}&entity=song{attrPart}&limit={Math.Min(limit * 3, 200)}";
            var result = await http.GetFromJsonAsync<ITunesResponse>(url);
            if (result?.Results is null) return [];

            var candidates = result.Results
                .Where(r => !string.IsNullOrWhiteSpace(r.ArtistName) && !string.IsNullOrWhiteSpace(r.TrackName))
                .ToList();

            // iTunes attribute=artistTerm/songTerm/albumTerm обмежує, ЯКЕ поле
            // шукати, але сам збіг усередині поля лишається нечітким
            // (токенізованим) — тому фрази типу "falling in reverse" у
            // назві ЧУЖОЇ пісні все ще могли проходити як "збіг" навіть при
            // artistTerm. Тому далі поводимось по-різному залежно від того,
            // яке саме поле шукали:
            IEnumerable<ITunesResult> ordered;
            switch (attribute)
            {
                case "artistTerm":
                    // Виконавець — лише точний збіг, без запасних варіантів.
                    ordered = candidates.Where(r => r.ArtistName!.Contains(query, StringComparison.OrdinalIgnoreCase));
                    break;

                case "songTerm":
                    // Назва — лише збіг по назві; порядок лишаємо як від
                    // iTunes (він і сам ранжує популярніші/релевантніші
                    // треки вище — це найкраще наближення до "популярності",
                    // яке дає безкоштовний Search API).
                    ordered = candidates.Where(r => r.TrackName!.Contains(query, StringComparison.OrdinalIgnoreCase));
                    break;

                case "albumTerm":
                    // Альбом — не жорсткий фільтр, а ярусна релевантність:
                    // спочатку справжні збіги по альбому (точний, потім
                    // частковий), далі — як запасний варіант — пісня з
                    // такою назвою, і насамкінець виконавець з такою
                    // назвою. Усе, що не збігається взагалі ні по чому,
                    // відкидається.
                    ordered = candidates
                        .Select(r => (Item: r, Tier: AlbumRelevanceTier(r, query)))
                        .Where(x => x.Tier is not null)
                        .OrderBy(x => x.Tier)
                        .Select(x => x.Item);
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
            // Якщо зовнішній сервіс недоступний — повертаємо порожній список,
            // користувач просто продовжує заповнювати форму вручну.
            return [];
        }
    }

    // 1 = точний збіг альбому, 2 = альбом містить запит, 3 = запасний
    // варіант — назва пісні містить запит, 4 = останній запасний варіант —
    // ім'я виконавця містить запит, null = не збігається взагалі ні по чому.
    private static int? AlbumRelevanceTier(ITunesResult r, string album)
    {
        if (!string.IsNullOrWhiteSpace(r.CollectionName))
        {
            if (r.CollectionName.Equals(album, StringComparison.OrdinalIgnoreCase)) return 1;
            if (r.CollectionName.Contains(album, StringComparison.OrdinalIgnoreCase)) return 2;
        }
        if (r.TrackName!.Contains(album, StringComparison.OrdinalIgnoreCase)) return 3;
        if (r.ArtistName!.Contains(album, StringComparison.OrdinalIgnoreCase)) return 4;
        return null;
    }

    // iTunes для синглів записує "альбом" як "{Назва пісні} - Single" (або
    // просто саму назву пісні) — це НЕ справжній альбом, і його не можна
    // підставляти в поле "Альбом", інакше в базі з'явиться фейковий альбом
    // з однією піснею замість позначки "Сінгл".
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
        [JsonPropertyName("artistName")] public string? ArtistName { get; set; }
        [JsonPropertyName("trackName")] public string? TrackName { get; set; }
        [JsonPropertyName("collectionName")] public string? CollectionName { get; set; }
        [JsonPropertyName("releaseDate")] public string? ReleaseDate { get; set; }
        [JsonPropertyName("trackTimeMillis")] public long? TrackTimeMillis { get; set; }
        [JsonPropertyName("primaryGenreName")] public string? PrimaryGenreName { get; set; }
    }
}
