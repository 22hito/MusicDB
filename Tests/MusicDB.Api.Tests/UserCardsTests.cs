using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using MusicDB.Api.Data;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class UserCardsTests
{
    private const string DataAvatar = "data:image/png;base64,iVBORw0KGgo=";

    [Fact]
    public async Task Cards_GiveOwnAvatarAsVersionedLink_GooglePhotoAsIs_AndAvatarEndpointGetsTheImage()
    {
        await using var db = TestDb.Create();
        db.Users.AddRange(
            new User { Id = 1, Email = "own@x", GoogleName = "Own", GooglePicture = "https://lh3.googleusercontent.com/own" },
            new User { Id = 2, Email = "google@x", GoogleName = "Google", GooglePicture = "https://lh3.googleusercontent.com/g" },
            new User { Id = 3, Email = "none@x" });
        db.UserProfiles.Add(new UserProfile { UserEmail = "own@x", DisplayName = "Свій нік", AvatarUrl = DataAvatar });
        await db.SaveChangesAsync();

        var cards = await UserDirectoryService.GetUserCardsAsync(db, [1, 2, 3]);

        // Своя аватарка — посиланням, не вмістом (у списках вона несла б десятки КБ на рядок).
        Assert.Matches(@"^/api/users/1/avatar\?v=[0-9a-f]{8}$", cards[1].AvatarUrl);
        Assert.Equal("Свій нік", cards[1].DisplayName);
        Assert.Equal("https://lh3.googleusercontent.com/g", cards[2].AvatarUrl);
        Assert.Null(cards[3].AvatarUrl);
        Assert.Equal(cards[1].AvatarUrl, cards[1].ToRef().AvatarUrl); // посилання не обгортається вдруге

        var directory = new UserDirectoryService(db);
        Assert.Equal(DataAvatar, await directory.GetAvatarSourceAsync(1));
        Assert.Equal("https://lh3.googleusercontent.com/g", await directory.GetAvatarSourceAsync(2));
        Assert.Null(await directory.GetAvatarSourceAsync(3));
    }

    [Fact]
    public async Task CurrentUserId_IsLookedUpOnce_ThenServedFromMemory()
    {
        await using var db = TestDb.Create();
        db.Users.Add(new User { Id = 7, Email = "me@x" });
        await db.SaveChangesAsync();
        var directory = new UserDirectoryService(db, new MemoryCache(new MemoryCacheOptions()));
        var me = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Email, "me@x")], "test"));

        Assert.Equal(7, await directory.GetCurrentUserIdAsync(me));
        db.Users.RemoveRange(db.Users); // бази більше не питаємо — id уже в пам'яті
        await db.SaveChangesAsync();
        Assert.Equal(7, await directory.GetCurrentUserIdAsync(me));
    }
}
