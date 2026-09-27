using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;

namespace MusicDB.Api.Services;

// Рекомендації на основі історії прослуховувань — Gemini з поясненням "чому",
// без ключа/недоступності — фолбек за найчастішими жанрами, без пояснення.
public class RecommendationService(MusicDbContext db, MusicService musicService, HttpClient http, IConfiguration config)
{
    private const int MaxRecommendations = 25;
    private const int HistoryLookback = 50;

    public async Task<List<RecommendationDto>> GetRecommendationsAsync(string userEmail, string lang = "uk")
    {
        var historyMusicIds = await db.ListeningHistory
            .Where(h => h.UserEmail == userEmail)
            .OrderByDescending(h => h.ListenedAt)
            .Select(h => h.MusicId)
            .Take(HistoryLookback)
            .ToListAsync();

        if (historyMusicIds.Count == 0)
            return []; // Немає історії — нема на основі чого рекомендувати.

        var listenedIdSet = historyMusicIds.Distinct().ToHashSet();

        // Каталог — десятки тисяч пісень: у ШІ-запит і в підбір ідуть лише кандидати зі спільними
        // жанрами чи виконавцями з історії (а не весь каталог текстом у кожному запиті).
        var candidates = await GetCandidatesAsync(historyMusicIds, listenedIdSet);
        if (candidates.Count == 0) return [];

        var apiKey = config["Gemini:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            var aiResult = await TryGetAiRecommendationsAsync(apiKey, historyMusicIds, candidates, listenedIdSet, lang);
            if (aiResult is { Count: > 0 }) return aiResult;
        }

        return await ToDtosAsync(candidates.Take(MaxRecommendations).Select(c => (c.Id, (string?)null)));
    }

    private const int CandidatePool = 120;

    private sealed record Candidate(int Id, string Artist, string Title, string[] Genres, double Score);

    // Бали: жанри з історії (скільки разів слухав) + виконавці з історії (сильніший сигнал —
    // працює й для пісень, яким жанри ще не проставлені).
    private async Task<List<Candidate>> GetCandidatesAsync(List<int> historyMusicIds, HashSet<int> listenedIdSet)
    {
        var historyGenres = await db.MusicGenres.AsNoTracking()
            .Where(mg => listenedIdSet.Contains(mg.MusicId))
            .Select(mg => new { mg.MusicId, mg.GenreId })
            .ToListAsync();
        var historyArtists = await db.MusicArtists.AsNoTracking()
            .Where(ma => listenedIdSet.Contains(ma.MusicId))
            .Select(ma => new { ma.MusicId, ma.ArtistId })
            .ToListAsync();
        var plays = historyMusicIds.GroupBy(id => id).ToDictionary(g => g.Key, g => g.Count());
        var genreWeight = historyGenres.GroupBy(x => x.GenreId)
            .ToDictionary(g => g.Key, g => (double)g.Sum(x => plays.GetValueOrDefault(x.MusicId, 1)));
        var artistWeight = historyArtists.GroupBy(x => x.ArtistId)
            .ToDictionary(g => g.Key, g => 2.0 * g.Sum(x => plays.GetValueOrDefault(x.MusicId, 1)));

        var genreIds = genreWeight.Keys.ToList();
        var artistIds = artistWeight.Keys.ToList();
        var score = new Dictionary<int, double>();
        foreach (var row in await db.MusicGenres.AsNoTracking().Where(mg => genreIds.Contains(mg.GenreId))
                     .Select(mg => new { mg.MusicId, mg.GenreId }).ToListAsync())
            if (!listenedIdSet.Contains(row.MusicId))
                score[row.MusicId] = score.GetValueOrDefault(row.MusicId) + genreWeight[row.GenreId];
        foreach (var row in await db.MusicArtists.AsNoTracking().Where(ma => artistIds.Contains(ma.ArtistId))
                     .Select(ma => new { ma.MusicId, ma.ArtistId }).ToListAsync())
            if (!listenedIdSet.Contains(row.MusicId))
                score[row.MusicId] = score.GetValueOrDefault(row.MusicId) + artistWeight[row.ArtistId];

        var top = score.OrderByDescending(kv => kv.Value).ThenBy(kv => kv.Key).Take(CandidatePool).ToList();
        var ids = top.Select(kv => kv.Key).ToList();
        var info = await db.Songs.AsNoTracking().Where(m => ids.Contains(m.Id))
            .Select(m => new { m.Id, m.Artist, m.Title, Genres = m.MusicGenres.Select(mg => mg.Genre.GenreName).ToArray() })
            .ToDictionaryAsync(m => m.Id);
        return top.Where(kv => info.ContainsKey(kv.Key))
            .Select(kv => { var m = info[kv.Key]; return new Candidate(m.Id, m.Artist, m.Title, m.Genres, kv.Value); })
            .ToList();
    }

    private async Task<List<RecommendationDto>> ToDtosAsync(IEnumerable<(int Id, string? Reason)> items)
    {
        var list = items.ToList();
        var dtoById = (await musicService.GetSongDtosByIdsAsync(list.Select(i => i.Id))).ToDictionary(s => s.Id);
        return list.Where(i => dtoById.ContainsKey(i.Id)).Select(i => new RecommendationDto(dtoById[i.Id], i.Reason)).ToList();
    }

    private async Task<List<RecommendationDto>?> TryGetAiRecommendationsAsync(
        string apiKey, List<int> historyMusicIds, List<Candidate> candidates, HashSet<int> listenedIdSet, string lang)
    {
        var modelName = config["Gemini:Model"] ?? "gemini-3.6-flash";
        try
        {
            var historySongs = await db.Songs.AsNoTracking().Where(s => listenedIdSet.Contains(s.Id))
                .Select(s => new { s.Artist, s.Title, Genres = s.MusicGenres.Select(mg => mg.Genre.GenreName).ToArray() })
                .ToListAsync();
            var historyText = string.Join("; ", historySongs.Select(s =>
                $"{s.Artist} - {s.Title} [{string.Join(", ", s.Genres.Select(g => g.Trim()))}]"));

            var catalogText = string.Join("; ", candidates.Select(s =>
                $"id={s.Id}: {s.Artist} - {s.Title} [{string.Join(", ", s.Genres.Select(g => g.Trim()))}]"));

            // Пояснення мовою поточного інтерфейсу (укр/англ), а не завжди українською.
            var languageName = lang == "en" ? "англійською (English)" : "українською";

            var prompt = $$"""
                Ти — асистент музичних рекомендацій.
                Історія прослуховувань користувача: {{historyText}}

                Кандидати з каталогу (формат id=число: виконавець - назва [жанри]):
                {{catalogText}}

                Обери до {{MaxRecommendations}} пісень З КАТАЛОГУ (тільки ті id, що дійсно
                є у списку каталогу), які користувачу, скоріш за все, сподобаються,
                судячи з його історії прослуховувань. НЕ пропонуй пісні, які він уже
                слухав. Для кожної додай дуже коротке пояснення (одне речення,
                {{languageName}}), чому саме ця пісня може сподобатись.

                Відповідь дай СТРОГО у форматі JSON, без жодного іншого тексту:
                {"recommendations": [{"musicId": 12, "reason": "..."}]}
                """;

            var response = await GenreNormalizationService.PostWithRetryAsync(http,
                $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}",
                new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } },
                    generationConfig = new { temperature = 0.4, responseMimeType = "application/json" }
                });

            if (!response.IsSuccessStatusCode) return null;

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(text)) return null;

            text = text.Trim().Trim('`').Trim();
            if (text.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                text = text[4..].Trim();

            var parsed = JsonSerializer.Deserialize<RecommendationsResult>(text);
            if (parsed?.Recommendations is null) return null;

            var candidateIds = candidates.Select(c => c.Id).ToHashSet();
            var validItems = parsed.Recommendations
                .Where(item => item.MusicId is int id && !listenedIdSet.Contains(id) && candidateIds.Contains(id))
                .DistinctBy(item => item.MusicId)
                .Take(MaxRecommendations)
                .Select(item => (item.MusicId!.Value, item.Reason));
            return await ToDtosAsync(validItems);
        }
        catch
        {
            // ШІ недоступний / ліміт — повертаємо null, щоб спрацював фолбек.
            return null;
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

    private class RecommendationsResult
    {
        [JsonPropertyName("recommendations")]
        public List<RecommendationItem>? Recommendations { get; set; }
    }

    private class RecommendationItem
    {
        [JsonPropertyName("musicId")]
        public int? MusicId { get; set; }

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }
}
