using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class StaticAssetVersionsTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("nowl-www").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private sealed class Env(string root) : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = root;
        public IFileProvider WebRootFileProvider { get; set; } = new PhysicalFileProvider(root);
        public string ApplicationName { get; set; } = "test";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = root;
        public string EnvironmentName { get; set; } = "Development"; // щоразу збирає наново
    }

    private string Html(StaticAssetVersions assets) => Encoding.UTF8.GetString(assets.Index().Raw);

    private StaticAssetVersions Assets(bool bundle = false) => new(new Env(_root),
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["StaticAssets:Bundle"] = bundle.ToString() }).Build());

    private void Write(string path, string text)
    {
        var full = Path.Combine(_root, path.TrimStart('/'));
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        File.WriteAllText(full, text);
    }

    [Fact]
    public void Index_AddsContentHashToCssAndJs_AndChangesItWithFile()
    {
        Directory.CreateDirectory(Path.Combine(_root, "js"));
        Directory.CreateDirectory(Path.Combine(_root, "css"));
        File.WriteAllText(Path.Combine(_root, "js", "app.js"), "let a = 1;");
        File.WriteAllText(Path.Combine(_root, "css", "base.css"), "body{}");
        File.WriteAllText(Path.Combine(_root, "index.html"),
            "<link rel=\"stylesheet\" href=\"/css/base.css\"><script src=\"/js/app.js\"></script>" +
            "<script src=\"https://cdn.example/x.js\"></script><script src=\"/js/missing.js\"></script>");
        var assets = Assets();

        var first = Html(assets);
        Assert.Matches("href=\"/css/base\\.css\\?v=[0-9a-f]{10}\"", first);
        Assert.Matches("src=\"/js/app\\.js\\?v=[0-9a-f]{10}\"", first);
        Assert.Contains("src=\"https://cdn.example/x.js\"", first); // чужі — як були
        Assert.Contains("src=\"/js/missing.js\"", first);           // нема файлу — без версії

        File.WriteAllText(Path.Combine(_root, "js", "app.js"), "let a = 2;");
        var second = Html(assets);
        Assert.NotEqual(first, second);
        Assert.Contains(first[first.IndexOf("href=", StringComparison.Ordinal)..first.IndexOf("<script", StringComparison.Ordinal)], second); // css не мінявся — версія та сама
    }


    [Fact]
    public void Bundle_JoinsStylesAndDeferScriptsInOrder_AndIsolatesVendor()
    {
        Write("css/a.css", "a{}");
        Write("css/b.css", "b{}");
        Write("js/vendor/lib.min.js", "var t,e;t=self,e=1;self.lib=e;\n//# sourceMappingURL=lib.min.js.map");
        Write("js/one.js", "function t(k){ return k; }\nlet x = 1"); // без крапки з комою в кінці
        Write("js/two.js", "(function(){ x++; })();");
        Write("index.html", """
            <head>
            <link rel="stylesheet" href="/css/a.css">
            <script async src="https://www.youtube.com/iframe_api"></script>
            <link rel="stylesheet" href="/css/b.css">
            </head><body>
            <script defer src="/js/vendor/lib.min.js"></script>
            <script defer src="/js/one.js"></script>
            <script defer src="/js/two.js"></script>
            <script>inline()</script>
            </body>
            """);
        var assets = Assets(bundle: true);
        var html = Html(assets);

        Assert.Single(Regex.Matches(html, "<link rel=\"stylesheet\""));
        Assert.Matches(@"<link rel=""stylesheet"" href=""/css/bundle\.css\?v=[0-9a-f]{10}"">\s*<script async", html); // на місці першого
        Assert.Single(Regex.Matches(html, "<script defer"));
        Assert.Contains("<script>inline()</script>", html);

        var v = Regex.Match(html, @"/js/bundle\.js\?v=([0-9a-f]{10})").Groups[1].Value;
        var (body, cache) = assets.Find(StaticAssetVersions.JsBundlePath, v)!.Value;
        Assert.Equal("public, max-age=31536000, immutable", cache);
        var js = Encoding.UTF8.GetString(body.Raw);
        Assert.True(js.IndexOf("self.lib", StringComparison.Ordinal) < js.IndexOf("function t", StringComparison.Ordinal));
        Assert.Contains("(function () {\nvar t,e;", js); // чужий код — у власній функції, t() не затре
        Assert.DoesNotContain("sourceMappingURL", js);
        Assert.Contains("let x = 1\n;\n", js);           // межа файлів не склеює вирази

        var css = assets.Find(StaticAssetVersions.CssBundlePath, "old")!.Value;
        var cssText = Encoding.UTF8.GetString(css.Body.Raw);
        Assert.True(cssText.IndexOf("a{}", StringComparison.Ordinal) < cssText.IndexOf("b{}", StringComparison.Ordinal));
        Assert.Equal("no-cache", css.CacheControl); // стара версія — не назавжди
    }

    [Fact]
    public void Find_ServesSingleFilesPrecompressed_AndIgnoresOthers()
    {
        Write("js/app.js", "let a = 1;");
        Write("index.html", "<script defer src=\"/js/app.js\"></script>");
        var assets = Assets();
        var (body, cache) = assets.Find("/js/app.js", null)!.Value;
        Assert.Equal("text/javascript; charset=utf-8", body.ContentType);
        Assert.Equal("no-cache", cache);
        Assert.NotEmpty(body.Brotli);
        Assert.Null(assets.Find("/js/missing.js", null));
        Assert.Null(assets.Find("/images/logo.png", null));
        Assert.Null(assets.Find(StaticAssetVersions.JsBundlePath, null)); // склеювання вимкнене
    }
}
