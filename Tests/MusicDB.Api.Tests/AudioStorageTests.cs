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

    private static FormFile Upload(byte[] bytes, string name, string? contentType = null)
    {
        var f = new FormFile(new MemoryStream(bytes), 0, bytes.Length, "audio", name) { Headers = new HeaderDictionary() };
        if (contentType is not null) f.ContentType = contentType;
        return f;
    }

    // Браузер на Android віддає файл з вибору "Аудіо" під назвою треку без розширення.
    [Theory]
    [InlineData(new byte[] { 0x49, 0x44, 0x33, 3, 0, 0, 0, 0 }, "romans", ".mp3")] // ID3
    [InlineData(new byte[] { 0xFF, 0xFB, 0x90, 0x64 }, "track", ".mp3")] // кадр MPEG без тегу
    [InlineData(new byte[] { 0x66, 0x4C, 0x61, 0x43, 0, 0 }, "song", ".flac")]
    [InlineData(new byte[] { 0x4F, 0x67, 0x67, 0x53, 0, 2 }, "voice", ".ogg")]
    [InlineData(new byte[] { 0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41 }, "1000034567", ".m4a")]
    public void Validate_DetectsFormatByContent_WhenNameHasNoExtension(byte[] head, string name, string expected)
    {
        Assert.EndsWith(expected, AudioFiles.Validate(Upload(head, name)).NewName);
    }

    [Fact]
    public void Validate_FallsBackToMimeType_ThenRejects()
    {
        Assert.EndsWith(".mp3", AudioFiles.Validate(Upload([1, 2, 3], "romans", "audio/mpeg")).NewName);
        Assert.Equal("Unsupported audio format.", AudioFiles.Validate(Upload([1, 2, 3], "romans", "application/octet-stream")).Error);
        Assert.Equal("Unsupported audio format.", AudioFiles.Validate(Upload([0x4D, 0x5A, 0x90, 0], "setup.exe")).Error);
    }

    [Fact]
    public void ValidateImage_DetectsFormatByContent()
    {
        Assert.EndsWith(".png", AudioFiles.ValidateImage(Upload([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], "Screenshot")).NewName);
        Assert.EndsWith(".jpg", AudioFiles.ValidateImage(Upload([0xFF, 0xD8, 0xFF, 0xE0], "IMG_2041")).NewName);
        Assert.Equal("Unsupported image format.", AudioFiles.ValidateImage(Upload([1, 2, 3], "note")).Error);
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
