using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

// R2: підписане посилання рахується локально (без мережі), тож перевіряємо
// його форму, а також вибір між редиректом і локальним файлом.
public class AudioStorageTests
{
    private static R2AudioStorage CreateR2(string? publicBaseUrl = null) => new(new R2Options
    {
        AccountId = "acc123",
        AccessKeyId = "key",
        SecretAccessKey = "secret",
        Bucket = "nowl-audio",
        PublicBaseUrl = publicBaseUrl,
    }, NullLogger<R2AudioStorage>.Instance);

    [Fact]
    public async Task R2_OpenAsync_ReturnsPresignedUrlOnAccountEndpoint()
    {
        using var r2 = CreateR2();

        var source = await r2.OpenAsync("abc123.mp3");

        Assert.NotNull(source);
        Assert.Null(source.FilePath);
        Assert.Equal("audio/mpeg", source.ContentType);
        var url = new Uri(source.RedirectUrl!);
        Assert.Equal("https", url.Scheme);
        Assert.Equal("acc123.r2.cloudflarestorage.com", url.Host);
        Assert.Equal("/nowl-audio/abc123.mp3", url.AbsolutePath);
        Assert.Contains("X-Amz-Signature=", url.Query);
    }

    [Fact]
    public async Task R2_WithPublicBaseUrl_ReturnsDirectLink()
    {
        using var r2 = CreateR2("https://audio.example.com/");

        var source = await r2.OpenAsync("abc123.ogg");

        Assert.Equal("https://audio.example.com/abc123.ogg", source?.RedirectUrl);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("../secret.mp3")]
    [InlineData("dir/file.mp3")]
    public async Task R2_UnsafeOrMissingName_ReturnsNull(string? name)
    {
        using var r2 = CreateR2();
        Assert.Null(await r2.OpenAsync(name));
    }

    [Fact]
    public void Validate_RejectsUnsupportedFormatAndOversize()
    {
        Assert.Equal("Unsupported audio format.", AudioFiles.Validate(new FormFile(new MemoryStream([1]), 0, 1, "audio", "x.exe")).Error);
        Assert.NotNull(AudioFiles.Validate(new FormFile(Stream.Null, 0, AudioFiles.MaxBytes + 1, "audio", "x.mp3")).Error);
        Assert.EndsWith(".mp3", AudioFiles.Validate(new FormFile(new MemoryStream([1]), 0, 1, "audio", "My Song.MP3")).NewName);
    }

    private sealed class TestController : ControllerBase;

    [Fact]
    public void ToResult_RedirectsForR2_ServesFileLocally_NotFoundOtherwise()
    {
        var c = new TestController();
        Assert.IsType<RedirectResult>(c.ToResult(new AudioSource(null, "https://x/y.mp3", "audio/mpeg")));
        var file = Assert.IsType<PhysicalFileResult>(c.ToResult(new AudioSource("C:/a.mp3", null, "audio/mpeg")));
        Assert.True(file.EnableRangeProcessing);
        Assert.IsType<NotFoundResult>(c.ToResult(null));
    }
}
