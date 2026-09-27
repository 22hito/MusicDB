using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace MusicDB.Api.Services;

// Великий список (весь каталог — десятки тисяч пісень), зібраний і стиснутий один раз на весь час кешу:
// без null і нульових полів (клієнт доповнює їх сам), з ETag — повторне завантаження після
// songsChanged, коли нічого не змінилось, дає 304 замість мегабайтів.
public sealed record PackedJson(string ETag, byte[] Raw, byte[] Brotli, byte[] Gzip)
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault,
    };

    public static PackedJson Create<T>(T value)
    {
        var raw = JsonSerializer.SerializeToUtf8Bytes(value, Options);
        var etag = $"\"{Convert.ToHexString(SHA256.HashData(raw))[..24]}\"";
        return new PackedJson(etag, raw, Compress(raw, brotli: true), Compress(raw, brotli: false));
    }

    private static byte[] Compress(byte[] data, bool brotli)
    {
        using var ms = new MemoryStream();
        using (Stream z = brotli ? new BrotliStream(ms, CompressionLevel.Optimal) : new GZipStream(ms, CompressionLevel.Optimal))
            z.Write(data);
        return ms.ToArray();
    }

    // Уже стиснута відповідь: Content-Encoding виставлено, тож ResponseCompression її не чіпає.
    public IActionResult ToResult(HttpContext http)
    {
        var request = http.Request;
        var headers = http.Response.Headers;
        headers[HeaderNames.ETag] = ETag;
        headers[HeaderNames.CacheControl] = "no-cache"; // браузер кешує, але щоразу звіряє ETag
        headers.Append(HeaderNames.Vary, HeaderNames.AcceptEncoding);
        if (request.Headers[HeaderNames.IfNoneMatch].ToString().Contains(ETag, StringComparison.Ordinal))
            return new StatusCodeResult(StatusCodes.Status304NotModified);

        var accept = request.Headers[HeaderNames.AcceptEncoding].ToString();
        var body = Raw;
        if (accept.Contains("br", StringComparison.OrdinalIgnoreCase)) { body = Brotli; headers[HeaderNames.ContentEncoding] = "br"; }
        else if (accept.Contains("gzip", StringComparison.OrdinalIgnoreCase)) { body = Gzip; headers[HeaderNames.ContentEncoding] = "gzip"; }
        return new FileContentResult(body, "application/json; charset=utf-8");
    }
}
