using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MusicDB.Api.Controllers;
using MusicDB.Api.Data;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

// GET /api/notifications/badge — ті самі умови, що й окремі ендпоінти, з яких раніше складались бейджі.
public class BadgeCountsTests
{
    [Fact]
    public async Task Badge_CountsOnlyUnreadAndForeign_InEveryCategory()
    {
        await using var db = TestDb.Create();
        var t0 = DateTime.UtcNow.AddHours(-1);
        db.Users.AddRange(new User { Id = 1, Email = "me@x" }, new User { Id = 2, Email = "two@x" }, new User { Id = 3, Email = "three@x" });

        // Виконавці: стежу з позначкою «прочитано» t0 — непрочитані лише новіші події.
        db.ArtistFollows.Add(new ArtistFollow { UserId = 1, ArtistId = 10, LastReadAt = t0 });
        db.ArtistEvents.AddRange(
            new ArtistEvent { Id = 1, ArtistId = 10, CreatedAt = t0.AddMinutes(-5) },
            new ArtistEvent { Id = 2, ArtistId = 10, CreatedAt = t0.AddMinutes(5) },
            new ArtistEvent { Id = 3, ArtistId = 10, CreatedAt = t0.AddMinutes(6) },
            new ArtistEvent { Id = 4, ArtistId = 99, CreatedAt = t0.AddMinutes(7) }); // на нього не підписаний

        // Обговорення: нове від іншого — так; моє, старе — ні.
        db.DiscussionThreads.Add(new DiscussionThread { Id = 1, AuthorId = 2, Title = "T" });
        db.ThreadFollows.Add(new ThreadFollow { UserId = 1, ThreadId = 1, FollowedAt = t0.AddHours(-1), LastReadAt = t0 });
        db.DiscussionPosts.AddRange(
            new DiscussionPost { Id = 1, ThreadId = 1, AuthorId = 2, Body = "a", CreatedAt = t0.AddMinutes(5) },
            new DiscussionPost { Id = 2, ThreadId = 1, AuthorId = 1, Body = "b", CreatedAt = t0.AddMinutes(6) },
            new DiscussionPost { Id = 3, ThreadId = 1, AuthorId = 2, Body = "c", CreatedAt = t0.AddMinutes(-5) });

        // Друзі: лише вхідні, що чекають.
        db.FriendRequests.AddRange(
            new FriendRequest { Id = 1, RequesterId = 2, AddresseeId = 1, Status = "pending" },
            new FriendRequest { Id = 2, RequesterId = 3, AddresseeId = 1, Status = "accepted" },
            new FriendRequest { Id = 3, RequesterId = 1, AddresseeId = 3, Status = "pending" });

        // Адмін: новіше за позначку, крім власних дій.
        db.AdminNotificationReads.Add(new AdminNotificationRead { UserId = 1, LastReadAt = t0 });
        db.AdminEvents.AddRange(
            new AdminEvent { Id = 1, ActorUserId = 2, CreatedAt = t0.AddMinutes(5) },
            new AdminEvent { Id = 2, ActorUserId = 1, CreatedAt = t0.AddMinutes(5) },
            new AdminEvent { Id = 3, ActorUserId = null, CreatedAt = t0.AddMinutes(5) },
            new AdminEvent { Id = 4, ActorUserId = 2, CreatedAt = t0.AddMinutes(-5) });

        // Листування: непрочитані від тих, із ким листування дозволене; від №3 — запит, що чекає (не в «Особистих»).
        db.DmRequests.Add(new DmRequest { Id = 1, RequesterId = 3, AddresseeId = 1, Status = "pending" });
        db.DirectMessages.AddRange(
            new DirectMessage { Id = 1, SenderId = 2, RecipientId = 1 },
            new DirectMessage { Id = 2, SenderId = 2, RecipientId = 1 },
            new DirectMessage { Id = 3, SenderId = 2, RecipientId = 1, ReadAt = DateTime.UtcNow },
            new DirectMessage { Id = 4, SenderId = 3, RecipientId = 1 },
            new DirectMessage { Id = 5, SenderId = 1, RecipientId = 2 });
        await db.SaveChangesAsync();

        var controller = new NotificationsController(db, new UserDirectoryService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Email, "me@x"), new Claim("role", "admin")], "test")),
                },
            },
        };
        var result = Assert.IsType<OkObjectResult>((await controller.Badge()).Result);
        Assert.Equal(new BadgeCountsDto(Artist: 2, Threads: 1, FriendRequests: 1, Admin: 2, Dm: 2, DmRequests: 1), result.Value);
    }
}
