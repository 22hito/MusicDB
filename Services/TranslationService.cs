using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace MusicDB.Api.Services;

// Перекладає назви жанрів на англійську через безкоштовний MyMemory API
// (без API-ключа, але з добовим лімітом запитів).
// Використовується, коли користувач у запиті вказав жанр не англійською
// (наприклад "рок"), щоб у базі всі жанри були уніфіковані ("rock").
public class TranslationService(HttpClient http)
{
    private static readonly Regex NonLatinRegex = new(@"[^\x00-\x7F]", RegexOptions.Compiled);
    // MyMemory інколи додає зайве слово "music"/"genre" для однослівних неоднозначних
    // жанрів (наприклад "рок" перекладається як "rock music", бо "рок" ще й "доля/фатум").
    // Прибираємо цей суфікс, якщо без нього лишається непорожній текст.
    private static readonly Regex NoiseSuffixRegex = new(@"\s+(music|genre)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Чи виглядає текст так, ніби він НЕ англійською (містить кириличні/інші не-ASCII символи).
    public static bool NeedsTranslation(string text) =>
        !string.IsNullOrWhiteSpace(text) && NonLatinRegex.IsMatch(text);

    // Повертає переклад англійською, або оригінальний текст, якщо переклад не вдався.
    public async Task<string> TranslateToEnglishAsync(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;
        if (!NeedsTranslation(text)) return text;

        try
        {
            var url = $"https://api.mymemory.translated.net/get?q={Uri.EscapeDataString(text)}&langpair=uk|en";
            var result = await http.GetFromJsonAsync<MyMemoryResponse>(url);
            var translated = result?.ResponseData?.TranslatedText?.Trim();
            if (string.IsNullOrWhiteSpace(translated)) return text;

            var cleaned = NoiseSuffixRegex.Replace(translated, "").Trim();
            if (!string.IsNullOrWhiteSpace(cleaned)) translated = cleaned;

            return translated.ToLowerInvariant();
        }
        catch
        {
            // Якщо сервіс перекладу недоступний (ліміт/помилка мережі) — не валимо запит,
            // просто лишаємо оригінальний текст як є.
            return text;
        }
    }

    private class MyMemoryResponse
    {
        [JsonPropertyName("responseData")]
        public MyMemoryResponseData? ResponseData { get; set; }
    }

    private class MyMemoryResponseData
    {
        [JsonPropertyName("translatedText")]
        public string? TranslatedText { get; set; }
    }
}
