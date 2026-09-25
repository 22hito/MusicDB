using System.Text;

namespace MusicDB.Api.Services;

// Порівняння назв жанрів без ШІ: "Hip-Hop", "hip hop", "хип хоп", "хіп-хоп" —
// один жанр. Ключ знімає регістр/пробіли/дефіси, кирилицю зводить до англійської
// назви за словником поширених жанрів, а решту — транслітерацією.
public static class GenreNames
{
    // Кириличні написання (компактні: без пробілів і дефісів, ё→е) → англійська назва.
    private static readonly Dictionary<string, string> CyrillicAliases = Build(new()
    {
        ["rock"] = ["рок"],
        ["pop"] = ["поп"],
        ["pop rock"] = ["попрок"],
        ["hard rock"] = ["хардрок"],
        ["punk"] = ["панк"],
        ["punk rock"] = ["панкрок"],
        ["pop punk"] = ["поппанк"],
        ["post punk"] = ["постпанк"],
        ["post rock"] = ["построк"],
        ["rock and roll"] = ["рокнролл", "рокнрол", "рокенрол", "рокенролл"],
        ["alternative"] = ["альтернатива"],
        ["alternative rock"] = ["альтернативныйрок", "альтернативнийрок", "альтрок"],
        ["indie"] = ["инди", "інді"],
        ["indie rock"] = ["индирок", "індірок"],
        ["indie pop"] = ["индипоп", "індіпоп"],
        ["grunge"] = ["гранж"],
        ["emo"] = ["эмо", "емо"],
        ["emo rap"] = ["эмореп", "эморэп", "емореп"],
        ["metal"] = ["метал", "металл"],
        ["heavy metal"] = ["хевиметал", "хэвиметал", "хевіметал", "хевиметалл"],
        ["metalcore"] = ["металкор"],
        ["death metal"] = ["детметал", "дэтметал"],
        ["black metal"] = ["блэкметал", "блекметал"],
        ["nu metal"] = ["ньюметал", "нюметал", "нуметал"],
        ["hardcore"] = ["хардкор"],
        ["post hardcore"] = ["постхардкор"],
        ["screamo"] = ["скримо"],
        ["rap"] = ["рэп", "реп"],
        ["hip hop"] = ["хипхоп", "хіпхоп", "хипхап"],
        ["trap"] = ["трэп", "треп"],
        ["cloud rap"] = ["клаудреп", "клаудрэп"],
        ["phonk"] = ["фонк"],
        ["drill"] = ["дрилл", "дрил", "дріл"],
        ["grime"] = ["грайм"],
        ["r&b"] = ["рнб", "ритмэндблюз", "ритмнблюз", "ритменблюз", "арэнби", "арнби", "аренбі"],
        ["soul"] = ["соул"],
        ["funk"] = ["фанк"],
        ["disco"] = ["диско"],
        ["jazz"] = ["джаз"],
        ["blues"] = ["блюз"],
        ["folk"] = ["фолк"],
        ["country"] = ["кантри", "кантрі"],
        ["reggae"] = ["регги", "реггі", "регі", "реге"],
        ["ska"] = ["ска"],
        ["electronic"] = ["электроника", "електроніка", "электроннаямузыка", "електроннамузика"],
        ["electropop"] = ["электропоп", "електропоп"],
        ["synthpop"] = ["синтпоп", "синтипоп"],
        ["synthwave"] = ["синтвейв"],
        ["techno"] = ["техно"],
        ["house"] = ["хаус"],
        ["trance"] = ["транс"],
        ["dubstep"] = ["дабстеп"],
        ["drum and bass"] = ["драмэндбейс", "драменбейс", "драмнбейс", "драмандбейс"],
        ["ambient"] = ["эмбиент", "эмбиэнт", "амбиент", "амбієнт", "ембієнт"],
        ["lo-fi"] = ["лоуфай", "лофай", "лофі"],
        ["dance"] = ["данс", "денс"],
        ["k-pop"] = ["кпоп", "кейпоп"],
        ["j-pop"] = ["джейпоп"],
        ["shoegaze"] = ["шугейз"],
        ["chanson"] = ["шансон"],
        ["classical"] = ["классика", "класика", "классическаямузыка", "класичнамузика"],
        ["soundtrack"] = ["саундтрек"],
        ["opera"] = ["опера"],
        ["acoustic"] = ["акустика"],
    });

    // Латинські варіанти одного жанру, які не зводяться простим зняттям формату.
    private static readonly Dictionary<string, string> LatinAliases = new()
    {
        ["randb"] = "rnb", ["rhythmandblues"] = "rnb",
        ["drumnbass"] = "drumandbass", ["dnb"] = "drumandbass", ["dandb"] = "drumandbass",
        ["rocknroll"] = "rockandroll",
    };

    private static readonly Dictionary<char, string> Translit = new()
    {
        ['а'] = "a", ['б'] = "b", ['в'] = "v", ['г'] = "g", ['ґ'] = "g", ['д'] = "d", ['е'] = "e", ['є'] = "ye",
        ['ж'] = "zh", ['з'] = "z", ['и'] = "i", ['і'] = "i", ['ї'] = "yi", ['й'] = "y", ['к'] = "k", ['л'] = "l",
        ['м'] = "m", ['н'] = "n", ['о'] = "o", ['п'] = "p", ['р'] = "r", ['с'] = "s", ['т'] = "t", ['у'] = "u",
        ['ф'] = "f", ['х'] = "h", ['ц'] = "ts", ['ч'] = "ch", ['ш'] = "sh", ['щ'] = "sch", ['ь'] = "", ['ъ'] = "",
        ['ы'] = "y", ['э'] = "e", ['ю'] = "yu", ['я'] = "ya",
    };

    private static Dictionary<string, string> Build(Dictionary<string, string[]> byEnglish) =>
        byEnglish.SelectMany(kv => kv.Value.Select(alias => (alias, kv.Key))).ToDictionary(p => p.alias, p => p.Key);

    // "Hip-Hop" / "hip hop" / "хип хоп" -> "hiphop"; "R&B" / "rnb" / "рнб" -> "rnb".
    public static string Key(string genre)
    {
        var compact = Compact(genre);
        if (compact.Any(IsCyrillic))
        {
            if (CyrillicAliases.TryGetValue(compact, out var english)) return Key(english);
            var sb = new StringBuilder(compact.Length);
            foreach (var c in compact) sb.Append(Translit.TryGetValue(c, out var t) ? t : c.ToString());
            compact = sb.ToString();
        }
        return LatinAliases.GetValueOrDefault(compact, compact);
    }

    // Англійська назва для відомого кириличного жанру ("хип хоп" -> "hip hop"), інакше null.
    public static string? KnownEnglish(string genre) =>
        CyrillicAliases.TryGetValue(Compact(genre), out var english) ? english : null;

    public static bool IsLatin(string genre) => !genre.Any(IsCyrillic);

    private static bool IsCyrillic(char c) => c is >= 'Ѐ' and <= 'ӿ';

    private static string Compact(string genre)
    {
        var s = genre.Trim().ToLowerInvariant().Replace('ё', 'е').Replace("&", "and");
        return new string(s.Where(char.IsLetterOrDigit).ToArray());
    }
}
