namespace MusicDB.Api.Services;

// Толерантне порівняння тексту для пошуку виконавця/альбому/пісні: люди
// майже ніколи не друкують "ё" (пишуть "е") і регулярно роблять одруківки
// в один-два символи. Наївний Contains/Equals на таких запитах відкидає
// правильні збіги — цей клас нормалізує ё→е й додає толерантність до
// невеликих одруківок через відстань Левенштейна.
public static class FuzzyText
{
    public static string Normalize(string s) =>
        s.Trim().ToLowerInvariant().Replace('ё', 'е');

    public static bool FuzzyEquals(string? a, string? b)
    {
        if (string.IsNullOrWhiteSpace(a) || string.IsNullOrWhiteSpace(b)) return false;
        var na = Normalize(a);
        var nb = Normalize(b);
        if (na == nb) return true;
        return LevenshteinDistance(na, nb) <= MaxDistanceFor(Math.Min(na.Length, nb.Length));
    }

    // haystack "містить" needle: точний підрядок (після нормалізації ё→е),
    // а якщо ні — ковзне вікно по haystack з толерантністю до одруківок.
    public static bool FuzzyContains(string? haystack, string? needle)
    {
        if (string.IsNullOrWhiteSpace(haystack) || string.IsNullOrWhiteSpace(needle)) return false;
        var h = Normalize(haystack);
        var n = Normalize(needle);
        if (h.Contains(n, StringComparison.Ordinal)) return true;
        return SlidingWindowFuzzyMatch(h, n);
    }

    // Дуже короткі запити (1-2 символи) толерантність до одруківок лише
    // плодить хибні збіги — вимагаємо точного підрядка для них.
    private static bool SlidingWindowFuzzyMatch(string haystack, string needle)
    {
        if (needle.Length < 3) return false;
        var maxDistance = MaxDistanceFor(needle.Length);

        if (haystack.Length <= needle.Length)
            return LevenshteinDistance(haystack, needle) <= maxDistance;

        // Одруківка може зсунути довжину збігу на ±1 (пропущена/зайва літера),
        // тож пробуємо вікна довжиною needle.Length-1 .. needle.Length+1.
        for (var start = 0; start <= haystack.Length - 1; start++)
        {
            for (var len = Math.Max(1, needle.Length - 1); len <= needle.Length + 1 && start + len <= haystack.Length; len++)
            {
                var window = haystack.Substring(start, len);
                if (LevenshteinDistance(window, needle) <= maxDistance) return true;
            }
        }
        return false;
    }

    private static int MaxDistanceFor(int length) => length switch
    {
        <= 5 => 1,
        <= 10 => 2,
        _ => 3,
    };

    private static int LevenshteinDistance(string a, string b)
    {
        var dp = new int[a.Length + 1, b.Length + 1];
        for (var i = 0; i <= a.Length; i++) dp[i, 0] = i;
        for (var j = 0; j <= b.Length; j++) dp[0, j] = j;

        for (var i = 1; i <= a.Length; i++)
        {
            for (var j = 1; j <= b.Length; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                dp[i, j] = Math.Min(Math.Min(dp[i - 1, j] + 1, dp[i, j - 1] + 1), dp[i - 1, j - 1] + cost);
            }
        }
        return dp[a.Length, b.Length];
    }
}
