using System.Text.Json;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

// Каталог «стовпчиками» (GET /api/songs?format=cols): словники без повторів, розріджені рідкісні поля,
// id виконавців замість імен лише там, де імена збігаються з полем Artist.
public class CatalogColumnsTests
{
    private static readonly SongDto[] Songs =
    [
        new(1, "Muse", "Uprising", "2009-09-07", "00:05:05", ["alternative rock", "space rock"], "The Resistance",
            PlayCount: 3, YoutubeVideoId: "w8KQmps-Sog", Artists: [new(10, "Muse")], TrackNumber: 1),
        new(2, "Muse", "Resistance", "2009-09-07", "00:05:46", ["alternative rock"], "The Resistance",
            Artists: [new(10, "Muse")], TrackNumber: 2),
        new(3, "A, B", "Duet", "2020-01-01", "01:02:03", [], null,
            Artists: [new(20, "A"), new(21, "Bee")], Source: "community", AudioUrl: "x.mp3",
            SubmittedBy: new UserRefDto(7, "Nick"), AvgRating: 80, RatingCount: 2),
    ];

    [Fact]
    public void Dictionaries_NoRepeats_AndIndexesPointBack()
    {
        var c = CatalogColumns.From(Songs);

        Assert.Equal(["Muse", "A, B"], c.ArtistDict);
        Assert.Equal([0, 0, 1], c.Artist);
        Assert.Equal(["The Resistance"], c.AlbumDict);
        Assert.Equal([0, 0, -1], c.Album);
        Assert.Equal(["alternative rock", "space rock"], c.GenreDict);
        Assert.Equal([[0, 1], [0], []], c.Genres);
        Assert.Equal([305, 346, 3723], c.Dur);
        Assert.Equal([1, 2, 0], c.Track);
    }

    [Fact]
    public void ArtistIds_OnlyWhenNamesMatch_RareFieldsSparse()
    {
        var c = CatalogColumns.From(Songs);

        Assert.Equal([10], c.ArtistIds[0]);
        Assert.Null(c.ArtistIds[2]);                       // «B» ≠ «Bee» — повні посилання окремо
        Assert.Equal("Bee", c.Artists[2][1].Name);
        Assert.Equal(new Dictionary<int, string> { [2] = "community" }, c.Source);
        Assert.Equal("x.mp3", c.Audio[2]);
        Assert.Equal(7, c.SubmittedBy[2].UserId);
        Assert.Equal(80, c.Rating[2]);
        Assert.False(c.Rating.ContainsKey(0));
    }

    [Fact]
    public void SerializedJson_UsesCamelCaseKeys_ClientsDecodeBy()
    {
        var json = System.Text.Encoding.UTF8.GetString(PackedJson.Create(CatalogColumns.From(Songs)).Raw);
        using var doc = JsonDocument.Parse(json);
        foreach (var key in new[] { "id", "title", "artistDict", "artist", "artistIds", "albumDict", "album", "genreDict", "genres", "release", "dur", "track", "yt", "plays" })
            Assert.True(doc.RootElement.TryGetProperty(key, out _), key);
        Assert.Equal("community", doc.RootElement.GetProperty("source").GetProperty("2").GetString());
    }
}
