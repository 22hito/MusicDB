using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Services;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Хостинги типу Render/Railway/Fly.io самі призначають порт і передають
// його через змінну середовища PORT — слухати треба саме на ньому.
// Локально (де PORT не задано) далі спрацює "Urls" з appsettings.json,
// як і раніше.
var renderPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(renderPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
}

builder.Services.AddDbContext<MusicDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddScoped<MusicService>();
builder.Services.AddHttpClient<TranslationService>();
builder.Services.AddHttpClient<ExternalMusicSearchService>();
builder.Services.AddHttpClient<GenreNormalizationService>();
builder.Services.AddHttpClient<RecommendationService>();
builder.Services.AddHttpClient<LastFmGenreService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
    c.SwaggerDoc("v1", new() { Title = "MusicDB API", Version = "v1" }));

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.Name = "MusicDB.Session";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;

    // Повертаємо статус-коди замість редіректу для /api маршрутів
    options.Events.OnRedirectToLogin = ctx =>
    {
        if (ctx.Request.Path.StartsWithSegments("/api"))
            ctx.Response.StatusCode = 401;
        else
            ctx.Response.Redirect(ctx.RedirectUri);
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = ctx =>
    {
        if (ctx.Request.Path.StartsWithSegments("/api"))
            ctx.Response.StatusCode = 403;
        else
            ctx.Response.Redirect(ctx.RedirectUri);
        return Task.CompletedTask;
    };
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"]!;
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"]!;
    options.CallbackPath = "/signin-google";
    options.SaveTokens = false;

    options.Events.OnTicketReceived = async ctx =>
    {
        var db = ctx.HttpContext.RequestServices.GetRequiredService<MusicDbContext>();
        var email = ctx.Principal?.FindFirstValue(ClaimTypes.Email) ?? "";

        if (await db.Admins.AnyAsync(a => a.Email == email))
            ((ClaimsIdentity)ctx.Principal!.Identity!).AddClaim(new Claim("role", "admin"));
    };
});

builder.Services.AddAuthorization();

builder.Services.AddCors(opts =>
    opts.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
// no-cache: під час активної розробки браузер інакше кешує index.html
// надовго (heuristic caching без явних заголовків) і після кожного
// деплою користувач бачить стару версію, навіть з Ctrl+F5. no-cache
// (не no-store) лишає ETag-валідацію — повторні візити швидкі (304),
// але браузер завжди питає сервер, чи файл не змінився.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "no-cache";
    }
});
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/auth/login", () =>
    Results.Challenge(
        new AuthenticationProperties { RedirectUri = "/" },
        [GoogleDefaults.AuthenticationScheme]));

app.MapPost("/auth/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok(new { message = "logged out" });
});

app.MapGet("/auth/me", (HttpContext ctx) =>
{
    if (!ctx.User.Identity?.IsAuthenticated ?? true)
        return Results.Ok(new { authenticated = false });

    return Results.Ok(new
    {
        authenticated = true,
        email = ctx.User.FindFirstValue(ClaimTypes.Email),
        name = ctx.User.FindFirstValue(ClaimTypes.Name),
        picture = ctx.User.FindFirstValue("picture") ?? ctx.User.FindFirstValue("urn:google:picture"),
        isAdmin = ctx.User.HasClaim("role", "admin")
    });
});

app.MapGet("/config", (IConfiguration config) =>
    Results.Ok(new { youtubeApiKey = config["YouTube:ApiKey"] ?? "" }));

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
