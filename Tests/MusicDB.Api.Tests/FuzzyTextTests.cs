using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class FuzzyTextTests
{
    [Theory]
    [InlineData("Дешёвые Драмы", "Дешевые Драмы")] // ё замінено на е — типова звичка
    [InlineData("ЭСКАПИСТ", "эскапист")] // регістр
    [InlineData("Кишлак", "кишлак")]
    public void FuzzyEquals_TreatsYoAndCaseAsEquivalent(string a, string b)
    {
        Assert.True(FuzzyText.FuzzyEquals(a, b));
    }

    [Fact]
    public void FuzzyEquals_ToleratesOneCharacterTypo()
    {
        Assert.True(FuzzyText.FuzzyEquals("Эскапист", "Эскапиcт")); // латинська "c" замість "с"
    }

    [Fact]
    public void FuzzyEquals_DoesNotMatchUnrelatedWords()
    {
        Assert.False(FuzzyText.FuzzyEquals("Эскапист", "Кишлак"));
    }

    [Theory]
    [InlineData("Дешёвые Драмы", "дешевые драмы")]
    [InlineData("Album: Эскапист (Deluxe)", "эскапист")]
    public void FuzzyContains_MatchesDespiteYoOrExtraText(string haystack, string needle)
    {
        Assert.True(FuzzyText.FuzzyContains(haystack, needle));
    }

    [Fact]
    public void FuzzyContains_ToleratesTypoInsideLongerString()
    {
        // "Эскапист" з однією пропущеною літерою всередині довшого рядка
        Assert.True(FuzzyText.FuzzyContains("Кишлак — Эскапит (Deluxe Edition)", "Эскапист"));
    }

    [Fact]
    public void FuzzyContains_ShortNeedle_RequiresExactSubstring()
    {
        // Занадто короткий запит ("Ро") толерантність до одруківок не застосовуємо —
        // інакше збігалось би майже з усім.
        Assert.False(FuzzyText.FuzzyContains("Метал", "Ро"));
    }

    [Fact]
    public void FuzzyContains_NullOrEmpty_ReturnsFalse()
    {
        Assert.False(FuzzyText.FuzzyContains(null, "test"));
        Assert.False(FuzzyText.FuzzyContains("test", null));
        Assert.False(FuzzyText.FuzzyContains("", "test"));
    }
}
