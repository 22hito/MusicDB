using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

namespace MusicDB.Api.Services;

// Кеш "важких" загальних відповідей (/api/songs, /api/stats): кожна з них — кілька
// послідовних запитів до віддаленої БД, а після кожної мутації каталогу
// (SignalR songsChanged) їх одночасно перезапитують УСІ відкриті вкладки.
// Мутації скидають кеш явно (Invalidate); лічильники прослуховувань, що
// змінюються без мутації каталогу, наздоганяє короткий TTL.
//
// GetOrRefreshAsync — «віддати старе, оновити у фоні»: після TTL відповідь не чекає на новий збір (на проді
// каталог збирається ~1–2 с, і раніше раз на 2 хв хтось на це натрапляв), а отримує попереднє значення,
// поки нове збирається у фоні — у власному DI-scope, бо DbContext запиту тоді вже закритий. Чекати
// доводиться лише після мутації (Invalidate прибирає все) або довгої тиші (StaleFor).
public class CatalogCache(IMemoryCache cache, IServiceScopeFactory? scopes = null, ILogger<CatalogCache>? logger = null)
{
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan StaleFor = TimeSpan.FromMinutes(30);
    private sealed record Entry(object? Value, DateTime FreshUntil);
    private CancellationTokenSource _reset = new();
    private readonly object _lock = new();
    // Один збір на ключ: після songsChanged усі вкладки питають одночасно — збирає перший, решта чекають його.
    private readonly ConcurrentDictionary<string, Task<object?>> _building = new();

    public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan? ttl = null)
    {
        if (cache.TryGetValue(key, out T? cached) && cached is not null) return cached;

        var build = _building.GetOrAdd(key, _ => BuildAsync(key, factory, ttl));
        try { return (T)(await build)!; }
        finally { _building.TryRemove(new KeyValuePair<string, Task<object?>>(key, build)); }
    }

    private async Task<object?> BuildAsync<T>(string key, Func<Task<T>> factory, TimeSpan? ttl)
    {
        // Токен — ДО збору: якщо каталог змінився під час збору, застарілий результат не проживе й секунди.
        CancellationToken token;
        lock (_lock) token = _reset.Token;
        var value = await factory();
        cache.Set(key, value, new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(ttl ?? Ttl)
            .AddExpirationToken(new CancellationChangeToken(token)));
        return value;
    }

    public async Task<T> GetOrRefreshAsync<T>(string key, Func<IServiceProvider, Task<T>> factory, TimeSpan? ttl = null)
    {
        if (cache.TryGetValue(key, out Entry? entry) && entry is not null)
        {
            if (DateTime.UtcNow >= entry.FreshUntil) _ = RefreshInBackgroundAsync(key, factory, ttl ?? Ttl);
            return (T)entry.Value!;
        }
        return (T)(await BuildScoped(key, factory, ttl ?? Ttl))!;
    }

    private async Task RefreshInBackgroundAsync<T>(string key, Func<IServiceProvider, Task<T>> factory, TimeSpan ttl)
    {
        try { await BuildScoped(key, factory, ttl); }
        catch (Exception e) { logger?.LogWarning(e, "Background refresh of {Key} failed", key); } // лишається старе
    }

    // Один збір на ключ і для запитів, і для фонового оновлення.
    private Task<object?> BuildScoped<T>(string key, Func<IServiceProvider, Task<T>> factory, TimeSpan ttl)
    {
        var build = _building.GetOrAdd(key, _ => BuildScopedAsync(key, factory, ttl));
        _ = build.ContinueWith(_ => _building.TryRemove(new KeyValuePair<string, Task<object?>>(key, build)), TaskScheduler.Default);
        return build;
    }

    private async Task<object?> BuildScopedAsync<T>(string key, Func<IServiceProvider, Task<T>> factory, TimeSpan ttl)
    {
        await Task.Yield(); // збір — не всередині GetOrAdd
        CancellationToken token;
        lock (_lock) token = _reset.Token;
        if (scopes is null) throw new InvalidOperationException("CatalogCache без IServiceScopeFactory не вміє збирати у власному scope.");
        T value;
        using (var scope = scopes.CreateScope()) value = await factory(scope.ServiceProvider);
        cache.Set(key, new Entry(value, DateTime.UtcNow + ttl), new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(ttl + StaleFor)
            .AddExpirationToken(new CancellationChangeToken(token)));
        return value;
    }

    // Один ключ — коли змінилось лише те, що в ньому (підписка, фото виконавця), а решта кешу ще свіжа.
    public void Remove(string key) => cache.Remove(key);

    // Будь-яка зміна пісень/оцінок — скидаємо все одразу (ключів мало, дешево).
    public void Invalidate()
    {
        CancellationTokenSource old;
        lock (_lock)
        {
            old = _reset;
            _reset = new CancellationTokenSource();
        }
        old.Cancel();
        old.Dispose();
    }
}
