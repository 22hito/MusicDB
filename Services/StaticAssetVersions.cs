using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace MusicDB.Api.Services;

// index.html з версіями файлів: /js/x.js → /js/x.js?v=<хеш вмісту>. URL змінюється разом із файлом,
// тож такі css/js браузер кешує назавжди (immutable, див. Program.cs): повторний візит не звіряє
// три десятки файлів по одному, а стилі в <head> не тримають першу відмальовку зайвим запитом.
public sealed partial class StaticAssetVersions(IWebHostEnvironment env)
{
    [GeneratedRegex(@"(?<=\s(?:src|href)="")/(?:css|js)/[\w./-]+\.(?:css|js)(?="")")]
    private static partial Regex AssetRef();

    private readonly Lazy<PackedJson> _index = new(() => Build(env));

    // На проді файли між деплоями не змінюються — збираємо раз; локально правлять на льоту — щоразу наново.
    public PackedJson Index() => env.IsDevelopment() ? Build(env) : _index.Value;

    private static PackedJson Build(IWebHostEnvironment env)
    {
        var files = env.WebRootFileProvider;
        using var reader = new StreamReader(files.GetFileInfo("index.html").CreateReadStream());
        var html = AssetRef().Replace(reader.ReadToEnd(), m =>
        {
            var file = files.GetFileInfo(m.Value);
            if (!file.Exists) return m.Value;
            using var stream = file.CreateReadStream();
            return $"{m.Value}?v={Convert.ToHexString(SHA256.HashData(stream))[..10].ToLowerInvariant()}";
        });
        return PackedJson.FromBytes(Encoding.UTF8.GetBytes(html), "text/html; charset=utf-8");
    }
}
