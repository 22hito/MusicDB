using Microsoft.Extensions.Caching.Memory;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

public class CatalogCacheTests
{
    [Fact]
    public async Task ServesCachedValue_UntilInvalidated()
    {
        var cache = new CatalogCache(new MemoryCache(new MemoryCacheOptions()));
        var calls = 0;
        Task<int> Load() => Task.FromResult(++calls);

        Assert.Equal(1, await cache.GetOrCreateAsync("songs:catalog", Load));
        Assert.Equal(1, await cache.GetOrCreateAsync("songs:catalog", Load)); // з кешу, без БД

        cache.Invalidate(); // мутація каталогу
        Assert.Equal(2, await cache.GetOrCreateAsync("songs:catalog", Load));
        Assert.Equal(2, await cache.GetOrCreateAsync("songs:catalog", Load));
    }

    [Fact]
    public async Task Invalidate_ResetsAllKeys()
    {
        var cache = new CatalogCache(new MemoryCache(new MemoryCacheOptions()));
        await cache.GetOrCreateAsync("songs:catalog", () => Task.FromResult("old"));
        await cache.GetOrCreateAsync("stats:catalog", () => Task.FromResult("old"));

        cache.Invalidate();

        Assert.Equal("new", await cache.GetOrCreateAsync("songs:catalog", () => Task.FromResult("new")));
        Assert.Equal("new", await cache.GetOrCreateAsync("stats:catalog", () => Task.FromResult("new")));
    }
}
