using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MusicDB.Api.Services;

// Нормалізує написання жанру через Gemini (appsettings.json → Gemini:ApiKey),
// щоб уникнути дублів типу "hardrock" / "hard rock". Без ключа — оригінал без змін.
public class GenreNormalizationService(HttpClient http, IConfiguration config, ILogger<GenreNormalizationService> logger)
{
    // Ретрай на 503 (тимчасове перевантаження Gemini).
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


    // Збагачує весь список результатів пошуку жанрами одним запитом до ШІ
    // (не по одному, щоб не палити ліміт).
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
            logger.LogWarning(ex, "EnrichGenresBatchAsync: виняток під час звернення до Gemini.");
            return items;
        }
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";

    // Розбиває жанри, якщо ШІ все ж об'єднав кілька через "/" чи "," попри промпт.
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

    // Знаходить групи дублікатів жанрів (той самий жанр, написаний по-різному)
    // для адмінського прибирання. Двоступенево: спершу локальний Левенштейн-матч
    // (FuzzyText) для очевидних дублікатів, потім Gemini лише для решти.
    public async Task<GenreDuplicateScanResult> FindDuplicateGroupsAsync(List<string> allGenres)
    {
        var distinct = allGenres.Select(g => g.Trim()).Where(g => g.Length > 0).Distinct().ToList();
        if (distinct.Count < 2)
            return new GenreDuplicateScanResult(true, null, []);

        var (localGroups, unmatched) = GroupObviousDuplicates(distinct);
        if (unmatched.Count < 2)
            return new GenreDuplicateScanResult(true, null, localGroups);

        var apiKey = config["Gemini:ApiKey"];
        var modelName = config["Gemini:Model"] ?? "gemini-3.6-flash";
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            var note = localGroups.Count > 0
                ? "Ключ Gemini не налаштований — показано лише очевидні (типографічні) дублікати, знайдені без ШІ."
                : "Ключ Gemini не налаштований (appsettings.json → Gemini:ApiKey).";
            return new GenreDuplicateScanResult(true, note, localGroups);
        }

        var list = string.Join(", ", unmatched.Select(g => $"\"{g}\""));

        var prompt = $$"""
            Ти — асистент нормалізації назв музичних жанрів для бази даних.
            Очевидні (типографічні) дублікати вже прибрано окремо — нижче
            лише жанри, що НЕ мають явного збігу написання. Ось цей список: [{{list}}]

            Знайди серед них групи, де кілька рядків насправді позначають
            ОДИН І ТОЙ САМИЙ жанр, але написані по-різному (без пробілу,
            з дефісом, іншим регістром, скорочено, іншою мовою чи транслітом
            тощо). Наприклад "hardrock" і "hard rock" — один жанр; "Alternative
            Rock" і "alternative rock" — один жанр; "хип хоп" і "hip-hop" — один
            жанр. Жанри, які просто СХОЖІ, але є різними музичними
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
                return new GenreDuplicateScanResult(true,
                    $"ШІ-етап не відповів ({(int)response.StatusCode} {response.StatusCode}) — показано лише очевидні дублікати. {Truncate(errorBody, 300)}",
                    localGroups);
            }

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            text = text?.Trim().Trim('`').Trim();
            if (!string.IsNullOrWhiteSpace(text) && text.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                text = text[4..].Trim();

            var parsed = string.IsNullOrWhiteSpace(text) ? null : JsonSerializer.Deserialize<DuplicateGroupsResult>(text);
            var aiGroups = parsed?.Groups?.Where(g => !string.IsNullOrWhiteSpace(g.Canonical) && g.Duplicates?.Count > 0).ToList() ?? [];
            return new GenreDuplicateScanResult(true, null, [.. localGroups, .. aiGroups]);
        }
        catch (Exception ex)
        {
            return new GenreDuplicateScanResult(true,
                $"ШІ-етап дав збій ({ex.Message}) — показано лише очевидні дублікати.", localGroups);
        }
    }

    // Локальне (без ШІ) групування "очевидних" дублікатів. НЕ через Левенштейн —
    // для коротких назв жанрів та толерантність плутає різні жанри ("trap"/"rap").
    // Лише точна рівність ключа GenreNames.Key: регістр/пробіли/дефіси, кирилиця
    // ("хип хоп" = "hip-hop") і латинські синоніми ("r&b" = "rnb").
    private static (List<DuplicateGroup> Groups, List<string> Unmatched) GroupObviousDuplicates(List<string> genres)
    {
        var used = new bool[genres.Count];
        var groups = new List<DuplicateGroup>();
        var unmatched = new List<string>();

        for (var i = 0; i < genres.Count; i++)
        {
            if (used[i]) continue;
            var cluster = new List<string> { genres[i] };
            used[i] = true;
            for (var j = i + 1; j < genres.Count; j++)
            {
                if (used[j] || GenreKey(genres[i]) != GenreKey(genres[j])) continue;
                cluster.Add(genres[j]);
                used[j] = true;
            }

            if (cluster.Count == 1) { unmatched.Add(genres[i]); continue; }

            var canonical = PickCanonicalForm(cluster);
            groups.Add(new DuplicateGroup
            {
                Canonical = canonical,
                Duplicates = cluster.Where(g => !g.Equals(canonical, StringComparison.OrdinalIgnoreCase)).ToList(),
            });
        }
        return (groups, unmatched);
    }

    private static string GenreKey(string g) => GenreNames.Key(g);

    // Латинський варіант має перевагу (у базі жанри англійською): малими літерами
    // без дефісів, інакше найкоротший. Лише кирилиця — англійська назва зі словника.
    internal static string PickCanonicalForm(List<string> cluster)
    {
        var latin = cluster.Where(GenreNames.IsLatin).ToList();
        if (latin.Count == 0)
            return GenreNames.KnownEnglish(cluster[0]) ?? cluster.OrderBy(g => g.Length).First().ToLowerInvariant();
        var clean = latin.FirstOrDefault(g => g == g.ToLowerInvariant() && !g.Contains('-'));
        return (clean ?? latin.OrderBy(g => g.Length).First()).ToLowerInvariant();
    }

    // Без ШІ: відомий кириличний жанр — англійською назвою зі словника, решта — малими літерами.
    private static string LocalFallback(string candidate) =>
        GenreNames.KnownEnglish(candidate) ?? candidate.Trim().ToLowerInvariant();

    public async Task<string> NormalizeGenreAsync(string candidate, IEnumerable<string> existingGenres)
    {
        var fallback = LocalFallback(candidate);
        var existingDistinct = existingGenres.Select(g => g.Trim()).Distinct().ToList();

        // Дешева перевірка без ШІ: точна рівність після зняття формату (див. GenreKey).
        var exactMatch = existingDistinct.FirstOrDefault(g => GenreKey(g) == GenreKey(candidate));
        if (exactMatch != null) return exactMatch;
        // Відомий кириличний жанр, якого ще нема в базі, — англійська назва без звернення до ШІ.
        if (GenreNames.KnownEnglish(candidate) is { } known) return known;

        var apiKey = config["Gemini:ApiKey"];
        var modelName = config["Gemini:Model"] ?? "gemini-3.6-flash";
        if (string.IsNullOrWhiteSpace(apiKey)) return fallback;

        var existingList = string.Join(", ", existingDistinct);

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

            text = text.Trim().Trim('`').Trim();
            if (text.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                text = text[4..].Trim();

            var parsed = JsonSerializer.Deserialize<GenreResult>(text);
            var genre = parsed?.Genre?.Trim();
            return string.IsNullOrWhiteSpace(genre) ? fallback : genre.ToLowerInvariant();
        }
        catch
        {
            return fallback;
        }
    }

    // Пакетна версія NormalizeGenreAsync — один запит до Gemini на весь набір
    // жанрів одного збереження, замість окремого виклику на кожен.
    public async Task<List<string>> NormalizeGenresBatchAsync(List<string> candidates, IEnumerable<string> existingGenres)
    {
        var fallback = candidates.Select(LocalFallback).ToList();
        if (candidates.Count == 0) return fallback;

        var existingDistinct = existingGenres.Select(g => g.Trim()).Distinct().ToList();

        var results = new string[candidates.Count];
        var pendingIndexes = new List<int>();
        for (var i = 0; i < candidates.Count; i++)
        {
            var exactMatch = existingDistinct.FirstOrDefault(g => GenreKey(g) == GenreKey(candidates[i]));
            if (exactMatch != null) results[i] = exactMatch;
            else if (GenreNames.KnownEnglish(candidates[i]) is { } known) results[i] = known;
            else pendingIndexes.Add(i);
        }
        if (pendingIndexes.Count == 0) return results.ToList();
        if (pendingIndexes.Count == 1)
        {
            results[pendingIndexes[0]] = await NormalizeGenreAsync(candidates[pendingIndexes[0]], existingDistinct);
            return results.ToList();
        }

        var apiKey = config["Gemini:ApiKey"];
        var modelName = config["Gemini:Model"] ?? "gemini-3.6-flash";
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            foreach (var i in pendingIndexes) results[i] = fallback[i];
            return results.ToList();
        }

        var pending = pendingIndexes.Select(i => candidates[i]).ToList();
        var existingList = string.Join(", ", existingDistinct);
        var candidatesList = string.Join("\n", pending.Select((c, i) => $"{i}: \"{c}\""));

        var prompt = $$"""
            Ти — асистент нормалізації назв музичних жанрів для бази даних.
            Уже наявні в базі жанри: [{{existingList}}]

            Ось список нових/введених жанрів за індексом:
            {{candidatesList}}

            Для КОЖНОГО з них визнач, чи він — ТОЙ САМИЙ жанр, що вже є у
            списку, просто написаний по-іншому (без пробілу, з дефісом,
            іншим регістром, скорочено, іншою мовою тощо, наприклад
            "hardrock" і "hard rock" — той самий жанр; "рок" і "rock" —
            той самий жанр).

            Якщо так — поверни ТОЧНО ту назву, яка вже є у списку (символ в
            символ). Якщо це дійсно новий жанр — поверни правильно
            відформатовану англійську назву: маленькими літерами, зі
            звичайними пробілами між словами (без дефісів), без зайвих
            слів на кшталт "music" чи "genre".

            Відповідь дай СТРОГО у форматі JSON, без жодного іншого тексту,
            з РІВНО {{pending.Count}} елементами, по одному на кожен індекс:
            {"results": [{"index": 0, "genre": "rock"}, {"index": 1, "genre": "metal"}]}
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

            if (!response.IsSuccessStatusCode)
            {
                foreach (var i in pendingIndexes) results[i] = fallback[i];
                return results.ToList();
            }

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            text = text?.Trim().Trim('`').Trim();
            if (!string.IsNullOrWhiteSpace(text) && text.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                text = text[4..].Trim();

            var parsed = string.IsNullOrWhiteSpace(text) ? null : JsonSerializer.Deserialize<BatchGenreNormalizeResult>(text);
            var byIndex = parsed?.Results?.Where(r => r.Index.HasValue).ToDictionary(r => r.Index!.Value)
                ?? new Dictionary<int, BatchGenreNormalizeItem>();

            for (var k = 0; k < pendingIndexes.Count; k++)
            {
                var origIndex = pendingIndexes[k];
                var genre = byIndex.TryGetValue(k, out var r) ? r.Genre?.Trim() : null;
                results[origIndex] = string.IsNullOrWhiteSpace(genre) ? fallback[origIndex] : genre.ToLowerInvariant();
            }
            return results.ToList();
        }
        catch
        {
            foreach (var i in pendingIndexes) results[i] = fallback[i];
            return results.ToList();
        }
    }

    private class BatchGenreNormalizeResult
    {
        [JsonPropertyName("results")]
        public List<BatchGenreNormalizeItem>? Results { get; set; }
    }

    private class BatchGenreNormalizeItem
    {
        [JsonPropertyName("index")]
        public int? Index { get; set; }

        [JsonPropertyName("genre")]
        public string? Genre { get; set; }
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

// Результат сканування дублікатів: Success + текст помилки, якщо ШІ не відповів.
public record GenreDuplicateScanResult(bool Success, string? Error, List<DuplicateGroup> Groups);
