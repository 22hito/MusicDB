using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using MusicDB.Api.Data;
using MusicDB.Api.Services;

namespace MusicDB.Api.Tests;

// Кожен тест отримує власну ізольовану InMemory-базу (унікальна назва),
// щоб тести не впливали одне на одного при паралельному запуску.
public static class TestDb
{
    public static MusicDbContext Create()
    {
        var options = new DbContextOptionsBuilder<MusicDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MusicDbContext(options);
    }

    // CatalogCache, що збирає відповіді з цієї самої тестової бази (у проді — новий DI-scope на кожен збір).
    public static CatalogCache CacheFor(MusicDbContext db, MusicService? music = null)
    {
        var services = new ServiceCollection();
        services.AddSingleton(db);
        if (music is not null) services.AddSingleton(music);
        return new CatalogCache(new MemoryCache(new MemoryCacheOptions()),
            services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>());
    }
}
