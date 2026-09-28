using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using MusicDB.Api.Controllers;
using MusicDB.Api.Data;
using MusicDB.Api.Hubs;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class CorrectionsTests
{
    private sealed class NullHub : IHubContext<MusicHub>
    {
        private sealed class Proxy : IClientProxy
        {
            public Task SendCoreAsync(string method, object?[] args, CancellationToken ct = default) => Task.CompletedTask;
        }
        private sealed class Clients : IHubClients
        {
            private static readonly Proxy P = new();
            public IClientProxy All => P;
            public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => P;
            public IClientProxy Client(string connectionId) => P;
            IClientProxy IHubClients<IClientProxy>.Clients(IReadOnlyList<string> connectionIds) => P;
            public IClientProxy Group(string groupName) => P;
            public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => P;
            public IClientProxy Groups(IReadOnlyList<string> groupNames) => P;
            public IClientProxy User(string userId) => P;
            public IClientProxy Users(IReadOnlyList<string> userIds) => P;
        }
        IHubClients IHubContext<MusicHub>.Clients { get; } = new Clients();
        public IGroupManager Groups => throw new NotSupportedException();
    }

    private static readonly LocalAudioStorage Storage = new(
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Uploads:AudioPath"] = Path.Combine(Path.GetTempPath(), "musicdb-test-corrections", Guid.NewGuid().ToString("N"))
        }).Build(),
        null!);

    private static IFormFile Mp3() => new FormFile(new MemoryStream(new byte[64]), 0, 64, "audio", "song.mp3");

    private static CorrectionsController Create(MusicDbContext db, string email, bool admin = false)
    {
        var hub = new NullHub();
        var controller = new CorrectionsController(db, new UserDirectoryService(db), new AdminActivityService(db, hub), hub, Storage,
            new CatalogCache(new MemoryCache(new MemoryCacheOptions())));
        var claims = new List<Claim> { new(ClaimTypes.Email, email), new(ClaimTypes.Name, email.Split('@')[0]) };
        if (admin) claims.Add(new Claim("role", "admin"));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };
        return controller;
    }

    private static Music Song(MusicDbContext db)
    {
        var song = new Music { Artist = "Nirvana", Title = "Dumb", Duration = TimeSpan.FromMinutes(2.5), Release = new DateOnly(1993, 9, 21) };
        db.Songs.Add(song);
        db.SaveChanges();
        return song;
    }

    [Fact]
    public async Task Create_SongCorrection_SavesLabelAndNotifiesAdmins()
    {
        using var db = TestDb.Create();
        var song = Song(db);
        var result = await Create(db, "user@x.com").Create(song.Id, null, "Genres", "  Це grunge, а не chamber punk  ", "https://en.wikipedia.org/wiki/In_Utero", null);

        Assert.IsType<OkObjectResult>(result);
        var r = Assert.Single(db.CorrectionRequests);
        Assert.Equal("genres", r.Field);
        Assert.Equal("Це grunge, а не chamber punk", r.Message);
        Assert.Equal("Nirvana — Dumb", r.TargetLabel);
        Assert.Equal("open", r.Status);
        Assert.Equal(AdminActivityService.CorrectionRequested, Assert.Single(db.AdminEvents).EventType);
    }

    [Theory]
    [InlineData("bio", "Опис застарів")]          // поле виконавця для пісні
    [InlineData("genres", "так")]                 // надто коротко
    [InlineData("audio", "ось файл")]             // файл пісні без файлу
    public async Task Create_Invalid_IsRejected(string field, string message)
    {
        using var db = TestDb.Create();
        var song = Song(db);
        Assert.IsType<BadRequestObjectResult>(await Create(db, "user@x.com").Create(song.Id, null, field, message, null, null));
        Assert.Empty(db.CorrectionRequests);
    }

    [Fact]
    public async Task Create_NonHttpSource_IsRejected()
    {
        using var db = TestDb.Create();
        var song = Song(db);
        Assert.IsType<BadRequestObjectResult>(await Create(db, "user@x.com").Create(song.Id, null, "album", "Інший альбом", "javascript:alert(1)", null));
    }

    [Fact]
    public async Task Create_TooMany_Returns429()
    {
        using var db = TestDb.Create();
        var song = Song(db);
        var c = Create(db, "user@x.com");
        for (var i = 0; i < CorrectionsController.MaxPerHour; i++)
            Assert.IsType<OkObjectResult>(await c.Create(song.Id, null, "other", $"Правка номер {i}", null, null));
        var over = Assert.IsType<ObjectResult>(await c.Create(song.Id, null, "other", "Ще одна правка", null, null));
        Assert.Equal(StatusCodes.Status429TooManyRequests, over.StatusCode);
    }

    [Fact]
    public async Task ApplyAudio_AttachesFileToSong_AndClosesRequest()
    {
        using var db = TestDb.Create();
        var song = Song(db);
        Assert.IsType<OkObjectResult>(await Create(db, "user@x.com").Create(song.Id, null, "audio", "", null, Mp3()));
        var request = Assert.Single(db.CorrectionRequests);
        var file = request.AudioFile;
        Assert.NotNull(file);

        Assert.IsType<OkResult>(await Create(db, "admin@x.com", admin: true).ApplyAudio(request.Id));
        Assert.Equal(file, db.Songs.Single().AudioFile);
        Assert.Null(request.AudioFile);
        Assert.Equal("done", request.Status);
        Assert.NotNull(request.ResolvedBy);
    }

    [Fact]
    public async Task Mine_ShowsOnlyOwnRequests_WithAdminNote()
    {
        using var db = TestDb.Create();
        var song = Song(db);
        await Create(db, "a@x.com").Create(song.Id, null, "release", "Реліз 21 вересня 1993", null, null);
        await Create(db, "b@x.com").Create(song.Id, null, "album", "Альбом In Utero", null, null);
        var id = db.CorrectionRequests.Single(r => r.Field == "release").Id;
        await Create(db, "admin@x.com", admin: true).SetStatus(id, new ResolveCorrectionDto("rejected", "У джерелі інша дата"));

        var mine = Assert.IsType<OkObjectResult>((await Create(db, "a@x.com").GetMine()).Result).Value as List<CorrectionDto>;
        var only = Assert.Single(mine!);
        Assert.Equal("rejected", only.Status);
        Assert.Equal("У джерелі інша дата", only.AdminNote);
    }
}
