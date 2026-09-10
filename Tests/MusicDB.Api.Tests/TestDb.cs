using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;

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
}
