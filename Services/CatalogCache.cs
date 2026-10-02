using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

namespace MusicDB.Api.Services;

// Кеш "важких" загальних відповідей (/api/songs, /api/stats): кожна з них — кілька
// послідовних запитів до віддаленої БД, а після кожної мутації каталогу
// (SignalR songsChanged) їх одночасно перезапитують УСІ відкриті вкладки.
// Мутації скидають кеш явно (Invalidate); лічильники прослуховувань, що
// змінюються без мутації каталогу, наздоганяє короткий TTL.
public class CatalogCache(IMemoryCache cache)
{
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(30);
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
