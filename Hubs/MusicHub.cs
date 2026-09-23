using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace MusicDB.Api.Hubs;

// Клієнти лише слухають — уся логіка живе в контролерах (IHubContext<MusicHub>).
// Групи потрібні для адресних подій: особисті повідомлення конкретному
// користувачу та сповіщення лише адмінам. Email живе тільки в назві групи
// на сервері — клієнтам не передається.
public class MusicHub : Hub
{
    public const string AdminsGroup = "admins";
    public static string UserGroup(string email) => "user:" + email.ToLowerInvariant();

    public override async Task OnConnectedAsync()
    {
        var email = Context.User?.FindFirstValue(ClaimTypes.Email);
        if (!string.IsNullOrEmpty(email))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(email));
            if (Context.User!.HasClaim("role", "admin"))
                await Groups.AddToGroupAsync(Context.ConnectionId, AdminsGroup);
        }
        await base.OnConnectedAsync();
    }
}
