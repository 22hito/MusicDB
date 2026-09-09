using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MusicDB.Api.Services;

// Використовує безкоштовний Google Gemini API, щоб перевірити, чи введений
// жанр насправді той самий, що вже є в базі (написаний по-іншому: без
// пробілу, з дефісом, іншим регістром тощо), і повернути єдину канонічну
// форму. Мета — щоб жоден жанр не існував у базі одразу в кількох варіантах
// написання ("hardrock" / "hard rock" / "Hard-Rock").
//
// Ключ береться з appsettings.json -> Gemini:ApiKey. Отримати безкоштовно:
// https://aistudio.google.com/apikey (без прив'язки картки).
// Якщо ключ не вказано, або сервіс недоступний — просто повертається
// оригінальний текст без змін (запит ніколи не валиться через це).
public class GenreNormalizationService(HttpClient http, IConfiguration config, ILogger<GenreNormalizationService> logger)
{
    // Google Gemini інколи повертає 503 (сервери тимчасово перевантажені) —
    // це не помилка коду чи ключа, а тимчасовий стан. Пробуємо ще раз
    // через невелику паузу, перш ніж здаватись.
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


    // Збагачує ВЕСЬ список результатів зовнішнього пошуку (наприклад, з
    // iTunes) кількома точнішими жанрами замість одного загального —
    // ОДНИМ запитом до ШІ на весь список, а не окремим запитом на кожен
    // елемент (щоб не витрачати даремно ліміт запитів). Якщо ШІ недоступний
    // або не налаштований — кожен елемент лишається з тим одним жанром,
    // що вже був (нічого не ламається).
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
            // ШІ недоступний / ліміт — повертаємо оригінальний список без змін,
            // але логуємо причину, щоб можна було розібратись, чому саме.
            logger.LogWarning(ex, "EnrichGenresBatchAsync: виняток під час звернення до Gemini.");
            return items;
        }
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";

    // На випадок, якщо ШІ все ж поєднав кілька жанрів через слеш/кому в
    // одному елементі масиву попри пряму заборону в промпті — розбиваємо
    // додатково, про всяк випадок.
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

    // Сканує ВЕСЬ список жанрів одним запитом до ШІ і знаходить групи
    // дублікатів (той самий жанр, написаний по-різному). Використовується
    // адміном для одноразового прибирання вже наявних у базі дублікатів
    // (наприклад, якщо хтось відредагував жанр напряму в базі даних,
    // оминувши звичайну логіку застосунку, і виникла розбіжність).
    //
    // На відміну від NormalizeGenreAsync (який мовчки повертає fallback,
    // щоб не заважати звичайній роботі сайту), тут помилка повертається
    // явно — це окрема адмінська дія, і людині важливо знати, чи справді
    // дублікатів немає, чи ШІ просто не відповів (наприклад, невірний ключ).
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
            // Ліміт запитів, мережева помилка тощо — не валимо запит користувача,
            // просто працюємо як без ШІ (звичайне точне порівняння з базою).
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

// Результат сканування на дублікати: чи вдалося звернутись до ШІ,
// і якщо ні — текст помилки (щоб адмін бачив ПРИЧИНУ, а не просто
// "дублікатів не знайдено", коли насправді ШІ не відповів).
public record GenreDuplicateScanResult(bool Success, string? Error, List<DuplicateGroup> Groups);
