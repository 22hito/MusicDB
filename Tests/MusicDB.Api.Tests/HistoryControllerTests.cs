using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MusicDB.Api.Controllers;
using MusicDB.Api.Data;
using MusicDB.Api.Models;
using MusicDB.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace MusicDB.Api.Tests;

public class HistoryControllerTests
{
    private static HistoryController CreateController(MusicDbContext db, string? email)
    {
        var musicService = new MusicService(db, new GenreNormalizationService(new HttpClient(),
            new ConfigurationBuilder().Build(), NullLogger<GenreNormalizationService>.Instance));
        var controller = new HistoryController(db, musicService);
        var identity = email is null
            ? new ClaimsIdentity()
            : new ClaimsIdentity([new Claim(ClaimTypes.Email, email)], "TestAuth");

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }

    [Fact]
    public async Task Log_FirstListen_AddsOneHistoryEntry()
    {
        using var db = TestDb.Create();
        var controller = CreateController(db, "user@x.com");

        var result = await controller.Log(new LogListenDto(42));

        Assert.IsType<OkResult>(result);
        Assert.Single(db.ListeningHistory, h => h.UserEmail == "user@x.com" && h.MusicId == 42);
    }

    [Fact]
    public async Task Log_SameUserSameSongTwice_DoesNotDuplicate()
    {
        using var db = TestDb.Create();
        var controller = CreateController(db, "user@x.com");

        await controller.Log(new LogListenDto(42));
        var second = await controller.Log(new LogListenDto(42));

        Assert.IsType<OkResult>(second);
        Assert.Single(db.ListeningHistory);
    }

    [Fact]
    public async Task Log_SameSongDifferentUsers_CountsBoth()
    {
        using var db = TestDb.Create();

        await CreateController(db, "a@x.com").Log(new LogListenDto(1));
        await CreateController(db, "b@x.com").Log(new LogListenDto(1));

        Assert.Equal(2, db.ListeningHistory.Count());
    }

    [Fact]
    public async Task Log_Relisten_MovesSongToTopOfRecent()
    {
        using var db = TestDb.Create();
        db.Songs.AddRange(
            new Music { Id = 1, Artist = "A", Title = "First", Duration = TimeSpan.FromMinutes(3) },
            new Music { Id = 2, Artist = "B", Title = "Second", Duration = TimeSpan.FromMinutes(3) });
        db.ListeningHistory.AddRange(
            new ListeningHistory { UserEmail = "user@x.com", MusicId = 1, ListenedAt = DateTime.UtcNow.AddHours(-2) },
            new ListeningHistory { UserEmail = "user@x.com", MusicId = 2, ListenedAt = DateTime.UtcNow.AddHours(-1) },
            new ListeningHistory { UserEmail = "other@x.com", MusicId = 2 });
        await db.SaveChangesAsync();
        var controller = CreateController(db, "user@x.com");

        await controller.Log(new LogListenDto(1));
        var result = await controller.Recent();

        var items = Assert.IsType<List<HistoryItemDto>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal([1, 2], items.Select(i => i.Song.Id));
        Assert.Equal(3, db.ListeningHistory.Count()); // повторне прослуховування не додає запис
    }

    [Fact]
    public async Task Log_NoEmailClaim_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = CreateController(db, email: null);

        var result = await controller.Log(new LogListenDto(1));

        Assert.IsType<UnauthorizedResult>(result);
        Assert.Empty(db.ListeningHistory);
    }
}
