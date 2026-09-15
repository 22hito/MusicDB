using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;

namespace MusicDB.Api.Services;

// Єдина точка "email -> opaque id" — і Program.cs (при кожному Google-логіні),
// і будь-який контролер, якому потрібен стабільний id (для юзера, чия кука
// пережила деплой цієї фічі й ще не пройшла новий логін). Кука вже несе
// Name/picture-claims з оригінального тікета (так само їх читає /auth/me),
// тож обидва шляхи апсертять однакові дані — жодного "збіднення" для лінивого шляху.
public class UserDirectoryService(MusicDbContext db)
{
    // INSERT ... ON CONFLICT — захист від гонки при одночасному першому
    // запиті (напр. дві вкладки відкрились одночасно одразу після деплою).
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
