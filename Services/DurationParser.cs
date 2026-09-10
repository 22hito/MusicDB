namespace MusicDB.Api.Services;

// Гнучкий парсинг тривалості пісні, який користувач вводить вручну.
// Правила:
//   "31"          -> 31 секунда           -> 00:00:31
//   "3:31"/"3.31" -> 3 хвилини 31 секунда -> 00:03:31
//   "3:33:31" / "3.33.31" / мішані крапка+двокрапка
//                 -> 3 години 33 хвилини 31 секунда -> 03:33:31
// Крапка ("." ) приймається як розділювач нарівні з двокрапкою (":") —
// на мобільній клавіатурі крапку набирати простіше.
public static class DurationParser
{
    public static TimeSpan Parse(string? raw, TimeSpan fallback)
    {
        if (string.IsNullOrWhiteSpace(raw)) return fallback;

        var normalized = raw.Trim().Replace('.', ':');
        var parts = normalized.Split(':', StringSplitOptions.RemoveEmptyEntries);

        try
        {
            return parts.Length switch
            {
                1 => TimeSpan.FromSeconds(double.Parse(parts[0])),
                2 => new TimeSpan(0, int.Parse(parts[0]), int.Parse(parts[1])),
                3 => new TimeSpan(int.Parse(parts[0]), int.Parse(parts[1]), int.Parse(parts[2])),
                _ => fallback
            };
        }
        catch
        {
            // Невідомий формат — не валимо запит, підставляємо fallback.
            return fallback;
        }
    }

    // Той самий парсинг, але результат одразу у форматі "HH:mm:ss" —
    // саме так тривалість зберігається текстом у заявках (music_requests.duration).
    public static string ParseToString(string? raw, string fallbackHms = "00:03:00")
    {
        var fallback = TimeSpan.TryParse(fallbackHms, out var fb) ? fb : TimeSpan.FromMinutes(3);
        return Parse(raw, fallback).ToString(@"hh\:mm\:ss");
    }
}
