using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MusicDB.Api.Services;

// Нормалізує написання жанру через Gemini, щоб уникнути дублів типу
// "hardrock" / "hard rock" / "Hard-Rock".
//
// Ключ — appsettings.json → Gemini:ApiKey, безкоштовно на
// https://aistudio.google.com/apikey. Без ключа чи при недоступності
// сервісу повертається оригінальний текст без змін.
public class GenreNormalizationService(HttpClient http, IConfiguration config, ILogger<GenreNormalizationService> logger)
{
    // Gemini інколи повертає 503 (тимчасове перевантаження) — ретраїмо з паузою.
    internal static async Task<HttpResponseMessage> PostWithRetryAsync(HttpClient http, string url, object body, int maxAttempts = 3)
    {
        HttpResponseMessage? response = null;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            response = await http.PostAsJsonAsync(url, body);
            if (response.StatusCode != System.Net.HttpStatusCode.ServiceUnavailable) break;
            if (attempt < maxAttempts) await Task.Delay(TimeSpan.FromSeconds(1.5 * attempt));
        }
        return response!;
    }


    // Збагачує весь список результатів пошуку точнішими жанрами одним
    // запитом до ШІ (а не окремим на кожен елемент, щоб не палити ліміт).
    // Якщо ШІ недоступний — елементи лишаються з тим жанром, що вже був.
    public async Task<List<ExternalSongResult>> EnrichGenresBatchAsync(List<ExternalSongResult> items, IEnumerable<string> existingGenres)
    {
        var apiKey = config["Gemini:ApiKey"];
        var modelName = config["Gemini:Model"] ?? "gemini-3.6-flash";
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogWarning("EnrichGenresBatchAsync: ключ Gemini не налаштований, жанри лишаються незбагаченими.");
            return items;
        }
        if (items.Count == 0) return items;

        var existingList = string.Join(", ", existingGenres.Select(g => g.Trim()).Distinct());
        var songsList = string.Join("\n", items.Select((it, i) => $"{i}: {it.Artist} - {it.Title} [{it.Genre ?? ""}]"));

        var prompt = $$"""
            Ти — асистент з визначення музичних жанрів для бази даних пісень.
            Ось список пісень (індекс: виконавець - назва [орієнтовний жанр
            із зовнішнього джерела, може бути неповним або відсутнім]):
            {{songsList}}

            Жанри, які вже є в базі (пріоритетно використовуй саме їх, якщо
            підходять, замість вигадування нових написань того самого жанру):
            [{{existingList}}]

            Для КОЖНОГО індекса зі списку визнач від 2 до 4 найбільш точних
            музичних жанрів, судячи з виконавця, назви та типового стилю
            цього артиста. Використовуй усталені англійські назви жанрів
            маленькими літерами, зі звичайними пробілами (наприклад "hard
            rock", а не "hard-rock" чи "hardrock"). КОЖЕН жанр — окремий
            рядок у масиві genres; НІКОЛИ не об'єднуй кілька жанрів в один
            рядок через слеш ("/") чи кому.

            Відповідь дай СТРОГО у форматі JSON, без жодного іншого тексту:
            {"results": [{"index": 0, "genres": ["rock", "alternative rock"]}]}
            """;

        try
        {
            var response = await PostWithRetryAsync(http,
                $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}",
                new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } },
                    generationConfig = new { temperature = 0.3, responseMimeType = "application/json" }
                }, maxAttempts: 2);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                logger.LogWarning("EnrichGenresBatchAsync: Gemini повернув {Status}: {Body}", response.StatusCode, Truncate(errorBody, 500));
                return items;
            }

            var rawJson = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<GeminiResponse>(rawJson);
            var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(text))
            {
                logger.LogWarning("EnrichGenresBatchAsync: Gemini повернув порожню відповідь. Сира відповідь: {Raw}", Truncate(rawJson, 500));
                return items;
            }

            text = text.Trim().Trim('`').Trim();
            if (text.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                text = text[4..].Trim();

            var parsed = JsonSerializer.Deserialize<BatchGenresResult>(text);
            if (parsed?.Results is null)
            {
                logger.LogWarning("EnrichGenresBatchAsync: не вдалося розпарсити список results. Текст від ШІ: {Text}", Truncate(text, 500));
                return items;
            }

            var byIndex = parsed.Results
                .Where(r => r.Index.HasValue)
                .ToDictionary(r => r.Index!.Value);

            var output = new List<ExternalSongResult>(items.Count);
            for (var i = 0; i < items.Count; i++)
            {
                if (byIndex.TryGetValue(i, out var r) && r.Genres is { Count: > 0 })
                {
                    var cleaned = NormalizeGenreList(r.Genres);
                    output.Add(cleaned.Count > 0 ? items[i] with { Genre = string.Join(", ", cleaned) } : items[i]);
                }
                else
                {
                    logger.LogWarning("EnrichGenresBatchAsync: ШІ не повернув жанри для індекса {Index} ({Artist} - {Title})", i, items[i].Artist, items[i].Title);
                    output.Add(items[i]);
                }
            }
            return output;
        }
        catch (Exception ex)
        {
            // ШІ недоступний/ліміт — лишаємо список без змін, причину логуємо.
            logger.LogWarning(ex, "EnrichGenresBatchAsync: виняток під час звернення до Gemini.");
            return items;
        }
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";

    // Про всяк випадок: розбиваємо, якщо ШІ все ж об'єднав жанри через "/"/","
    // попри заборону в промпті.
    private static List<string> NormalizeGenreList(List<string> raw) =>
        raw.SelectMany(g => g.Split(['/', ','], StringSplitOptions.RemoveEmptyEntries))
           .Select(g => g.Trim().ToLowerInvariant())
           .Where(g => g.Length > 0)
           .Distinct()
           .ToList();

    private class BatchGenresResult
    {
        [JsonPropertyName("results")]
        public List<BatchGenreItem>? Results { get; set; }
    }

    private class BatchGenreItem
    {
        [JsonPropertyName("index")]
        public int? Index { get; set; }

        [JsonPropertyName("genres")]
        public List<string>? Genres { get; set; }
    }

    // Сканує всі жанри одним запитом до ШІ, знаходить групи дублікатів
    // (той самий жанр, написаний по-різному) — для адмінського прибирання.
    //
    // На відміну від NormalizeGenreAsync (мовчазний fallback), тут помилка
    // повертається явно — адмін має бачити, чи дублікатів справді немає,
    // чи ШІ просто не відповів.
    public async Task<GenreDuplicateScanResult> FindDuplicateGroupsAsync(List<string> allGenres)
    {
        var apiKey = config["Gemini:ApiKey"];
        var modelName = config["Gemini:Model"] ?? "gemini-3.6-flash";
        if (string.IsNullOrWhiteSpace(apiKey))
            return new GenreDuplicateScanResult(false, "Ключ Gemini не налаштований (appsettings.json → Gemini:ApiKey).", []);

        if (allGenres.Count < 2)
            return new GenreDuplicateScanResult(true, null, []);

        var list = string.Join(", ", allGenres.Select(g => $"\"{g.Trim()}\""));

        var prompt = $$"""
            Ти — асистент нормалізації назв музичних жанрів для бази даних.
            Ось повний список жанрів, що є в базі: [{{list}}]

            Знайди серед них групи, де кілька рядків насправді позначають
            ОДИН І ТОЙ САМИЙ жанр, але написані по-різному (без пробілу,
            з дефісом, іншим регістром, скорочено тощо). Наприклад "hardrock"
            і "hard rock" — один жанр; "Alternative Rock" і "alternative rock" —
            один жанр. Жанри, які просто СХОЖІ, але є різними музичними
            напрямками (наприклад "rock" і "hard rock" як окремі жанри, якщо
            обидва вживаються самостійно) — групувати НЕ треба.

            Для кожної знайденої групи вкажи canonical — правильно
            відформатовану назву (маленькими літерами, зі звичайними
            пробілами, без дефісів), і duplicates — точні рядки з вхідного
            списку, які треба замінити на canonical (без самого canonical,
            якщо він і так у правильному вигляді вже є у списку — тоді просто
            перелічи інші варіанти написання).

            Якщо дублікатів немає — поверни порожній список groups.

            Відповідь дай СТРОГО у форматі JSON, без жодного іншого тексту:
            {"groups": [{"canonical": "...", "duplicates": ["...", "..."]}]}
            """;

        try
        {
            var response = await PostWithRetryAsync(http,
                $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}",
                new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } },
                    generationConfig = new { temperature = 0.0, responseMimeType = "application/json" }
                });

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                return new GenreDuplicateScanResult(false,
                    $"Gemini повернув помилку {(int)response.StatusCode} {response.StatusCode}: {Truncate(errorBody, 400)}", []);
            }

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(text))
                return new GenreDuplicateScanResult(false, "Gemini повернув порожню відповідь.", []);

            text = text.Trim().Trim('`').Trim();
            if (text.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                text = text[4..].Trim();

            var parsed = JsonSerializer.Deserialize<DuplicateGroupsResult>(text);
            var groups = parsed?.Groups?.Where(g => !string.IsNullOrWhiteSpace(g.Canonical) && g.Duplicates?.Count > 0).ToList() ?? [];
            return new GenreDuplicateScanResult(true, null, groups);
        }
        catch (Exception ex)
        {
            return new GenreDuplicateScanResult(false, $"Помилка звернення до Gemini: {ex.Message}", []);
        }
    }

    public async Task<string> NormalizeGenreAsync(string candidate, IEnumerable<string> existingGenres)
    {
        var fallback = candidate.Trim().ToLowerInvariant();
        var apiKey = config["Gemini:ApiKey"];
        var modelName = config["Gemini:Model"] ?? "gemini-3.6-flash";
        if (string.IsNullOrWhiteSpace(apiKey)) return fallback;

        var existingList = string.Join(", ", existingGenres.Select(g => g.Trim()).Distinct());

        var prompt = $$"""
            Ти — асистент нормалізації назв музичних жанрів для бази даних.
            Уже наявні в базі жанри: [{{existingList}}]
            Новий введений жанр: "{{candidate}}"

            Завдання: визнач, чи цей жанр — ТОЙ САМИЙ, що вже є у списку, просто
            написаний по-іншому (без пробілу, з дефісом, іншим регістром,
            скорочено тощо, наприклад "hardrock" і "hard rock" — той самий жанр).

            Якщо так — поверни ТОЧНО ту назву, яка вже є у списку (символ в символ).
            Якщо це дійсно новий жанр — поверни правильно відформатовану англійську
            назву: маленькими літерами, зі звичайними пробілами між словами
            (без дефісів), без зайвих слів на кшталт "music" чи "genre".

            Відповідь дай СТРОГО у форматі JSON, без жодного іншого тексту:
            {"genre": "..."}
            """;

        try
        {
            var response = await PostWithRetryAsync(http,
                $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}",
                new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } },
                    generationConfig = new { temperature = 0.0, responseMimeType = "application/json" }
                }, maxAttempts: 2);

            if (!response.IsSuccessStatusCode) return fallback;

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(text)) return fallback;

            // На випадок, якщо модель загорнула відповідь у ```json ... ``` попри вимогу.
            text = text.Trim().Trim('`').Trim();
            if (text.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                text = text[4..].Trim();

            var parsed = JsonSerializer.Deserialize<GenreResult>(text);
            var genre = parsed?.Genre?.Trim();
            return string.IsNullOrWhiteSpace(genre) ? fallback : genre.ToLowerInvariant();
        }
        catch
        {
            // Ліміт/мережева помилка — працюємо як без ШІ (fallback).
            return fallback;
        }
    }

    private class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<GeminiCandidate>? Candidates { get; set; }
    }

    private class GeminiCandidate
    {
        [JsonPropertyName("content")]
        public GeminiContent? Content { get; set; }
    }

    private class GeminiContent
    {
        [JsonPropertyName("parts")]
        public List<GeminiPart>? Parts { get; set; }
    }

    private class GeminiPart
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    private class GenreResult
    {
        [JsonPropertyName("genre")]
        public string? Genre { get; set; }
    }

    private class DuplicateGroupsResult
    {
        [JsonPropertyName("groups")]
        public List<DuplicateGroup>? Groups { get; set; }
    }
}

public class DuplicateGroup
{
    [JsonPropertyName("canonical")]
    public string? Canonical { get; set; }

    [JsonPropertyName("duplicates")]
    public List<string>? Duplicates { get; set; }
}

// Результат сканування дублікатів: Success + текст помилки, якщо ШІ не відповів
// (щоб адмін бачив причину, а не хибне "дублікатів немає").
public record GenreDuplicateScanResult(bool Success, string? Error, List<DuplicateGroup> Groups);
