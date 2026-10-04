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

    // Після TTL — одразу попереднє значення, а нове збирається у фоні; після Invalidate — лише свіже.
    [Fact]
    public async Task Refresh_ServesStaleImmediately_ThenFresh_AndNeverStaleAfterInvalidate()
    {
        await using var db = TestDb.Create();
        var cache = TestDb.CacheFor(db);
        var calls = 0;
        var slow = new TaskCompletionSource();
        async Task<int> Load(IServiceProvider sp)
        {
            Assert.Same(db, sp.GetService(typeof(MusicDB.Api.Data.MusicDbContext))); // збір — зі своїх сервісів
            var n = Interlocked.Increment(ref calls);
            if (n == 2) await slow.Task; // фонове оновлення «повільне»
            return n;
        }
        var ttl = TimeSpan.FromMilliseconds(50);

        Assert.Equal(1, await cache.GetOrRefreshAsync("k", Load, ttl));
        await Task.Delay(80); // TTL минув
        Assert.Equal(1, await cache.GetOrRefreshAsync("k", Load, ttl)); // не чекає на збір — старе одразу
        Assert.Equal(1, await cache.GetOrRefreshAsync("k", Load, ttl)); // збір уже йде — другий не запускається
        slow.SetResult();
        for (var i = 0; i < 50 && await cache.GetOrRefreshAsync("k", Load, TimeSpan.FromMinutes(1)) == 1; i++) await Task.Delay(10);
        Assert.Equal(2, await cache.GetOrRefreshAsync("k", Load, ttl));
        Assert.Equal(2, calls);

        cache.Invalidate(); // мутація каталогу: старого більше не віддаємо
        Assert.Equal(3, await cache.GetOrRefreshAsync("k", Load, ttl));
    }

    [Fact]
    public async Task ConcurrentRequests_BuildOnce()
    {
        var cache = new CatalogCache(new MemoryCache(new MemoryCacheOptions()));
        var calls = 0;
        var gate = new TaskCompletionSource();
        async Task<int> Load() { Interlocked.Increment(ref calls); await gate.Task; return 7; }

        var first = cache.GetOrCreateAsync("songs:catalog", Load);
        var second = cache.GetOrCreateAsync("songs:catalog", Load); // поки перший ще збирає
        gate.SetResult();

        Assert.Equal(7, await first);
        Assert.Equal(7, await second);
        Assert.Equal(1, calls);
    }

    [Fact]
    public void PackedJson_OmitsDefaults_AndAnswers304ForSameETag()
    {
        var packed = PackedJson.Create(new[] { new { Id = 1, Album = (string?)null, PlayCount = 0, Title = "X" } });
        Assert.Equal("[{\"id\":1,\"title\":\"X\"}]", System.Text.Encoding.UTF8.GetString(packed.Raw));

        var http = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        http.Request.Headers.AcceptEncoding = "gzip, br";
        var ok = Assert.IsType<Microsoft.AspNetCore.Mvc.FileContentResult>(packed.ToResult(http));
        Assert.Equal("br", http.Response.Headers.ContentEncoding.ToString());
        Assert.Equal(packed.Brotli, ok.FileContents);

        var again = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        again.Request.Headers.IfNoneMatch = packed.ETag;
        var notModified = Assert.IsType<Microsoft.AspNetCore.Mvc.StatusCodeResult>(packed.ToResult(again));
        Assert.Equal(304, notModified.StatusCode);
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
