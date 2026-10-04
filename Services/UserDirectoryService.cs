using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MusicDB.Api.Data;
using MusicDB.Api.Models;

namespace MusicDB.Api.Services;

// Єдина точка "email -> opaque id" — викликається і з Program.cs (при кожному
// Google-логіні), і з будь-якого контролера, якому потрібен стабільний id.
// cache — email → id у пам'яті: id людини ніколи не змінюється (користувачів не видаляють), а потрібен
// він майже кожному API-запиту — без кешу це окремий запит до бази щоразу.
public class UserDirectoryService(MusicDbContext db, IMemoryCache? cache = null)
{
    private static string CacheKey(string email) => "uid:" + email;
    private int Remember(string email, int id)
    {
        cache?.Set(CacheKey(email), id, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(1) });
        return id;
    }

    // INSERT ... ON CONFLICT — захист від гонки при одночасному першому запиті.
    public async Task<int> GetOrCreateUserIdAsync(string email, string? googleName, string? googlePicture)
    {
        // InMemory-провайдер (тести) не виконує сирий SQL — там гонок і нема.
        if (!db.Database.IsRelational())
        {
            var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (existing is not null) return existing.Id;
            var created = new User { Email = email, GoogleName = googleName, GooglePicture = googlePicture };
            db.Users.Add(created);
            await db.SaveChangesAsync();
            return created.Id;
        }

        await db.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT INTO lab.users (email, google_name, google_picture, last_login_at)
            VALUES ({email}, {googleName}, {googlePicture}, now())
            ON CONFLICT (email) DO UPDATE
            SET google_name = EXCLUDED.google_name,
                google_picture = EXCLUDED.google_picture,
                last_login_at = now()");

        return Remember(email, await db.Users.Where(u => u.Email == email).Select(u => u.Id).FirstAsync());
    }

    // Викликається на КОЖНОМУ API-запиті — тому спершу лише читаємо id. Раніше тут
    // одразу йшов INSERT … ON CONFLICT DO UPDATE: новий рядок не з'являвся, але кожен
    // запит переписував users (мертві версії рядків для вакууму), а last_login_at
    // означав "останній запит", а не "останній вхід". Запис — лише для нового
    // користувача; справжній вхід оновлює рядок через OnTicketReceived (Program.cs).
    public async Task<int> GetCurrentUserIdAsync(ClaimsPrincipal user)
    {
        var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
        if (cache is not null && cache.TryGetValue(CacheKey(email), out int cachedId)) return cachedId;
        var existingId = await db.Users.Where(u => u.Email == email).Select(u => (int?)u.Id).FirstOrDefaultAsync();
        if (existingId is int id) return Remember(email, id);
        return await GetOrCreateUserIdAsync(
            email,
            user.FindFirstValue(ClaimTypes.Name),
            user.FindFirstValue("picture") ?? user.FindFirstValue("urn:google:picture"));
    }

    public record UserCard(int UserId, string DisplayName, string? AvatarUrl)
    {
        public UserRefDto ToRef() => new(UserId, DisplayName, AvatarUrl);
    }

    // Своя аватарка зберігається data:-URI (base64, десятки КБ) — у посиланнях на автора (гілки, дописи,
    // сповіщення) її віддаємо адресою /api/users/{id}/avatar з версією, а не вмістом: інакше кожен допис
    // ніс би цілу картинку. Фото з Google — звичайна https-адреса, лишається як є.
    public static string? AvatarLink(int userId, string? avatar)
    {
        if (string.IsNullOrEmpty(avatar)) return null;
        if (!avatar.StartsWith("data:", StringComparison.OrdinalIgnoreCase)) return avatar;
        uint h = 2166136261; // FNV-1a — версія змінюється разом із картинкою, тож її можна кешувати назавжди
        foreach (var ch in avatar) h = (h ^ ch) * 16777619;
        return $"/api/users/{userId}/avatar?v={h:x8}";
    }

    // Нік/аватарка для набору id одним запитом (не N+1) — той самий пріоритет,
    // що й у FriendsController: власний нікнейм > ім'я з Google > заглушка.
    // Статичний, бо потрібен і MusicService, який не залежить від цього сервісу.
    public static async Task<Dictionary<int, UserCard>> GetUserCardsAsync(MusicDbContext db, IEnumerable<int> userIds)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0) return [];

        var rows = await (
            from u in db.Users
            where ids.Contains(u.Id)
            join p in db.UserProfiles on u.Email equals p.UserEmail into profiles
            from p in profiles.DefaultIfEmpty()
            select new { u.Id, DisplayName = p != null ? p.DisplayName : null, u.GoogleName, AvatarUrl = p != null ? p.AvatarUrl : null, u.GooglePicture }
        ).ToListAsync();

        // Аватарка — посиланням (AvatarLink), а не вмістом: картки йдуть у списки (листування, кожне
        // повідомлення, відгуки, граф смаку на 150 людей, «додав» у піснях ком'юніті), і своя аватарка
        // data:-URI несла б десятки КБ на кожен рядок.
        return rows.ToDictionary(r => r.Id, r => new UserCard(
            r.Id,
            r.DisplayName ?? r.GoogleName ?? $"Учасник спільноти #{r.Id}",
            AvatarLink(r.Id, r.AvatarUrl ?? r.GooglePicture)));
    }

    // Сама картинка для /api/users/{id}/avatar: data:-URI своєї аватарки або адреса фото з Google.
    public async Task<string?> GetAvatarSourceAsync(int userId) => await (
        from u in db.Users
        where u.Id == userId
        join p in db.UserProfiles on u.Email equals p.UserEmail into profiles
        from p in profiles.DefaultIfEmpty()
        select p != null && p.AvatarUrl != null ? p.AvatarUrl : u.GooglePicture
    ).FirstOrDefaultAsync();

    public Task<Dictionary<int, UserCard>> GetUserCardsAsync(IEnumerable<int> userIds) => GetUserCardsAsync(db, userIds);
}
