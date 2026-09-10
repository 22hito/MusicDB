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
    public async Task SearchAsync_AlbumTerm_ArtistHintMatchesDespiteMissingYo()
    {
        // Реальний сценарій: користувач набирає виконавця без "ё" (як прийнято
        // в побутовому рос. письмі), а в базі iTunes ім'я записане з "ё" —
        // видача не повинна від цього змінюватись.
        var json = Results(
            Item("Кишлак", "Track A", "Эскапист"),
            Item("Дешёвые Драмы", "Track B", "Эскапист"));

        var service = CreateService(json);

        var result = await service.SearchAsync("Эскапист", "albumTerm", artistHint: "Дешевые Драмы");

        Assert.Equal("Дешёвые Драмы", result[0].Artist);
        Assert.Equal("Кишлак", result[1].Artist);
    }

    [Fact]
    public async Task SearchAsync_AlbumTerm_MatchesAlbumNameWithTypo()
    {
        var json = Results(Item("Кишлак", "Track A", "Эскапист"));
        var service = CreateService(json);

        // "Эскапиcт" — типова одруківка (латинська "c" замість кириличної "с")
        var result = await service.SearchAsync("Эскапиcт", "albumTerm");

        var single = Assert.Single(result);
        Assert.Equal("Кишлак", single.Artist);
    }

    [Fact]
    public async Task SearchAsync_ArtistTerm_MatchesDespiteMissingYo()
    {
        var json = Results(Item("Дешёвые Драмы", "Track A", "Album"));
        var service = CreateService(json);

        var result = await service.SearchAsync("Дешевые Драмы", "artistTerm");

        var single = Assert.Single(result);
        Assert.Equal("Дешёвые Драмы", single.Artist);
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
    public async Task SearchAsync_AlbumTerm_FetchesFullTracklistViaLookup_NotJustPartialSearchMatches()
    {
        // Відтворює реальний баг: /search за назвою альбому повертає лише
        // частину треків (тут — 2 з 4), бо це нечіткий пошук за релевантністю
        // по всьому каталогу, а не гарантований повний трек-лист альбому.
        var searchJson = Results(
            new Dictionary<string, object?> { ["artistName"] = "ArtistA", ["trackName"] = "Track One", ["collectionId"] = 555, ["collectionName"] = "The Album" },
            new Dictionary<string, object?> { ["artistName"] = "ArtistA", ["trackName"] = "Track Two", ["collectionId"] = 555, ["collectionName"] = "The Album" });

        var lookupJson = """
            {"resultCount":5,"results":[
                {"wrapperType":"collection","collectionId":555,"collectionName":"The Album","artistName":"ArtistA","trackCount":4},
                {"wrapperType":"track","artistName":"ArtistA","trackName":"Track One","collectionId":555,"collectionName":"The Album","trackNumber":1},
                {"wrapperType":"track","artistName":"ArtistA","trackName":"Track Two","collectionId":555,"collectionName":"The Album","trackNumber":2},
                {"wrapperType":"track","artistName":"ArtistA","trackName":"Track Three","collectionId":555,"collectionName":"The Album","trackNumber":3},
                {"wrapperType":"track","artistName":"ArtistA","trackName":"Track Four","collectionId":555,"collectionName":"The Album","trackNumber":4}
            ]}
            """;

        var handler = new RoutedFakeHttpMessageHandler(("/search", searchJson), ("/lookup", lookupJson));
        var service = new ExternalMusicSearchService(new HttpClient(handler));

        var result = await service.SearchAsync("The Album", "albumTerm");

        Assert.Equal(4, result.Count);
        Assert.Equal(["Track One", "Track Two", "Track Three", "Track Four"], result.Select(r => r.Title));
    }

    [Fact]
    public async Task SearchAsync_AlbumTerm_LookupFailure_FallsBackToPartialSearchResults()
    {
        var searchJson = Results(
            new Dictionary<string, object?> { ["artistName"] = "ArtistA", ["trackName"] = "Track One", ["collectionId"] = 555, ["collectionName"] = "The Album" });

        // /lookup повертає щось непридатне (не JSON) — імітує збій зовнішнього сервісу.
        var handler = new RoutedFakeHttpMessageHandler(("/search", searchJson), ("/lookup", "not json"));
        var service = new ExternalMusicSearchService(new HttpClient(handler));

        var result = await service.SearchAsync("The Album", "albumTerm");

        var single = Assert.Single(result);
        Assert.Equal("Track One", single.Title);
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
