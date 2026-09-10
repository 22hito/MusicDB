using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Services;
using System.Security.Claims;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Реальні секрети (пароль БД, API-ключі) — файл у .gitignore, у appsettings.json
// лише порожні плейсхолдери. optional:true — на сервері секрети йдуть через
// env vars, файлу нема. Додається після appsettings.json, тож перекриває плейсхолдери.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Render/Railway/Fly.io призначають порт через env PORT — слухаємо на ньому.
// Локально PORT не задано, тож використовується "Urls" з appsettings.json.
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

// Захист /api/history від накрутки лічильника прослуховувань: не частіше
// одного зарахованого запиту на юзера за 15с (реальне прослуховування й так
// вимагає щонайменше стільки часу — звичайного користувача це не обмежує).
builder.Services.AddRateLimiter(opts =>
{
    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    opts.AddPolicy("history", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.User.FindFirst(ClaimTypes.Email)?.Value
            ?? ctx.Connection.RemoteIpAddress?.ToString()
            ?? "anon",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromSeconds(15),
            PermitLimit = 2,
            QueueLimit = 0,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst
        }));
});

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
// no-cache (не no-store): без явних заголовків браузер кешує index.html
// надовго і показує стару версію після деплою навіть при Ctrl+F5.
// ETag-валідація лишається — повторні візити швидкі (304).
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "no-cache";
    }
});
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

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
{
    // Кілька ключів (кожен — свій GCP-проєкт) для ротації при вичерпанні денної
    // квоти YouTube Data API (10000 одиниць/добу НА ПРОЄКТ, не на ключ) —
    // фронтенд сам перемикається на наступний при 403/429. YouTube:ApiKey
    // лишається як фолбек для сумісності, якщо масив не налаштований.
    var keys = config.GetSection("YouTube:ApiKeys").Get<string[]>();
    if (keys is not { Length: > 0 })
    {
        var single = config["YouTube:ApiKey"];
        keys = string.IsNullOrWhiteSpace(single) ? [] : [single];
    }
    return Results.Ok(new { youtubeApiKeys = keys });
});

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
