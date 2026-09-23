using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;

namespace MusicDB.Api.Services;

// Єдина точка "email -> opaque id" — викликається і з Program.cs (при кожному
// Google-логіні), і з будь-якого контролера, якому потрібен стабільний id.
public class UserDirectoryService(MusicDbContext db)
{
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

        return await db.Users.Where(u => u.Email == email).Select(u => u.Id).FirstAsync();
    }

    public Task<int> GetCurrentUserIdAsync(ClaimsPrincipal user) => GetOrCreateUserIdAsync(
        user.FindFirstValue(ClaimTypes.Email) ?? "",
        user.FindFirstValue(ClaimTypes.Name),
        user.FindFirstValue("picture") ?? user.FindFirstValue("urn:google:picture"));

    public record UserCard(int UserId, string DisplayName, string? AvatarUrl)
    {
        public UserRefDto ToRef() => new(UserId, DisplayName);
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

        return rows.ToDictionary(r => r.Id, r => new UserCard(
            r.Id,
            r.DisplayName ?? r.GoogleName ?? $"Учасник спільноти #{r.Id}",
            r.AvatarUrl ?? r.GooglePicture));
    }

    public Task<Dictionary<int, UserCard>> GetUserCardsAsync(IEnumerable<int> userIds) => GetUserCardsAsync(db, userIds);
}
