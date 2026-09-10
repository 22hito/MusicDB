using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MusicDB.Api.Controllers;
using MusicDB.Api.Data;
using MusicDB.Api.Models;

namespace MusicDB.Api.Tests;

public class HistoryControllerTests
{
    private static HistoryController CreateController(MusicDbContext db, string? email)
    {
        var controller = new HistoryController(db);
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
    public async Task Log_NoEmailClaim_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = CreateController(db, email: null);

        var result = await controller.Log(new LogListenDto(1));

        Assert.IsType<UnauthorizedResult>(result);
        Assert.Empty(db.ListeningHistory);
    }
}
