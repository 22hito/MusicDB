using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MusicDB.Api.Controllers;
using MusicDB.Api.Data;
using MusicDB.Api.Hubs;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class BugReportsTests
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
            ["Uploads:AudioPath"] = Path.Combine(Path.GetTempPath(), "musicdb-test-shots", Guid.NewGuid().ToString("N"))
        }).Build(),
        null!);

    private static IFormFile Png(string name = "shot.png", int size = 16) =>
        new FormFile(new MemoryStream(new byte[size]), 0, size, "screenshots", name);

    private static BugReportsController Create(MusicDbContext db, string email, bool admin = false)
    {
        var hub = new NullHub();
        var controller = new BugReportsController(db, new UserDirectoryService(db), new AdminActivityService(db, hub), hub, Storage);
        var claims = new List<Claim> { new(ClaimTypes.Email, email), new(ClaimTypes.Name, email.Split('@')[0]) };
        if (admin) claims.Add(new Claim("role", "admin"));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };
        return controller;
    }

    [Fact]
    public async Task Create_SavesReport_AndNotifiesAdmins()
    {
        using var db = TestDb.Create();
        var result = await Create(db, "user@x.com").Create(new CreateBugReportDto("  Пісня не грає після перемикання  ", "page: home"));

        Assert.IsType<OkObjectResult>(result);
        var report = Assert.Single(db.BugReports);
        Assert.Equal("Пісня не грає після перемикання", report.Description);
        Assert.Equal("open", report.Status);
        var evt = Assert.Single(db.AdminEvents);
        Assert.Equal(AdminActivityService.BugReported, evt.EventType);
    }

    [Fact]
    public async Task Create_TooShort_IsRejected()
    {
        using var db = TestDb.Create();
        Assert.IsType<BadRequestObjectResult>(await Create(db, "user@x.com").Create(new CreateBugReportDto("зламано", null)));
        Assert.Empty(db.BugReports);
    }

    [Fact]
    public async Task Create_RateLimited_AfterFivePerHour()
    {
        using var db = TestDb.Create();
        var c = Create(db, "user@x.com");
        for (var i = 0; i < BugReportsController.MaxPerHour; i++)
            Assert.IsType<OkObjectResult>(await c.Create(new CreateBugReportDto($"Баг номер {i} докладно", null)));

        var sixth = Assert.IsType<ObjectResult>(await c.Create(new CreateBugReportDto("Ще один баг докладно", null)));
        Assert.Equal(StatusCodes.Status429TooManyRequests, sixth.StatusCode);
    }

    [Fact]
    public async Task Admin_ResolvesAndReopens()
    {
        using var db = TestDb.Create();
        await Create(db, "user@x.com").Create(new CreateBugReportDto("Кнопка не натискається", null));
        var id = db.BugReports.Single().Id;
        var admin = Create(db, "admin@x.com", admin: true);

        await admin.SetStatus(id, new SetBugReportStatusDto("resolved"));
        var resolved = Assert.IsType<List<BugReportDto>>(((await admin.GetAll("resolved")).Result as OkObjectResult)!.Value);
        Assert.Equal("admin", Assert.Single(resolved).ResolvedBy?.DisplayName);
        Assert.Equal(0, ((await admin.GetOpenCount()).Result as OkObjectResult)!.Value);

        await admin.SetStatus(id, new SetBugReportStatusDto("open"));
        var open = Assert.IsType<List<BugReportDto>>(((await admin.GetAll("open")).Result as OkObjectResult)!.Value);
        Assert.Null(Assert.Single(open).ResolvedBy);
        Assert.IsType<BadRequestObjectResult>(await admin.SetStatus(id, new SetBugReportStatusDto("deleted")));
    }

    [Fact]
    public async Task CreateWithScreenshots_SavesFiles_AndAdminCanOpenThem()
    {
        using var db = TestDb.Create();
        var result = await Create(db, "user@x.com").CreateWithScreenshots("Меню вилазить за екран на телефоні", null, [Png(), Png("b.jpg")]);

        Assert.IsType<OkObjectResult>(result);
        var report = Assert.Single(db.BugReports);
        Assert.Equal(2, report.Screenshots.Length);
        Assert.All(report.Screenshots, n => Assert.StartsWith("shot-", n));

        var admin = Create(db, "admin@x.com", admin: true);
        var list = Assert.IsType<List<BugReportDto>>(((await admin.GetAll("open")).Result as OkObjectResult)!.Value);
        Assert.Equal(2, Assert.Single(list).ScreenshotCount);
        var file = Assert.IsType<PhysicalFileResult>(await admin.GetScreenshot(report.Id, 1));
        Assert.Equal("image/jpeg", file.ContentType);
        Assert.IsType<NotFoundResult>(await admin.GetScreenshot(report.Id, 2));
    }

    [Fact]
    public async Task CreateWithScreenshots_RejectsWrongFormat_TooManyAndTooBig_WithoutSavingAnything()
    {
        using var db = TestDb.Create();
        var c = Create(db, "user@x.com");
        Assert.IsType<BadRequestObjectResult>(await c.CreateWithScreenshots("Опис достатньої довжини", null, [Png(), Png("x.exe")]));
        Assert.IsType<BadRequestObjectResult>(await c.CreateWithScreenshots("Опис достатньої довжини", null, [Png(), Png(), Png(), Png()]));
        Assert.IsType<BadRequestObjectResult>(await c.CreateWithScreenshots("Опис достатньої довжини", null,
            [Png(size: (int)AudioFiles.MaxImageBytes + 1)]));
        Assert.Empty(db.BugReports);
    }
}
