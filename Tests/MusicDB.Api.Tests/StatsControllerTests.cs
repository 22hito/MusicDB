using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MusicDB.Api.Controllers;
using MusicDB.Api.Data;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class StatsControllerTests
{
    private static (StatsController controller, MusicDbContext db) CreateController()
    {
        var db = TestDb.Create();
        var musicService = new MusicService(db, new GenreNormalizationService(new HttpClient(),
            new ConfigurationBuilder().Build(), NullLogger<GenreNormalizationService>.Instance));
        return (new StatsController(db, musicService), db);
    }

    [Fact]
    public async Task GetTopSongs_OrdersByUniqueListenerCountDescending()
    {
        var (controller, db) = CreateController();
        db.Songs.AddRange(
            new Music { Id = 1, Artist = "A", Title = "Least Played", Duration = TimeSpan.FromMinutes(3) },
            new Music { Id = 2, Artist = "B", Title = "Most Played", Duration = TimeSpan.FromMinutes(3) });
        db.ListeningHistory.AddRange(
            new ListeningHistory { UserEmail = "a@x.com", MusicId = 1 },
            new ListeningHistory { UserEmail = "a@x.com", MusicId = 2 },
            new ListeningHistory { UserEmail = "b@x.com", MusicId = 2 },
            new ListeningHistory { UserEmail = "c@x.com", MusicId = 2 });
        await db.SaveChangesAsync();

        var result = (await controller.GetTopSongs()).ToList();

        Assert.Equal(2, result.Count);
        Assert.Equal("Most Played", result[0].Title);
        Assert.Equal(3, result[0].PlayCount);
        Assert.Equal("Least Played", result[1].Title);
        Assert.Equal(1, result[1].PlayCount);
    }

    [Fact]
    public async Task GetTopSongs_RespectsLimitParameter()
    {
        var (controller, db) = CreateController();
        for (var i = 1; i <= 5; i++)
        {
            db.Songs.Add(new Music { Id = i, Artist = "A", Title = $"Song {i}", Duration = TimeSpan.FromMinutes(3) });
            db.ListeningHistory.Add(new ListeningHistory { UserEmail = "a@x.com", MusicId = i });
        }
        await db.SaveChangesAsync();

        var result = (await controller.GetTopSongs(limit: 2)).ToList();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetTopSongs_NoListens_ReturnsEmpty()
    {
        var (controller, db) = CreateController();
        db.Songs.Add(new Music { Id = 1, Artist = "A", Title = "Song", Duration = TimeSpan.FromMinutes(3) });
        await db.SaveChangesAsync();

        var result = (await controller.GetTopSongs()).ToList();

        Assert.Empty(result);
    }
}
