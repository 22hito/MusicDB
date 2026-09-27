using System.Text;
using Microsoft.AspNetCore.Hosting;
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
        var assets = new StaticAssetVersions(new Env(_root));

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
}
