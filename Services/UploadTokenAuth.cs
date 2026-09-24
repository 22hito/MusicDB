using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace MusicDB.Api.Services;

// Токен завантаження файлів для мобільного застосунку. Звичайні запити застосунок робить
// через прихований WebView (там живе cookie-сесія), а файли (multipart) — нативним fetch,
// який куку сесії отримує не завжди (iOS — ніколи). Тож перед завантаженням застосунок
// бере через WebView короткоживучий токен і передає його заголовком X-Upload-Token.
// Токен діє лише на ендпоінтах завантаження файлів (UploadTokenAuth.IsUploadEndpoint).
public sealed class UploadTokenService(IMemoryCache cache)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(10);

    public string Create(ClaimsPrincipal user)
    {
        var token = Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var claims = user.Claims.Select(c => new KeyValuePair<string, string>(c.Type, c.Value)).ToArray();
        cache.Set(Key(token), claims, Lifetime);
        return token;
    }

    public ClaimsPrincipal? Resolve(string? token)
    {
        if (string.IsNullOrWhiteSpace(token) || !cache.TryGetValue(Key(token), out KeyValuePair<string, string>[]? claims) || claims is null)
            return null;
        var identity = new ClaimsIdentity(claims.Select(c => new Claim(c.Key, c.Value)), UploadTokenAuth.Scheme);
        return new ClaimsPrincipal(identity);
    }

    private static string Key(string token) => "upload-token:" + token;

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

public static partial class UploadTokenAuth
{
    public const string Scheme = "UploadToken";
    public const string Header = "X-Upload-Token";

    // Лише завантаження файлів: заявка й пісня ком'юніті, заміна файлу пісні, баг-репорт зі скріншотами.
    [GeneratedRegex(@"^/api/(requests/community|songs/community|songs/\d+/audio|bug-reports/with-screenshots)/?$", RegexOptions.IgnoreCase)]
    private static partial Regex UploadPath();

    public static bool IsUploadEndpoint(HttpRequest request) =>
        (HttpMethods.IsPost(request.Method) || HttpMethods.IsPut(request.Method)) && UploadPath().IsMatch(request.Path.Value ?? "");
}

public sealed class UploadTokenAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, UploadTokenService tokens)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(UploadTokenAuth.Header, out var value)) return Task.FromResult(AuthenticateResult.NoResult());
        if (!UploadTokenAuth.IsUploadEndpoint(Request)) return Task.FromResult(AuthenticateResult.Fail("Upload token is valid only for file uploads."));
        var principal = tokens.Resolve(value.ToString());
        return Task.FromResult(principal is null
            ? AuthenticateResult.Fail("Invalid or expired upload token.")
            : AuthenticateResult.Success(new AuthenticationTicket(principal, UploadTokenAuth.Scheme)));
    }

    // Без редиректу на Google: для нативного клієнта — просто 401.
    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    }
}
