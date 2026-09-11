using System.Text.RegularExpressions;

namespace MusicDB.Api.Services;

// Спільна логіка розбору YouTube video ID / URL для полів, які адмін
// заповнює вручну (пісня, заявка) — щоб не дублювати регекси в кожному
// контролері.
public static partial class YoutubeUrlParser
{
    [GeneratedRegex(@"^[A-Za-z0-9_-]{11}$")]
    private static partial Regex VideoIdRegex();

    [GeneratedRegex(@"(?:v=|youtu\.be/|embed/)([A-Za-z0-9_-]{11})")]
    private static partial Regex UrlRegex();

    // Точна перевірка "це і є голий 11-символьний videoId" — використовується
    // там, де URL не очікується (напр. кешування вже знайденого фронтендом ID).
    public static bool IsValidId(string s) => VideoIdRegex().IsMatch(s);

    // Приймає або голий 11-символьний videoId, або повний YouTube-лінк
    // (адмін радше вставить URL з адресного рядка, ніж сам ID).
    // Розрізняємо: поле взагалі не надіслано (null) — НЕ чіпаємо вже
    // закешоване значення (щоб інші клієнти, які ще не надсилають це поле —
    // напр. мобільний застосунок — не стирали кеш при кожному редагуванні);
    // надіслано явно порожнім рядком — це навмисне скидання (null).
    public static bool TryExtract(string? raw, out string? videoId, out bool shouldUpdate)
    {
        videoId = null;
        if (raw is null) { shouldUpdate = false; return true; }
        shouldUpdate = true;
        if (raw.Length == 0) return true;

        var trimmed = raw.Trim();
        if (VideoIdRegex().IsMatch(trimmed)) { videoId = trimmed; return true; }

        var match = UrlRegex().Match(trimmed);
        if (match.Success) { videoId = match.Groups[1].Value; return true; }

        return false;
    }
}
