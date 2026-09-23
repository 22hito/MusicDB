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

    public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory)
    {
        if (cache.TryGetValue(key, out T? cached) && cached is not null) return cached;

        var value = await factory();
        CancellationToken token;
        lock (_lock) token = _reset.Token;
        cache.Set(key, value, new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(Ttl)
            .AddExpirationToken(new CancellationChangeToken(token)));
        return value;
    }

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
