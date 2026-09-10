using System.Text.Json;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class ExternalMusicSearchServiceTests
{
    private static ExternalMusicSearchService CreateService(string itunesJson) =>
        new(new HttpClient(new FakeHttpMessageHandler(itunesJson)));

    private static object Item(string artist, string track, string? album = "Some Album") => new
    {
        artistName = artist,
        trackName = track,
        collectionName = album,
        releaseDate = "2020-01-01T00:00:00Z",
        trackTimeMillis = 200000,
        primaryGenreName = "Rock"
    };

    private static string Results(params object[] items) =>
        JsonSerializer.Serialize(new { results = items });

    [Fact]
    public async Task SearchAsync_QueryTooShort_ReturnsEmptyWithoutCallingApi()
    {
        var service = CreateService(Results());

        var result = await service.SearchAsync("a", "albumTerm");

        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchAsync_AlbumTerm_OrdersByRelevanceTier()
    {
        var json = Results(
            Item("Nightfall Legacy", "Track D", "Other"),               // tier 4: only artist contains query
            Item("ArtistC", "Nightfall Anthem", "Other Album"),         // tier 3: only track contains query
            Item("ArtistB", "Track B", "Nightfall Deluxe"),             // tier 2: album contains (not equal to) query
            Item("ArtistA", "Track A", "Nightfall"));                   // tier 1: exact album match

        var service = CreateService(json);

        var result = await service.SearchAsync("Nightfall", "albumTerm");

        Assert.Equal(4, result.Count);
        Assert.Equal("ArtistA", result[0].Artist);           // exact album match comes first
        Assert.Equal("ArtistB", result[1].Artist);           // album contains query
        Assert.Equal("ArtistC", result[2].Artist);           // track name contains query
        Assert.Equal("Nightfall Legacy", result[3].Artist);  // only artist name matches
    }

    [Fact]
    public async Task SearchAsync_AlbumTerm_ArtistHintRanksMatchingArtistFirstWithinTier()
    {
        var json = Results(
            Item("Other Band", "Track A", "Greatest Hits"),
            Item("Wanted Band", "Track B", "Greatest Hits"));

        var service = CreateService(json);

        var result = await service.SearchAsync("Greatest Hits", "albumTerm", artistHint: "Wanted Band");

        Assert.Equal("Wanted Band", result[0].Artist);
        Assert.Equal("Other Band", result[1].Artist);
    }

    [Fact]
    public async Task SearchAsync_AlbumTerm_NoMatchIsExcluded()
    {
        var json = Results(Item("Artist", "Track", "Completely Unrelated"));

        var service = CreateService(json);

        var result = await service.SearchAsync("Nightfall", "albumTerm");

        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchAsync_ArtistTerm_OnlyExactSubstringMatchesKept()
    {
        var json = Results(
            Item("Linkin Park", "In the End", "Hybrid Theory"),
            Item("Some Other Band", "Song", "Album"));

        var service = CreateService(json);

        var result = await service.SearchAsync("Linkin Park", "artistTerm");

        var single = Assert.Single(result);
        Assert.Equal("Linkin Park", single.Artist);
    }

    [Fact]
    public async Task SearchAsync_SingleAlbumSuffix_IsNormalizedToNull()
    {
        var json = Results(Item("Artist", "My Song", "My Song - Single"));

        var service = CreateService(json);

        var result = await service.SearchAsync("My Song", "songTerm");

        var single = Assert.Single(result);
        Assert.Null(single.Album);
    }
}
