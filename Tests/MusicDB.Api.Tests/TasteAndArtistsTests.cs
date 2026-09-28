using Microsoft.AspNetCore.Mvc;
using MusicDB.Api.Controllers;
using MusicDB.Api.Data;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

// Граф "Схожий смак" і нові частини сторінки виконавця (схожі виконавці).
public class TasteAndArtistsTests
{
    // 3 виконавці: двоє рок-гуртів і реп-виконавець; по дві пісні кожному.
    private static MusicDbContext Seed()
    {
        var db = TestDb.Create();
        db.Genres.AddRange(new Genre { Id = 1, GenreName = "rock" }, new Genre { Id = 2, GenreName = "hard rock" }, new Genre { Id = 3, GenreName = "rap" });
        db.Artists.AddRange(
            new Artist { Id = 1, Name = "AC/DC", NormalizedName = "acdc" },
            new Artist { Id = 2, Name = "Muse", NormalizedName = "muse" },
            new Artist { Id = 3, Name = "Eminem", NormalizedName = "eminem" });
        var songId = 1;
        foreach (var (artistId, genres) in new[] { (1, new[] { 1, 2 }), (2, new[] { 1 }), (3, new[] { 3 }) })
        {
            for (var k = 0; k < 2; k++, songId++)
            {
                db.Songs.Add(new Music { Id = songId, Artist = $"A{artistId}", Title = $"S{songId}", Duration = TimeSpan.FromMinutes(3) });
                db.MusicArtists.Add(new MusicArtist { MusicId = songId, ArtistId = artistId });
                foreach (var g in genres) db.MusicGenres.Add(new MusicGenre { MusicId = songId, GenreId = g });
            }
        }
        db.Users.AddRange(
            new User { Id = 1, Email = "me@x.com", GoogleName = "Me" },
            new User { Id = 2, Email = "rocker@x.com", GoogleName = "Rocker" },
            new User { Id = 3, Email = "rapper@x.com", GoogleName = "Rapper" },
            new User { Id = 4, Email = "empty@x.com", GoogleName = "Empty" });
        // Я й Rocker любимо AC/DC (пісня 1 — спільна), Rapper — лише Eminem.
        db.Favorites.AddRange(
            new Favorite { UserEmail = "me@x.com", MusicId = 1 }, new Favorite { UserEmail = "me@x.com", MusicId = 3 },
            new Favorite { UserEmail = "rocker@x.com", MusicId = 1 }, new Favorite { UserEmail = "rocker@x.com", MusicId = 2 },
            new Favorite { UserEmail = "rapper@x.com", MusicId = 5 }, new Favorite { UserEmail = "rapper@x.com", MusicId = 6 });
        db.FriendRequests.Add(new FriendRequest { RequesterId = 1, AddresseeId = 2, Status = "accepted" });
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task Taste_RanksSimilarPeopleFirst_WithSharedArtists()
    {
        using var db = Seed();
        var graph = await new TasteService(db).BuildAsync(1);

        var best = graph.Matches[0];
        Assert.Equal(2, best.UserId);
        Assert.Contains(best.SharedArtists, a => a.Name == "AC/DC" && a.Id == 1);
        Assert.Equal(1, best.SharedFavorites);
        Assert.Equal("friends", best.RelationshipStatus);
        Assert.True(best.Score > 50);
        // З репером нема нічого спільного — у список "схожих" не потрапляє.
        Assert.DoesNotContain(graph.Matches, m => m.UserId == 3);
    }

    [Fact]
    public async Task Taste_GraphHasOnlyPeopleWithTaste_AndMarksMe()
    {
        using var db = Seed();
        var graph = await new TasteService(db).BuildAsync(1);

        Assert.Equal([1, 2, 3], graph.Nodes.Select(n => n.UserId).Order());
        var me = graph.Nodes.Single(n => n.UserId == 1);
        Assert.True(me.IsMe);
        Assert.Equal(100, me.Score);
        Assert.Equal(2, me.ItemCount);
        Assert.True(graph.Nodes.Single(n => n.UserId == 2).Score > graph.Nodes.Single(n => n.UserId == 3).Score);
        // Картка "Ваш смак": мої виконавці, жанри (назви з бази), улюблені.
        Assert.Contains(graph.MyTopArtists!, a => a.Name == "AC/DC");
        Assert.Contains("rock", graph.MyTopGenres!);
        Assert.Equal(2, graph.MyFavorites);
        Assert.Equal(2, graph.MyItemCount);
        Assert.Contains(graph.Edges, e => (e.A, e.B) == (1, 2));
        Assert.DoesNotContain(graph.Edges, e => e.A == 3 || e.B == 3);
    }

    [Fact]
    public async Task Taste_WithoutMyData_StillShowsGraph_ButNoMatches()
    {
        using var db = Seed();
        var graph = await new TasteService(db).BuildAsync(4);

        Assert.Equal(0, graph.MyItemCount);
        Assert.Empty(graph.Matches);
        Assert.DoesNotContain(graph.Nodes, n => n.UserId == 4);
    }

    [Fact]
    public async Task Recommendations_WithoutAi_ByGenresAndArtists_NotListened()
    {
        using var db = Seed();
        // Нова пісня AC/DC без жанрів — має потрапити в підбір завдяки виконавцю.
        db.Songs.Add(new Music { Id = 7, Artist = "AC/DC", Title = "New", Duration = TimeSpan.FromMinutes(3) });
        db.MusicArtists.Add(new MusicArtist { MusicId = 7, ArtistId = 1 });
        db.ListeningHistory.Add(new ListeningHistory { UserEmail = "me@x.com", MusicId = 1, ListenedAt = DateTime.UtcNow });
        db.SaveChanges();
        var service = new RecommendationService(db, new MusicService(db, null!), new HttpClient(),
            new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build());

        var recs = await service.GetRecommendationsAsync("me@x.com");
        var ids = recs.Select(r => r.Song.Id).ToList();

        Assert.DoesNotContain(1, ids);             // уже слухав
        Assert.Contains(2, ids);                   // той самий виконавець і жанри
        Assert.Contains(7, ids);                   // той самий виконавець, жанрів ще нема
        Assert.Contains(3, ids);                   // Muse — спільний жанр rock
        Assert.DoesNotContain(5, ids);             // реп — нічого спільного
        Assert.Equal(2, ids[0]);                   // найсильніший збіг — першим
    }

    [Fact]
    public async Task SimilarArtists_ByGenreOverlap()
    {
        using var db = Seed();
        var controller = new ArtistsController(db, null!, null!, null!,
            new CatalogCache(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())));

        var result = Assert.IsType<OkObjectResult>((await controller.GetSimilar(1)).Result);
        var similar = Assert.IsAssignableFrom<List<SimilarArtistDto>>(result.Value);

        var muse = Assert.Single(similar);
        Assert.Equal("Muse", muse.Name);
        Assert.Equal(50, muse.Score); // {rock} проти {rock, hard rock}
    }

    // Опис двома мовами: без bioEn (старий застосунок) англійський лишається, "" — прибирає.
    [Fact]
    public async Task UpdateBio_KeepsEnglishWhenOmitted_ClearsWhenEmpty()
    {
        using var db = Seed();
        var controller = new ArtistsController(db, null!, null!, null!,
            new CatalogCache(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())))
        { ControllerContext = new ControllerContext { HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext() } };

        var both = Assert.IsType<ArtistDetailDto>(Assert.IsType<OkObjectResult>((await controller.Update(1, new UpdateArtistDto("Австралійський гурт", " Australian band "))).Result).Value);
        Assert.Equal(("Австралійський гурт", "Australian band"), (both.Bio, both.BioEn));

        await controller.Update(1, new UpdateArtistDto("Гурт"));
        Assert.Equal(("Гурт", "Australian band"), (db.Artists.Find(1)!.Bio, db.Artists.Find(1)!.BioEn));

        await controller.Update(1, new UpdateArtistDto("Гурт", ""));
        Assert.Null(db.Artists.Find(1)!.BioEn);
    }
}
