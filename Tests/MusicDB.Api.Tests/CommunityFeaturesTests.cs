using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MusicDB.Api.Controllers;
using MusicDB.Api.Data;
using MusicDB.Api.Hubs;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

// Головна таблиця_2, сповіщення адмінів, особисті повідомлення, оцінки.
public class CommunityFeaturesTests
{
    private sealed class NullHubContext : IHubContext<MusicHub>
    {
        private sealed class NullProxy : IClientProxy
        {
            public Task SendCoreAsync(string method, object?[] args, CancellationToken ct = default) => Task.CompletedTask;
        }
        private sealed class NullClients : IHubClients
        {
            private static readonly NullProxy Proxy = new();
            public IClientProxy All => Proxy;
            public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => Proxy;
            public IClientProxy Client(string connectionId) => Proxy;
            public IClientProxy Clients(IReadOnlyList<string> connectionIds) => Proxy;
            public IClientProxy Group(string groupName) => Proxy;
            public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => Proxy;
            public IClientProxy Groups(IReadOnlyList<string> groupNames) => Proxy;
            public IClientProxy User(string userId) => Proxy;
            public IClientProxy Users(IReadOnlyList<string> userIds) => Proxy;
        }
        public IHubClients Clients { get; } = new NullClients();
        public IGroupManager Groups => throw new NotSupportedException();
    }

    private static readonly IHubContext<MusicHub> Hub = new NullHubContext();

    private static T WithUser<T>(T controller, string email, bool admin = false) where T : ControllerBase
    {
        var claims = new List<Claim> { new(ClaimTypes.Email, email), new(ClaimTypes.Name, email.Split('@')[0]) };
        if (admin) claims.Add(new Claim("role", "admin"));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };
        return controller;
    }

    private static MusicService CreateMusicService(MusicDbContext db) => new(db, new GenreNormalizationService(
        new HttpClient(), new ConfigurationBuilder().Build(), NullLogger<GenreNormalizationService>.Instance));

    private static LocalAudioStorage CreateAudioStorage() => new(
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Uploads:AudioPath"] = Path.Combine(Path.GetTempPath(), "musicdb-test-audio", Guid.NewGuid().ToString("N"))
        }).Build(),
        null!);

    private static RequestsController CreateRequestsController(MusicDbContext db, string email, bool admin = false, IAudioStorage? storage = null)
    {
        var dir = new UserDirectoryService(db);
        return WithUser(new RequestsController(db, CreateMusicService(db), new TranslationService(new HttpClient()),
            new ArtistActivityService(db), new AdminActivityService(db, Hub), dir, storage ?? CreateAudioStorage(), new CatalogCache(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())), Hub), email, admin);
    }

    private static IFormFile FakeMp3() =>
        new FormFile(new MemoryStream([1, 2, 3, 4]), 0, 4, "audio", "my-song.mp3");

    [Fact]
    public async Task CommunityRequest_WithoutFileAndWithoutYoutube_IsRejected()
    {
        using var db = TestDb.Create();
        var controller = CreateRequestsController(db, "user@x.com");

        var result = await controller.CreateCommunity(new CommunitySongForm
        {
            Artist = "Me", Title = "My Song", Release = "2025-01-01", Duration = "00:03:00", Genres = "rock"
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Requests);
    }

    [Fact]
    public async Task CommunityRequest_WithYoutubeOnly_IsAccepted()
    {
        using var db = TestDb.Create();
        var controller = CreateRequestsController(db, "user@x.com");

        await controller.CreateCommunity(new CommunitySongForm
        {
            Artist = "Me", Title = "My Song", Release = "2025-01-01", Duration = "00:03:00", Genres = "rock",
            YoutubeVideo = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        });

        var req = Assert.Single(db.Requests);
        Assert.Equal(SongSources.Community, req.Kind);
        Assert.Equal("dQw4w9WgXcQ", req.YoutubeVideoId);
        Assert.Null(req.AudioFile);
    }

    [Fact]
    public async Task ApproveCommunityRequest_CreatesCommunitySongWithSubmitter_AndDoesNotMergeIntoCatalog()
    {
        using var db = TestDb.Create();
        // Однойменна пісня в каталозі — заявку в таблицю_2 НЕ можна з нею зливати.
        db.Songs.Add(new Music { Id = 500, Artist = "Me", Title = "My Song", Duration = TimeSpan.FromMinutes(3) });
        await db.SaveChangesAsync();

        var storage = CreateAudioStorage();
        var userController = CreateRequestsController(db, "user@x.com", storage: storage);
        await userController.CreateCommunity(new CommunitySongForm
        {
            Artist = "Me", Title = "My Song", Release = "2025-01-01", Duration = "00:03:00", Genres = "rock",
            Audio = FakeMp3()
        });
        var req = Assert.Single(db.Requests);
        Assert.NotNull(req.AudioFile);
        Assert.NotNull(await storage.OpenAsync(req.AudioFile));

        var adminController = CreateRequestsController(db, "admin@x.com", admin: true, storage: storage);
        await adminController.Approve(req.Id);
        // Файл переходить до пісні — не видаляється разом із заявкою.
        Assert.NotNull(await storage.OpenAsync(req.AudioFile));

        var community = Assert.Single(db.Songs, m => m.Source == SongSources.Community);
        Assert.Equal(req.RequesterUserId, community.SubmittedByUserId);
        Assert.Equal(req.AudioFile, community.AudioFile);
        Assert.Equal(2, db.Songs.Count());

        var dto = (await CreateMusicService(db).BuildSongDtosAsync([community]))[0];
        Assert.Equal("community", dto.Source);
        Assert.Equal("user", dto.SubmittedBy?.DisplayName);
        Assert.Equal($"/api/songs/{community.Id}/audio", dto.AudioUrl);
    }

    [Fact]
    public async Task AdminNotifications_ShowOtherAdminsActions_ButNotOwn()
    {
        using var db = TestDb.Create();
        var user = CreateRequestsController(db, "user@x.com");
        await user.Create(new CreateRequestDto("A", "One", "2020-01-01", "00:03:00", ["rock"], null));
        await user.Create(new CreateRequestDto("B", "Two", "2020-01-01", "00:03:00", ["rock"], null));

        var hito = CreateRequestsController(db, "hito@x.com", admin: true);
        var firstId = db.Requests.Single(r => r.Title == "One").Id;
        await hito.Approve(firstId);

        var dir = new UserDirectoryService(db);
        var forHito = (await WithUser(new AdminNotificationsController(db, dir), "hito@x.com", admin: true).Get()).Result as OkObjectResult;
        var hitoSummary = Assert.IsType<AdminNotificationsSummaryDto>(forHito!.Value);
        Assert.DoesNotContain(hitoSummary.Recent, n => n.EventType == AdminActivityService.RequestApproved);
        Assert.Equal(2, hitoSummary.UnreadCount); // дві заявки від користувача

        var otherAdmin = WithUser(new AdminNotificationsController(db, dir), "other@x.com", admin: true);
        var summary = Assert.IsType<AdminNotificationsSummaryDto>(((await otherAdmin.Get()).Result as OkObjectResult)!.Value);
        var approved = Assert.Single(summary.Recent, n => n.EventType == AdminActivityService.RequestApproved);
        Assert.Equal("hito", approved.Actor?.DisplayName);
        Assert.Equal("A — One", approved.Label);

        await otherAdmin.MarkAllRead();
        var afterRead = Assert.IsType<AdminNotificationsSummaryDto>(((await otherAdmin.Get()).Result as OkObjectResult)!.Value);
        Assert.Equal(0, afterRead.UnreadCount);
    }

    private static async Task MakeFriendsAsync(MusicDbContext db, int a, int b)
    {
        db.FriendRequests.Add(new FriendRequest { RequesterId = a, AddresseeId = b, Status = "accepted" });
        await db.SaveChangesAsync();
    }

    private static T Ok<T>(ActionResult<T> result) => Assert.IsType<T>((result.Result as OkObjectResult)!.Value);

    [Fact]
    public async Task Messages_BetweenFriends_GoStraightToConversation_AndOpenMarksRead()
    {
        using var db = TestDb.Create();
        var dir = new UserDirectoryService(db);
        var aliceId = await dir.GetOrCreateUserIdAsync("alice@x.com", "alice", null);
        var bobId = await dir.GetOrCreateUserIdAsync("bob@x.com", "bob", null);
        await MakeFriendsAsync(db, aliceId, bobId);
        var alice = WithUser(new MessagesController(db, dir, Hub), "alice@x.com");
        await alice.Send(bobId, new SendMessageDto("  привіт  "));

        var bob = WithUser(new MessagesController(db, dir, Hub), "bob@x.com");
        var conv = Assert.Single(Ok(await bob.GetConversations()));
        Assert.Equal("alice", conv.DisplayName);
        Assert.Equal("привіт", conv.LastMessage);
        Assert.Equal(1, conv.UnreadCount);
        Assert.Equal("friends", conv.State);
        Assert.Empty(Ok(await bob.GetRequests()));

        var thread = Ok(await bob.GetThread(aliceId));
        Assert.True(thread.CanSend);
        Assert.False(Assert.Single(thread.Messages).IsMine);
        Assert.Equal(0, Ok(await bob.GetUnreadCount()).Unread);
    }

    [Fact]
    public async Task Messages_ClearForMe_HidesOnlyForMe_UntilNewMessage()
    {
        using var db = TestDb.Create();
        var dir = new UserDirectoryService(db);
        var aliceId = await dir.GetOrCreateUserIdAsync("alice@x.com", "alice", null);
        var bobId = await dir.GetOrCreateUserIdAsync("bob@x.com", "bob", null);
        await MakeFriendsAsync(db, aliceId, bobId);
        var alice = WithUser(new MessagesController(db, dir, Hub), "alice@x.com");
        var bob = WithUser(new MessagesController(db, dir, Hub), "bob@x.com");
        await alice.Send(bobId, new SendMessageDto("старе 1"));
        await bob.Send(aliceId, new SendMessageDto("старе 2"));
        await alice.Send(bobId, new SendMessageDto("непрочитане"));

        Assert.IsType<NoContentResult>(await bob.ClearForMe(aliceId));

        Assert.Empty(Ok(await bob.GetConversations()));
        Assert.Empty(Ok(await bob.GetThread(aliceId)).Messages);
        Assert.Equal(0, Ok(await bob.GetUnreadCount()).Unread); // приховане не висить непрочитаним
        Assert.Equal(3, Ok(await alice.GetThread(bobId)).Messages.Count); // у alice все на місці

        await alice.Send(bobId, new SendMessageDto("нове"));
        var conv = Assert.Single(Ok(await bob.GetConversations()));
        Assert.Equal("нове", conv.LastMessage);
        Assert.Equal("нове", Assert.Single(Ok(await bob.GetThread(aliceId)).Messages).Body);
    }

    [Fact]
    public async Task Messages_ToNonFriend_BecomeRequest_UntilAccepted()
    {
        using var db = TestDb.Create();
        var dir = new UserDirectoryService(db);
        var aliceId = await dir.GetOrCreateUserIdAsync("alice@x.com", "alice", null);
        var bobId = await dir.GetOrCreateUserIdAsync("bob@x.com", "bob", null);
        var alice = WithUser(new MessagesController(db, dir, Hub), "alice@x.com");
        var bob = WithUser(new MessagesController(db, dir, Hub), "bob@x.com");

        Assert.IsType<OkObjectResult>((await alice.Send(bobId, new SendMessageDto("можна написати?"))).Result);
        // Поки bob не схвалив — друге повідомлення не проходить.
        Assert.IsType<ConflictObjectResult>((await alice.Send(bobId, new SendMessageDto("ще раз"))).Result);

        Assert.Empty(Ok(await bob.GetConversations()));
        var req = Assert.Single(Ok(await bob.GetRequests()));
        Assert.Equal("alice", req.DisplayName);
        Assert.Equal("можна написати?", req.Preview);
        var counts = Ok(await bob.GetUnreadCount());
        Assert.Equal(0, counts.Unread);
        Assert.Equal(1, counts.Requests);
        Assert.Equal("pending_outgoing", Assert.Single(Ok(await alice.GetConversations())).State);

        await bob.AcceptRequest(aliceId);
        Assert.Empty(Ok(await bob.GetRequests()));
        Assert.Equal("accepted", Assert.Single(Ok(await bob.GetConversations())).State);
        Assert.IsType<OkObjectResult>((await alice.Send(bobId, new SendMessageDto("дякую!"))).Result);
    }

    [Fact]
    public async Task Messages_DeclinedRequest_BlocksSender_ButReplyByRecipientReopens()
    {
        using var db = TestDb.Create();
        var dir = new UserDirectoryService(db);
        var aliceId = await dir.GetOrCreateUserIdAsync("alice@x.com", "alice", null);
        var bobId = await dir.GetOrCreateUserIdAsync("bob@x.com", "bob", null);
        var alice = WithUser(new MessagesController(db, dir, Hub), "alice@x.com");
        var bob = WithUser(new MessagesController(db, dir, Hub), "bob@x.com");

        await alice.Send(bobId, new SendMessageDto("привіт"));
        await bob.DeclineRequest(aliceId);

        Assert.Empty(Ok(await bob.GetRequests()));
        Assert.Empty(Ok(await bob.GetConversations()));
        Assert.False(Ok(await alice.GetThread(bobId)).CanSend);
        Assert.Equal(StatusCodes.Status403Forbidden, ((await alice.Send(bobId, new SendMessageDto("?"))).Result as ObjectResult)!.StatusCode);

        // bob передумав і написав сам — розмова відкрита для обох.
        Assert.IsType<OkObjectResult>((await bob.Send(aliceId, new SendMessageDto("все ж привіт"))).Result);
        Assert.True(Ok(await alice.GetThread(bobId)).CanSend);
    }

    [Fact]
    public async Task Messages_EmptyBody_IsRejected()
    {
        using var db = TestDb.Create();
        var dir = new UserDirectoryService(db);
        var bobId = await dir.GetOrCreateUserIdAsync("bob@x.com", "bob", null);
        var alice = WithUser(new MessagesController(db, dir, Hub), "alice@x.com");

        Assert.IsType<BadRequestObjectResult>((await alice.Send(bobId, new SendMessageDto("   "))).Result);
    }

    [Fact]
    public async Task Ratings_AverageAndReviews()
    {
        using var db = TestDb.Create();
        db.Songs.Add(new Music { Id = 1, Artist = "A", Title = "S", Duration = TimeSpan.FromMinutes(3) });
        await db.SaveChangesAsync();
        var dir = new UserDirectoryService(db);
        var ms = CreateMusicService(db);

        await WithUser(new RatingsController(db, dir, ms, new CatalogCache(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())), Hub), "a@x.com").Save(1, new SaveRatingDto(80, "Сильно"));
        await WithUser(new RatingsController(db, dir, ms, new CatalogCache(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())), Hub), "b@x.com").Save(1, new SaveRatingDto(61, null));
        var c = WithUser(new RatingsController(db, dir, ms, new CatalogCache(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())), Hub), "a@x.com");
        var result = Assert.IsType<SongRatingsDto>(((await c.Get(1)).Result as OkObjectResult)!.Value);

        Assert.Equal(70.5, result.AvgRating);
        Assert.Equal(2, result.RatingCount);
        Assert.Equal(80, result.Mine?.Score);
        Assert.Equal("Сильно", Assert.Single(result.Reviews).Review);

        Assert.IsType<BadRequestObjectResult>((await c.Save(1, new SaveRatingDto(101, null))).Result);
    }

    [Fact]
    public async Task Ratings_NonAdminCannotDeleteOthers()
    {
        using var db = TestDb.Create();
        db.Songs.Add(new Music { Id = 1, Artist = "A", Title = "S", Duration = TimeSpan.FromMinutes(3) });
        await db.SaveChangesAsync();
        var dir = new UserDirectoryService(db);
        var ms = CreateMusicService(db);
        await WithUser(new RatingsController(db, dir, ms, new CatalogCache(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())), Hub), "a@x.com").Save(1, new SaveRatingDto(50, "ok"));
        var aId = db.Users.Single(u => u.Email == "a@x.com").Id;

        Assert.IsType<ForbidResult>(await WithUser(new RatingsController(db, dir, ms, new CatalogCache(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())), Hub), "b@x.com").Delete(1, aId));
        Assert.IsType<NoContentResult>(await WithUser(new RatingsController(db, dir, ms, new CatalogCache(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())), Hub), "admin@x.com", admin: true).Delete(1, aId));
        Assert.Empty(db.SongRatings);
    }
}
