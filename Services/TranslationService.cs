using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace MusicDB.Api.Services;

// Перекладає жанри на англійську через MyMemory API (без ключа, добовий ліміт).
// Потрібно, щоб неанглійські жанри ("рок") в базі уніфікувались до "rock".
public class TranslationService(HttpClient http)
{
    private static readonly Regex NonLatinRegex = new(@"[^\x00-\x7F]", RegexOptions.Compiled);
    // MyMemory інколи додає "music"/"genre" для неоднозначних слів (напр. "рок"
    // → "rock music", бо "рок" ще й "доля"). Прибираємо цей суфікс.
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
            // Сервіс недоступний (ліміт/мережа) — лишаємо оригінальний текст.
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
