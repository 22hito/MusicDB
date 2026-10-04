using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace MusicDB.Api.Services;

// Велика відповідь, зібрана і стиснута один раз на весь час кешу, з ETag: весь каталог (десятки тисяч
// пісень — без null і нульових полів, клієнт доповнює їх сам) чи index.html з версіями файлів.
// Повторне завантаження, коли нічого не змінилось, дає 304 замість мегабайтів.
public sealed record PackedJson(string ETag, string ContentType, byte[] Raw, byte[] Brotli, byte[] Gzip)
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault,
    };

    public static PackedJson Create<T>(T value) =>
        FromBytes(JsonSerializer.SerializeToUtf8Bytes(value, Options), "application/json; charset=utf-8");

    // brotliQuality: 6 — для даних, що перебудовуються (каталог раз на 2 хв); 11 — для статики, що стискається
    // раз на деплой (css/js на ~30% менші, ніж стискання на льоту, див. StaticAssetVersions).
    public static PackedJson FromBytes(byte[] raw, string contentType, int brotliQuality = 6)
    {
        var etag = $"\"{Convert.ToHexString(SHA256.HashData(raw))[..24]}\"";
        return new PackedJson(etag, contentType, raw, Compress(raw, brotliQuality), Compress(raw, null));
    }

    private static byte[] Compress(byte[] data, int? brotliQuality)
    {
        // Brotli якості 6 з вікном 4 МБ: каталог на третину менший, ніж з CompressionLevel.Optimal (це якість 4),
        // а стискається однаково швидко (~40 мс) — один раз на весь час кешу.
        if (brotliQuality is { } quality)
        {
            var buf = new byte[BrotliEncoder.GetMaxCompressedLength(data.Length)];
            if (BrotliEncoder.TryCompress(data, buf, out var written, quality, window: 22)) return buf[..written];
        }
        using var ms = new MemoryStream();
        using (Stream z = brotliQuality is not null ? new BrotliStream(ms, CompressionLevel.Optimal) : new GZipStream(ms, CompressionLevel.Optimal))
            z.Write(data);
        return ms.ToArray();
    }

    // Уже стиснута відповідь: Content-Encoding виставлено, тож ResponseCompression її не чіпає.
    public IActionResult ToResult(HttpContext http) =>
        Negotiate(http, "no-cache") is { } body ? new FileContentResult(body, ContentType) : new StatusCodeResult(StatusCodes.Status304NotModified);

    // Те саме для minimal API / middleware. cacheControl: за замовчуванням браузер кешує, але щоразу звіряє ETag.
    public IResult ToHttpResult(HttpContext http, string cacheControl = "no-cache") =>
        Negotiate(http, cacheControl) is { } body ? Results.Bytes(body, ContentType) : Results.StatusCode(StatusCodes.Status304NotModified);

    // Заголовки й вибір тіла під Accept-Encoding; null — у клієнта та сама версія (304).
    private byte[]? Negotiate(HttpContext http, string cacheControl)
    {
        var request = http.Request;
        var headers = http.Response.Headers;
        headers[HeaderNames.ETag] = ETag;
        headers[HeaderNames.CacheControl] = cacheControl;
        headers.Append(HeaderNames.Vary, HeaderNames.AcceptEncoding);
        if (request.Headers[HeaderNames.IfNoneMatch].ToString().Contains(ETag, StringComparison.Ordinal))
            return null;

        var accept = request.Headers[HeaderNames.AcceptEncoding].ToString();
        if (accept.Contains("br", StringComparison.OrdinalIgnoreCase)) { headers[HeaderNames.ContentEncoding] = "br"; return Brotli; }
        if (accept.Contains("gzip", StringComparison.OrdinalIgnoreCase)) { headers[HeaderNames.ContentEncoding] = "gzip"; return Gzip; }
        return Raw;
    }
}
