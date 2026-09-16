using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;

namespace MusicDB.Api.Services;

// Єдина точка "email -> opaque id" — викликається і з Program.cs (при кожному
// Google-логіні), і з будь-якого контролера, якому потрібен стабільний id.
public class UserDirectoryService(MusicDbContext db)
{
    // INSERT ... ON CONFLICT — захист від гонки при одночасному першому запиті.
    public async Task<int> GetOrCreateUserIdAsync(string email, string? googleName, string? googlePicture)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT INTO lab.users (email, google_name, google_picture, last_login_at)
            VALUES ({email}, {googleName}, {googlePicture}, now())
            ON CONFLICT (email) DO UPDATE
            SET google_name = EXCLUDED.google_name,
                google_picture = EXCLUDED.google_picture,
                last_login_at = now()");

        return await db.Users.Where(u => u.Email == email).Select(u => u.Id).FirstAsync();
    }
}
