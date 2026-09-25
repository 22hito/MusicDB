using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MusicDB.Api.Data;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class GenreNamesTests
{
    // Без ключа Gemini — перевіряємо саме локальну (без ШІ) частину.
    private static GenreNormalizationService Normalizer() =>
        new(new HttpClient(), new ConfigurationBuilder().Build(), NullLogger<GenreNormalizationService>.Instance);

    [Theory]
    [InlineData("hip-hop", "хип хоп")]
    [InlineData("Hip Hop", "хіп-хоп")]
    [InlineData("rap", "рэп")]
    [InlineData("rap", "реп")]
    [InlineData("rock", "Рок")]
    [InlineData("r&b", "rnb")]
    [InlineData("R&B", "рнб")]
    [InlineData("drum & bass", "dnb")]
    [InlineData("rock'n'roll", "rock and roll")]
    [InlineData("lo-fi", "лофай")]
    [InlineData("Hard-Rock", "HARDROCK")]
    public void Key_MatchesSameGenreAcrossSpellingsAndLanguages(string a, string b)
    {
        Assert.Equal(GenreNames.Key(a), GenreNames.Key(b));
    }

    [Theory]
    [InlineData("rap", "trap")]
    [InlineData("rock", "hard rock")]
    [InlineData("hip hop", "rap")]
    [InlineData("emo", "emo rap")]
    public void Key_KeepsDifferentGenresApart(string a, string b)
    {
        Assert.NotEqual(GenreNames.Key(a), GenreNames.Key(b));
    }

    [Fact]
    public void KnownEnglish_TranslatesDictionaryGenres_OnlyThose()
    {
        Assert.Equal("hip hop", GenreNames.KnownEnglish("Хип-хоп"));
        Assert.Equal("rap", GenreNames.KnownEnglish("рэп"));
        Assert.Null(GenreNames.KnownEnglish("hip hop"));
        Assert.Null(GenreNames.KnownEnglish("щось своє"));
    }

    // Скріншот із таблиці ком'юніті: "хип хоп" поруч з "hip-hop" — "дублікатів не знайдено".
    [Fact]
    public async Task FindDuplicateGroups_GroupsCyrillicWithLatin_PrefersLatinName()
    {
        var scan = await Normalizer().FindDuplicateGroupsAsync(["rap", "хип хоп", "hip-hop", "emo", "emo punk"]);

        var group = Assert.Single(scan.Groups);
        Assert.Equal("hip-hop", group.Canonical);
        Assert.Equal(["хип хоп"], group.Duplicates);
    }

    [Fact]
    public async Task NormalizeGenresBatch_MapsToExistingSpelling_OrDictionary_WithoutAi()
    {
        var result = await Normalizer().NormalizeGenresBatchAsync(["хип хоп", "Рэп", "фонк", "щось своє"], ["hip-hop", "rap"]);

        Assert.Equal(["hip-hop", "rap", "phonk", "щось своє"], result);
    }

    [Fact]
    public async Task ResolveGenres_ReusesExistingGenre_ForCyrillicSpelling()
    {
        using var db = TestDb.Create();
        db.Genres.Add(new Genre { Id = 1, GenreName = "hip-hop" });
        await db.SaveChangesAsync();
        var service = new MusicService(db, Normalizer());

        var ids = await service.ResolveGenresAsync(["хип хоп", "Hip Hop"]);

        Assert.Equal([1], ids);
        Assert.Single(db.Genres);
    }
}
