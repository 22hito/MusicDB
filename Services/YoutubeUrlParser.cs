using System.Text.RegularExpressions;

namespace MusicDB.Api.Services;

// Спільна логіка розбору YouTube video ID / URL для полів, які адмін заповнює вручну.
public static partial class YoutubeUrlParser
{
    [GeneratedRegex(@"^[A-Za-z0-9_-]{11}$")]
    private static partial Regex VideoIdRegex();

    [GeneratedRegex(@"(?:v=|youtu\.be/|embed/)([A-Za-z0-9_-]{11})")]
    private static partial Regex UrlRegex();

    // Перевірка "це і є голий 11-символьний videoId".
    public static bool IsValidId(string s) => VideoIdRegex().IsMatch(s);

    // Приймає голий videoId або повний YouTube-лінк. null (поле не надіслане) —
    // не чіпає закешоване значення; порожній рядок — навмисне скидання.
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
