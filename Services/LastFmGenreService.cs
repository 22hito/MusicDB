using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace MusicDB.Api.Services;

// Last.fm API — безкоштовний, без такого жорсткого ліміту, як у Gemini
// (орієнтовно кілька запитів на секунду замість 20 на хвилину). Основний
// шлях отримання МНОЖИНИ жанрів для пісні: люди самі "тегують" треки
// (краудсорсинг), тож для більшості відомих пісень там є кілька точних
// жанрових тегів, а не один загальний, як у iTunes.
//
// Ключ береться з appsettings.json -> LastFm:ApiKey. Отримати безкоштовно
// (миттєво, без підтвердження): https://www.last.fm/api/account/create
public class LastFmGenreService(HttpClient http, IConfiguration config)
{
    // Last.fm-теги — вільний текст від користувачів, тому серед них багато
    // "сміття", яке жанром не є (настрій, оцінка, факт прослуховування тощо).
    // Відфільтровуємо найпоширеніші такі теги.
    private static readonly HashSet<string> NonGenreTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "seen live", "favorite", "favourite", "favorites", "favourites", "awesome", "love",
        "amazing", "beautiful", "best", "cool", "epic", "guilty pleasure", "sexy",
        "check out", "my music", "own it", "have", "want", "spotify", "youtube", "radio",
        "under 2000 listeners", "great", "good", "nice", "perfect", "classic", "legendary",
        "band", "music", "songs", "song", "artists i love", "male vocalists", "female vocalists",
        "usa", "american", "british", "uk"
    };

    private static readonly Regex StartsWithDigit = new(@"^\d", RegexOptions.Compiled);

    public async Task<List<string>> GetGenreTagsAsync(string artist, string title, int maxTags = 4)
    {
        var apiKey = config["LastFm:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey)) return [];

        try
        {
            var url = "https://ws.audioscrobbler.com/2.0/" +
                       $"?method=track.gettoptags&artist={Uri.EscapeDataString(artist)}" +
                       $"&track={Uri.EscapeDataString(title)}&api_key={apiKey}&format=json";

            var result = await http.GetFromJsonAsync<LastFmTagsResponse>(url);
            var tags = result?.Toptags?.Tag ?? [];

            return tags
                .Select(t => t.Name?.Trim().ToLowerInvariant())
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Where(n => !NonGenreTags.Contains(n!))
                .Where(n => !StartsWithDigit.IsMatch(n!))
                .Where(n => !n!.Equals(artist.Trim(), StringComparison.OrdinalIgnoreCase))
                .Distinct()
                .Take(maxTags)
                .Select(n => n!)
                .ToList();
        }
        catch
        {
            // Last.fm недоступний / артиста чи пісню не знайдено —
            // повертаємо порожній список, викликач сам вирішить, що робити далі.
            return [];
        }
    }

    private class LastFmTagsResponse
    {
        [JsonPropertyName("toptags")]
        public LastFmToptags? Toptags { get; set; }
    }

    private class LastFmToptags
    {
        [JsonPropertyName("tag")]
        public List<LastFmTag>? Tag { get; set; }
    }

    private class LastFmTag
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }
}
