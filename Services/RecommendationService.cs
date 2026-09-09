using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;

namespace MusicDB.Api.Services;

// Рекомендації пісень на основі історії прослуховувань користувача.
// Основний шлях — Google Gemini (той самий безкоштовний ключ, що й для
// жанрів): йому передається історія прослуховувань + весь каталог, і він
// підбирає пісні з коротким поясненням "чому".
//
// Якщо ключ не налаштований, ліміт вичерпано, чи Gemini недоступний —
// спрацьовує простий фолбек: пісні з жанрами, які користувач слухає
// найчастіше (без ШІ, без пояснення).
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

        var allSongs = await db.Songs
            .Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .ToListAsync();

        var apiKey = config["Gemini:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            var aiResult = await TryGetAiRecommendationsAsync(apiKey, historyMusicIds, allSongs, listenedIdSet, lang);
            if (aiResult is { Count: > 0 }) return aiResult;
        }

        return await GetFallbackRecommendationsAsync(historyMusicIds, allSongs, listenedIdSet);
    }

    private async Task<List<RecommendationDto>?> TryGetAiRecommendationsAsync(
        string apiKey, List<int> historyMusicIds, List<Music> allSongs, HashSet<int> listenedIdSet, string lang)
    {
        var modelName = config["Gemini:Model"] ?? "gemini-3.6-flash";
        try
        {
            var historySongs = allSongs.Where(s => historyMusicIds.Contains(s.Id)).ToList();
            var historyText = string.Join("; ", historySongs.Select(s =>
                $"{s.Artist} - {s.Title} [{string.Join(", ", s.MusicGenres.Select(mg => mg.Genre.GenreName.Trim()))}]"));

            var catalogText = string.Join("; ", allSongs.Select(s =>
                $"id={s.Id}: {s.Artist} - {s.Title} [{string.Join(", ", s.MusicGenres.Select(mg => mg.Genre.GenreName.Trim()))}]"));

            // Пояснення має бути мовою поточного інтерфейсу сайту (укр/англ),
            // а не завжди українською — інакше при перемиканні мови на
            // сторінці рекомендацій текст пояснення лишався б українським.
            var languageName = lang == "en" ? "англійською (English)" : "українською";

            var prompt = $$"""
                Ти — асистент музичних рекомендацій.
                Історія прослуховувань користувача: {{historyText}}

                Повний каталог доступних пісень (формат id=число: виконавець - назва [жанри]):
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

            var validItems = parsed.Recommendations
                .Where(item => item.MusicId is not null && !listenedIdSet.Contains(item.MusicId.Value)
                               && allSongs.Any(s => s.Id == item.MusicId.Value))
                .Take(MaxRecommendations)
                .ToList();

            var songDtos = await musicService.GetSongDtosByIdsAsync(validItems.Select(i => i.MusicId!.Value));
            var dtoById = songDtos.ToDictionary(s => s.Id);

            var recs = new List<RecommendationDto>();
            foreach (var item in validItems)
            {
                if (dtoById.TryGetValue(item.MusicId!.Value, out var songDto))
                    recs.Add(new RecommendationDto(songDto, item.Reason));
            }
            return recs;
        }
        catch
        {
            // ШІ недоступний / ліміт — повертаємо null, щоб спрацював фолбек.
            return null;
        }
    }

    // Простий алгоритм без ШІ: рекомендує пісні з жанрами, які користувач
    // слухає найчастіше, серед тих, що він ще не слухав.
    private async Task<List<RecommendationDto>> GetFallbackRecommendationsAsync(
        List<int> historyMusicIds, List<Music> allSongs, HashSet<int> listenedIdSet)
    {
        var favoriteGenreCounts = allSongs
            .Where(s => historyMusicIds.Contains(s.Id))
            .SelectMany(s => s.MusicGenres.Select(mg => mg.Genre.GenreName.Trim().ToLowerInvariant()))
            .GroupBy(g => g)
            .ToDictionary(g => g.Key, g => g.Count());

        var candidates = allSongs
            .Where(s => !listenedIdSet.Contains(s.Id))
            .Select(s => new
            {
                Song = s,
                Score = s.MusicGenres.Sum(mg => favoriteGenreCounts.GetValueOrDefault(mg.Genre.GenreName.Trim().ToLowerInvariant(), 0))
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(MaxRecommendations)
            .ToList();

        var songDtos = await musicService.GetSongDtosByIdsAsync(candidates.Select(x => x.Song.Id));
        var dtoById = songDtos.ToDictionary(s => s.Id);

        var result = new List<RecommendationDto>();
        foreach (var c in candidates)
        {
            if (dtoById.TryGetValue(c.Song.Id, out var songDto))
                result.Add(new RecommendationDto(songDto, null));
        }
        return result;
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
