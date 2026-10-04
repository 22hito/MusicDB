using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.FileProviders;

namespace MusicDB.Api.Services;

// index.html з версіями файлів: /js/x.js → /js/x.js?v=<хеш вмісту>. URL змінюється разом із файлом,
// тож такі css/js браузер кешує назавжди (immutable): повторний візит не звіряє
// три десятки файлів по одному, а стилі в <head> не тримають першу відмальовку зайвим запитом.
//
// Склеювання (StaticAssets:Bundle, увімкнене поза Development): прод іде по HTTP/1.1 — браузер тримає
// 6 з'єднань на сайт, і 11 стилів + 28 скриптів вантажились чергою (на повільному 4G скрипти доходили
// за 3.5 с). Тепер стилі <head> — один /css/bundle.css, defer-скрипти — один /js/bundle.js, у тому самому
// порядку. Скрипти — звичайні (не модулі): їхні верхньорівневі оголошення й так спільні, а
// tools/check-bundle.cjs (npm run lint) стежить, щоб склеювання не змінило поведінки — однакові імена
// в різних файлах, звернення під час завантаження до пізніших файлів. Чужі (js/vendor) — у власній
// функції: signalr.min.js оголошує глобальні var t, e, і в одному файлі затер би t() з i18n.js.
//
// Усі css/js стискаються один раз найсильніше (Brotli 11, у фоні після старту — див. Warm) і віддаються
// з пам'яті, а не стискаються на льоту найшвидшим (і найгіршим) рівнем на кожен запит.
public sealed partial class StaticAssetVersions(IWebHostEnvironment env, IConfiguration config)
{
    public const string CssBundlePath = "/css/bundle.css", JsBundlePath = "/js/bundle.js";
    private const string Immutable = "public, max-age=31536000, immutable";

    [GeneratedRegex(@"(?<=\s(?:src|href)="")/(?:css|js)/[\w./-]+\.(?:css|js)(?="")")]
    private static partial Regex AssetRef();

    [GeneratedRegex(@"^[ \t]*<link rel=""stylesheet"" href=""(/css/[\w.-]+\.css)"">[ \t]*\r?\n", RegexOptions.Multiline)]
    private static partial Regex StylesheetTag();

    [GeneratedRegex(@"^[ \t]*<script defer src=""(/js/[\w./-]+\.js)""></script>[ \t]*\r?\n", RegexOptions.Multiline)]
    private static partial Regex DeferScriptTag();

    [GeneratedRegex(@"^//# sourceMappingURL=.*$", RegexOptions.Multiline)]
    private static partial Regex SourceMapComment();

    private sealed record Asset(string Version, Lazy<PackedJson> Body);
    private sealed record Site(PackedJson Index, Dictionary<string, Asset> Bundles);

    private readonly bool _bundle = config.GetValue("StaticAssets:Bundle", !env.IsDevelopment());
    // Brotli 11 — ~1.5 с на обидва пакети раз на деплой; локально файли правлять на льоту — швидше.
    private readonly int _quality = env.IsDevelopment() ? 5 : 11;
    private readonly Lock _lock = new();
    private Site? _site;
    private readonly ConcurrentDictionary<string, (DateTimeOffset Modified, Asset Asset)> _files = new();

    // На проді файли між деплоями не змінюються — збираємо раз; локально правлять на льоту — щоразу наново.
    public PackedJson Index()
    {
        if (env.IsDevelopment()) return (_site = Build()).Index;
        return CurrentSite().Index;
    }

    private Site CurrentSite()
    {
        if (_site is { } site) return site;
        lock (_lock) return _site ??= Build();
    }

    // Стиснений css/js для запиту: склеєний пакет або окремий файл; null — не наш (далі звичайні StaticFiles).
    // Кешується назавжди, лише коли ?v= збігається з поточною версією.
    public (PackedJson Body, string CacheControl)? Find(string path, string? version)
    {
        Asset? asset;
        if (path is CssBundlePath or JsBundlePath)
        {
            if (!CurrentSite().Bundles.TryGetValue(path, out asset)) return null;
        }
        else
        {
            if (!(path.StartsWith("/css/", StringComparison.Ordinal) && path.EndsWith(".css", StringComparison.Ordinal)) &&
                !(path.StartsWith("/js/", StringComparison.Ordinal) && path.EndsWith(".js", StringComparison.Ordinal))) return null;
            var file = env.WebRootFileProvider.GetFileInfo(path);
            if (!file.Exists || file.IsDirectory) return null;
            if (!_files.TryGetValue(path, out var cached) || cached.Modified != file.LastModified)
            {
                var raw = ReadBytes(file);
                cached = (file.LastModified, new Asset(VersionOf(raw), Pack(raw, path)));
                _files[path] = cached;
            }
            asset = cached.Asset;
        }
        return (asset.Body.Value, version == asset.Version ? Immutable : "no-cache");
    }

    // Після старту: зібрати index і стиснути пакети заздалегідь, щоб не чекав перший відвідувач.
    public void Warm()
    {
        foreach (var asset in CurrentSite().Bundles.Values) _ = asset.Body.Value;
    }

    private Site Build()
    {
        var files = env.WebRootFileProvider;
        var html = ReadText(files.GetFileInfo("index.html"));
        var bundles = new Dictionary<string, Asset>();
        if (_bundle)
        {
            html = Bundle(html, StylesheetTag(), CssBundlePath, bundles,
                (path, text) => $"/* {path} */\n{text}\n",
                url => $"<link rel=\"stylesheet\" href=\"{url}\">");
            html = Bundle(html, DeferScriptTag(), JsBundlePath, bundles,
                (path, text) =>
                {
                    text = SourceMapComment().Replace(text, "");
                    // ";" між файлами — щоб кінець одного без крапки з комою не склеївся з "(" на початку наступного.
                    return path.StartsWith("/js/vendor/", StringComparison.Ordinal)
                        ? $"/* {path} */\n(function () {{\n{text}\n}}).call(this);\n"
                        : $"/* {path} */\n{text}\n;\n";
                },
                url => $"<script defer src=\"{url}\"></script>");
        }
        html = AssetRef().Replace(html, m =>
        {
            if (bundles.TryGetValue(m.Value, out var bundle)) return $"{m.Value}?v={bundle.Version}";
            var file = files.GetFileInfo(m.Value);
            if (!file.Exists) return m.Value;
            return $"{m.Value}?v={VersionOf(ReadBytes(file))}";
        });
        return new Site(PackedJson.FromBytes(Encoding.UTF8.GetBytes(html), "text/html; charset=utf-8", _quality), bundles);
    }

    // Усі теги одного виду → один тег на місці першого, вміст файлів — у тому самому порядку.
    private string Bundle(string html, Regex tag, string bundlePath, Dictionary<string, Asset> bundles,
        Func<string, string, string> wrap, Func<string, string> tagFor)
    {
        var matches = tag.Matches(html).Where(m => env.WebRootFileProvider.GetFileInfo(m.Groups[1].Value).Exists).ToList();
        if (matches.Count < 2) return html;
        var content = new StringBuilder();
        foreach (var m in matches) content.Append(wrap(m.Groups[1].Value, ReadText(env.WebRootFileProvider.GetFileInfo(m.Groups[1].Value))));
        var raw = Encoding.UTF8.GetBytes(content.ToString());
        bundles[bundlePath] = new Asset(VersionOf(raw), Pack(raw, bundlePath));

        var result = new StringBuilder(html.Length);
        var pos = 0;
        foreach (var m in matches)
        {
            result.Append(html, pos, m.Index - pos);
            if (m == matches[0]) result.Append(tagFor(bundlePath)).Append('\n');
            pos = m.Index + m.Length;
        }
        return result.Append(html, pos, html.Length - pos).ToString();
    }

    private Lazy<PackedJson> Pack(byte[] raw, string path) => new(() => PackedJson.FromBytes(raw,
        path.EndsWith(".css", StringComparison.Ordinal) ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", _quality));

    private static string VersionOf(byte[] raw) => Convert.ToHexString(SHA256.HashData(raw))[..10].ToLowerInvariant();

    private static byte[] ReadBytes(IFileInfo file)
    {
        using var stream = file.CreateReadStream();
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        return ms.ToArray();
    }

    // StreamReader прибирає BOM — інакше він опинився б посеред склеєного файлу.
    private static string ReadText(IFileInfo file)
    {
        using var reader = new StreamReader(file.CreateReadStream());
        return reader.ReadToEnd();
    }
}
