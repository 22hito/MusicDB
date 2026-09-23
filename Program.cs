using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Hubs;
using MusicDB.Api.Services;
using System.Security.Claims;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Реальні секрети (пароль БД, API-ключі) — файл у .gitignore, перекриває appsettings.json.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Render/Railway/Fly.io призначають порт через env PORT.
var renderPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(renderPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
}

builder.Services.AddDbContext<MusicDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddScoped<MusicService>();
builder.Services.AddScoped<UserDirectoryService>();
builder.Services.AddScoped<ArtistActivityService>();
builder.Services.AddScoped<AdminActivityService>();
// Файли пісень ком'юніті: Cloudflare R2, якщо заповнено Uploads:R2 (прод —
// через App Settings Azure, напр. Uploads__R2__SecretAccessKey), інакше диск.
var r2Options = builder.Configuration.GetSection("Uploads:R2").Get<R2Options>() ?? new R2Options();
if (r2Options.IsConfigured)
    builder.Services.AddSingleton<IAudioStorage>(sp => new R2AudioStorage(r2Options, sp.GetRequiredService<ILogger<R2AudioStorage>>()));
else
    builder.Services.AddSingleton<IAudioStorage, LocalAudioStorage>();
builder.Services.AddHttpClient<TranslationService>();
builder.Services.AddHttpClient<ExternalMusicSearchService>();
builder.Services.AddHttpClient<GenreNormalizationService>();
builder.Services.AddHttpClient<RecommendationService>();
builder.Services.AddHttpClient<LastFmGenreService>();

builder.Services.AddSignalR();
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

    // Без цього Google мовчки перелогінює тим самим акаунтом без вибору іншого.
    options.Events.OnRedirectToAuthorizationEndpoint = ctx =>
    {
        ctx.Response.Redirect(ctx.RedirectUri + "&prompt=select_account");
        return Task.CompletedTask;
    };

    options.Events.OnTicketReceived = async ctx =>
    {
        var db = ctx.HttpContext.RequestServices.GetRequiredService<MusicDbContext>();
        var userDirectory = ctx.HttpContext.RequestServices.GetRequiredService<UserDirectoryService>();
        var email = ctx.Principal?.FindFirstValue(ClaimTypes.Email) ?? "";
        var name = ctx.Principal?.FindFirstValue(ClaimTypes.Name);
        var picture = ctx.Principal?.FindFirstValue("picture") ?? ctx.Principal?.FindFirstValue("urn:google:picture");

        // Апсертить lab.users при кожному логіні — завжди має свіже імʼя/фото.
        await userDirectory.GetOrCreateUserIdAsync(email, name, picture);

        if (await db.Admins.AnyAsync(a => a.Email == email))
            ((ClaimsIdentity)ctx.Principal!.Identity!).AddClaim(new Claim("role", "admin"));
    };
});

builder.Services.AddAuthorization();

// Захист /api/history від накрутки лічильника: не частіше 1 запиту на юзера за 15с.
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

// Фронтенд завжди same-origin (той самий сервер віддає і API, і wwwroot) —
// CORS тут лише про можливі майбутні сторонні клієнти, не про поточний сайт.
var allowedOrigins = new[]
{
    "https://musicdb-b5c4grhhdjdjd5gv.polandcentral-01.azurewebsites.net",
    "http://localhost:5000",
};
builder.Services.AddCors(opts =>
    opts.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseCors();

// Аудіо ком'юніті з R2 грає за редиректом на *.r2.cloudflarestorage.com (підписані
// посилання) або на публічний домен бакета — їх треба дозволити в media-src.
var r2MediaSources = !r2Options.IsConfigured
    ? ""
    : " https://*.r2.cloudflarestorage.com" +
      (Uri.TryCreate(r2Options.PublicBaseUrl, UriKind.Absolute, out var r2Public) ? $" {r2Public.GetLeftPart(UriPartial.Authority)}" : "");

// Базові security-заголовки. CSP тримає 'unsafe-inline' для script/style —
// увесь UI побудований на inline onclick="..." і style="..." атрибутах
// (одна сторінка, без збірника), тож строгий nonce-based CSP вимагав би
// спершу прибрати їх усі. Навіть так CSP блокує сторонні домени/фрейми/
// плагіни поза явним білим списком, чого не було раніше жодного заголовка.
app.Use(async (ctx, next) =>
{
    var headers = ctx.Response.Headers;
    headers.XContentTypeOptions = "nosniff";
    headers.XFrameOptions = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()";
    headers.StrictTransportSecurity = "max-age=31536000; includeSubDomains";
    headers.ContentSecurityPolicy =
        "default-src 'self'; " +
        // s.ytimg.com — сюди YouTube IFrame Player API підвантажує свій
        // www-widgetapi.js у батьківський документ (не у сам iframe); без
        // нього YT.Player створюється, але керування (play/pause/стан) мовчки
        // не працює, бо CSP блокує саме цей скрипт іншого походження.
        "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https://img.youtube.com https://*.ytimg.com https://*.googleusercontent.com; " +
        "connect-src 'self' https://www.googleapis.com https://www.youtube.com; " +
        "frame-src https://www.youtube.com; " +
        // data: — беззвучний data:audio/wav-якір (#ms-anchor), що утримує media
        // session на нашій сторінці, а не на чужому youtube.com iframe; без
        // data: тут CSP блокував саме його завантаження.
        $"media-src 'self' data: https://www.youtube.com{r2MediaSources}; " +
        "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
// no-cache (не no-store): вимагає ревалідації, щоб не показувати стару версію
// після деплою, але ETag лишається — повторні візити швидкі (304).
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
        // IsPersistent=true — інакше кука сесійна й зникає при закритті браузера/Electron.
        new AuthenticationProperties { RedirectUri = "/", IsPersistent = true },
        [GoogleDefaults.AuthenticationScheme]));

app.MapPost("/auth/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok(new { message = "logged out" });
});

app.MapGet("/auth/me", async (HttpContext ctx, UserDirectoryService userDirectory) =>
{
    if (!ctx.User.Identity?.IsAuthenticated ?? true)
        return Results.Ok(new { authenticated = false });

    return Results.Ok(new
    {
        authenticated = true,
        // Opaque id з lab.users — щоб фронтенд розпізнавав власні повідомлення/дописи/рецензії.
        userId = await userDirectory.GetCurrentUserIdAsync(ctx.User),
        email = ctx.User.FindFirstValue(ClaimTypes.Email),
        name = ctx.User.FindFirstValue(ClaimTypes.Name),
        picture = ctx.User.FindFirstValue("picture") ?? ctx.User.FindFirstValue("urn:google:picture"),
        isAdmin = ctx.User.HasClaim("role", "admin")
    });
});

app.MapGet("/config", (IConfiguration config) =>
{
    // Кілька ключів для ротації при вичерпанні денної квоти YouTube Data API —
    // фронтенд сам перемикається при 403/429. YouTube:ApiKey — фолбек.
    var keys = config.GetSection("YouTube:ApiKeys").Get<string[]>();
    if (keys is not { Length: > 0 })
    {
        var single = config["YouTube:ApiKey"];
        keys = string.IsNullOrWhiteSpace(single) ? [] : [single];
    }
    return Results.Ok(new { youtubeApiKeys = keys });
});

app.MapControllers();
// Реалтайм: контролери шлють події через IHubContext<MusicHub> після кожної мутації.
app.MapHub<MusicHub>("/hubs/music");
app.MapFallbackToFile("index.html");

app.Run();
