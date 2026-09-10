using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MusicDB.Api.Data;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class MusicServiceTests
{
    // GenreNormalizationService не використовується в методах, що тестуються тут,
    // тож достатньо "порожнього" екземпляра без реального ключа Gemini.
    private static MusicService CreateService(MusicDbContext db) =>
        new(db, new GenreNormalizationService(new HttpClient(), new ConfigurationBuilder().Build(),
            NullLogger<GenreNormalizationService>.Instance));

    [Fact]
    public async Task GetPlayCountsAsync_EmptyInput_ReturnsEmptyDictionary()
    {
        using var db = TestDb.Create();
        var service = CreateService(db);

        var result = await service.GetPlayCountsAsync([]);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetPlayCountsAsync_CountsOnePerListeningHistoryRow()
    {
        using var db = TestDb.Create();
        db.ListeningHistory.AddRange(
            new ListeningHistory { UserEmail = "a@x.com", MusicId = 1 },
            new ListeningHistory { UserEmail = "b@x.com", MusicId = 1 },
            new ListeningHistory { UserEmail = "a@x.com", MusicId = 2 });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.GetPlayCountsAsync([1, 2, 3]);

        Assert.Equal(2, result[1]);
        Assert.Equal(1, result[2]);
        Assert.False(result.ContainsKey(3));
    }

    [Fact]
    public async Task GetSongDtosByIdsAsync_IncludesPlayCountFromListeningHistory()
    {
        using var db = TestDb.Create();
        db.Songs.Add(new Music { Id = 1, Artist = "Artist", Title = "Title", Duration = TimeSpan.FromMinutes(3) });
        db.ListeningHistory.AddRange(
            new ListeningHistory { UserEmail = "a@x.com", MusicId = 1 },
            new ListeningHistory { UserEmail = "b@x.com", MusicId = 1 });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.GetSongDtosByIdsAsync([1]);

        var dto = Assert.Single(result);
        Assert.Equal(2, dto.PlayCount);
    }

    [Fact]
    public async Task GetSongDtosByIdsAsync_SongWithNoListens_HasZeroPlayCount()
    {
        using var db = TestDb.Create();
        db.Songs.Add(new Music { Id = 1, Artist = "Artist", Title = "Title", Duration = TimeSpan.FromMinutes(3) });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.GetSongDtosByIdsAsync([1]);

        var dto = Assert.Single(result);
        Assert.Equal(0, dto.PlayCount);
    }
}
