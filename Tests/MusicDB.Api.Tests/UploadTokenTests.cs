using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class UploadTokenTests
{
    private sealed class Monitor : IOptionsMonitor<AuthenticationSchemeOptions>
    {
        public AuthenticationSchemeOptions CurrentValue { get; } = new();
        public AuthenticationSchemeOptions Get(string? name) => CurrentValue;
        public IDisposable? OnChange(Action<AuthenticationSchemeOptions, string?> listener) => null;
    }

    private static UploadTokenService Service() => new(new MemoryCache(new MemoryCacheOptions()));

    private static ClaimsPrincipal User(bool admin = false)
    {
        var claims = new List<Claim> { new(ClaimTypes.Email, "user@x.com"), new(ClaimTypes.Name, "user") };
        if (admin) claims.Add(new Claim("role", "admin"));
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Cookies"));
    }

    private static async Task<AuthenticateResult> Authenticate(UploadTokenService tokens, string method, string path, string? token)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = method;
        ctx.Request.Path = path;
        if (token is not null) ctx.Request.Headers[UploadTokenAuth.Header] = token;
        var handler = new UploadTokenAuthenticationHandler(new Monitor(), NullLoggerFactory.Instance, UrlEncoder.Default, tokens);
        await handler.InitializeAsync(new AuthenticationScheme(UploadTokenAuth.Scheme, null, typeof(UploadTokenAuthenticationHandler)), ctx);
        return await handler.AuthenticateAsync();
    }

    [Fact]
    public void Token_CarriesUserClaims()
    {
        var tokens = Service();
        var principal = tokens.Resolve(tokens.Create(User(admin: true)));
        Assert.NotNull(principal);
        Assert.Equal("user@x.com", principal!.FindFirstValue(ClaimTypes.Email));
        Assert.Equal("admin", principal.FindFirstValue("role"));
        Assert.True(principal.Identity!.IsAuthenticated);
        Assert.Null(tokens.Resolve("not-a-token"));
    }

    [Theory]
    [InlineData("POST", "/api/requests/community", true)]
    [InlineData("POST", "/api/songs/community", true)]
    [InlineData("PUT", "/api/songs/42/audio", true)]
    [InlineData("POST", "/api/bug-reports/with-screenshots", true)]
    [InlineData("GET", "/api/requests/community", false)]
    [InlineData("POST", "/api/requests", false)]
    [InlineData("DELETE", "/api/songs/42", false)]
    [InlineData("POST", "/api/messages/5", false)]
    public void Token_IsAcceptedOnlyOnUploadEndpoints(string method, string path, bool expected)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = method;
        ctx.Request.Path = path;
        Assert.Equal(expected, UploadTokenAuth.IsUploadEndpoint(ctx.Request));
    }

    [Fact]
    public async Task Handler_AuthenticatesUploads_AndRejectsEverythingElse()
    {
        var tokens = Service();
        var token = tokens.Create(User());

        var ok = await Authenticate(tokens, "POST", "/api/requests/community", token);
        Assert.True(ok.Succeeded);
        Assert.Equal("user@x.com", ok.Principal!.FindFirstValue(ClaimTypes.Email));

        Assert.False((await Authenticate(tokens, "POST", "/api/messages/5", token)).Succeeded);   // не завантаження
        Assert.False((await Authenticate(tokens, "POST", "/api/requests/community", "forged")).Succeeded);
        Assert.True((await Authenticate(tokens, "POST", "/api/requests/community", null)).None); // без заголовка — не наша справа
    }
}
