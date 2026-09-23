using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Hubs;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

// Особисті повідомлення. Друзі пишуть одне одному вільно; не-другу перше
// повідомлення надходить як запит (вкладка "Запити на листування"), і далі
// писати можна лише після схвалення. Співрозмовник — opaque userId, email
// ніколи не повертається. Реалтайм — SignalR-група отримувача.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController(MusicDbContext db, UserDirectoryService userDirectory, IHubContext<MusicHub> hub) : ControllerBase
{
    public const int MaxBodyLength = 4000;

    // Стани, в яких розмова НЕ показується в "Особистих" (вона у "Запитах" або відхилена мною).
    private static readonly string[] HiddenStates = ["pending_incoming", "declined_by_me"];

    private static bool CanSend(string state) => state is not ("pending_outgoing" or "declined");

    private async Task<bool> AreFriendsAsync(int a, int b) => await db.FriendRequests.AnyAsync(r =>
        r.Status == "accepted" &&
        ((r.RequesterId == a && r.AddresseeId == b) || (r.RequesterId == b && r.AddresseeId == a)));

    private Task<DmRequest?> FindRequestAsync(int a, int b) => db.DmRequests.FirstOrDefaultAsync(r =>
        (r.RequesterId == a && r.AddresseeId == b) || (r.RequesterId == b && r.AddresseeId == a));

    private static string StateOf(DmRequest? req, int myId) => req switch
    {
        null => "none",
        { Status: "accepted" } => "accepted",
        { Status: "pending" } => req.RequesterId == myId ? "pending_outgoing" : "pending_incoming",
        _ => req.RequesterId == myId ? "declined" : "declined_by_me"
    };

    private async Task<string> GetStateAsync(int myId, int otherId) =>
        await AreFriendsAsync(myId, otherId) ? "friends" : StateOf(await FindRequestAsync(myId, otherId), myId);

    // Стан для всіх співрозмовників одним проходом (для списку розмов і лічильника).
    private async Task<Dictionary<int, string>> GetStatesAsync(int myId, List<int> otherIds)
    {
        var friendIds = (await db.FriendRequests
            .Where(r => r.Status == "accepted" && (r.RequesterId == myId || r.AddresseeId == myId))
            .Select(r => r.RequesterId == myId ? r.AddresseeId : r.RequesterId)
            .ToListAsync()).ToHashSet();
        var requests = await db.DmRequests
            .Where(r => r.RequesterId == myId || r.AddresseeId == myId)
            .ToListAsync();
        var byOther = requests.ToDictionary(r => r.RequesterId == myId ? r.AddresseeId : r.RequesterId);

        return otherIds.Distinct().ToDictionary(id => id,
            id => friendIds.Contains(id) ? "friends" : StateOf(byOther.GetValueOrDefault(id), myId));
    }

    [HttpGet("conversations")]
    public async Task<ActionResult<List<ConversationDto>>> GetConversations()
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);

        var groups = await db.DirectMessages
            .Where(m => m.SenderId == myId || m.RecipientId == myId)
            .GroupBy(m => m.SenderId == myId ? m.RecipientId : m.SenderId)
            .Select(g => new
            {
                OtherId = g.Key,
                LastId = g.Max(m => m.Id),
                Unread = g.Count(m => m.RecipientId == myId && m.ReadAt == null)
            })
            .ToListAsync();

        var states = await GetStatesAsync(myId, groups.Select(g => g.OtherId).ToList());
        groups = groups.Where(g => !HiddenStates.Contains(states[g.OtherId])).ToList();

        var lastIds = groups.Select(g => g.LastId).ToList();
        var lastMessages = await db.DirectMessages.Where(m => lastIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id);
        var cards = await userDirectory.GetUserCardsAsync(groups.Select(g => g.OtherId));

        return Ok(groups
            .OrderByDescending(g => g.LastId)
            .Select(g =>
            {
                var last = lastMessages[g.LastId];
                var card = cards.GetValueOrDefault(g.OtherId);
                return new ConversationDto(
                    g.OtherId,
                    card?.DisplayName ?? $"Учасник спільноти #{g.OtherId}",
                    card?.AvatarUrl,
                    Preview(last.Body),
                    last.SenderId == myId,
                    last.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                    g.Unread,
                    states[g.OtherId]);
            })
            .ToList());
    }

    // Непрочитані в "Особистих" + кількість вхідних запитів на листування.
    [HttpGet("unread-count")]
    public async Task<ActionResult<DmUnreadDto>> GetUnreadCount()
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var pendingFrom = await db.DmRequests
            .Where(r => r.AddresseeId == myId && r.Status != "accepted")
            .Select(r => r.RequesterId)
            .ToListAsync();
        var requests = await db.DmRequests.CountAsync(r => r.AddresseeId == myId && r.Status == "pending");
        var unread = await db.DirectMessages.CountAsync(m =>
            m.RecipientId == myId && m.ReadAt == null && !pendingFrom.Contains(m.SenderId));
        return Ok(new DmUnreadDto(unread, requests));
    }

    [HttpGet("requests")]
    public async Task<ActionResult<List<DmRequestDto>>> GetRequests()
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var pending = await db.DmRequests
            .Where(r => r.AddresseeId == myId && r.Status == "pending")
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        var senderIds = pending.Select(r => r.RequesterId).ToList();

        var messages = await db.DirectMessages
            .Where(m => m.RecipientId == myId && senderIds.Contains(m.SenderId))
            .OrderBy(m => m.Id)
            .ToListAsync();
        var cards = await userDirectory.GetUserCardsAsync(senderIds);

        return Ok(pending.Select(r =>
        {
            var fromThem = messages.Where(m => m.SenderId == r.RequesterId).ToList();
            var card = cards.GetValueOrDefault(r.RequesterId);
            return new DmRequestDto(
                r.RequesterId,
                card?.DisplayName ?? $"Учасник спільноти #{r.RequesterId}",
                card?.AvatarUrl,
                fromThem.Count > 0 ? Preview(fromThem[0].Body) : "",
                fromThem.Count,
                r.CreatedAt.ToString("yyyy-MM-dd HH:mm"));
        }).ToList());
    }

    [HttpPost("requests/{userId:int}/accept")]
    public async Task<IActionResult> AcceptRequest(int userId) => await RespondAsync(userId, "accepted");

    [HttpPost("requests/{userId:int}/decline")]
    public async Task<IActionResult> DeclineRequest(int userId) => await RespondAsync(userId, "declined");

    private async Task<IActionResult> RespondAsync(int userId, string status)
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var req = await db.DmRequests.FirstOrDefaultAsync(r => r.RequesterId == userId && r.AddresseeId == myId);
        if (req is null) return NotFound();

        req.Status = status;
        req.RespondedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await NotifyAsync(userId, "dmRequestsChanged", myId);
        await NotifySelfAsync("dmRequestsChanged", userId);
        return Ok();
    }

    // Діалог (до 200 останніх) + чи можна зараз писати. Запит, що чекає мого
    // рішення, можна переглянути — але він не стає "прочитаним".
    [HttpGet("{userId:int}")]
    public async Task<ActionResult<DmThreadDto>> GetThread(int userId)
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var state = await GetStateAsync(myId, userId);

        var messages = await db.DirectMessages
            .Where(m => (m.SenderId == myId && m.RecipientId == userId) || (m.SenderId == userId && m.RecipientId == myId))
            .OrderByDescending(m => m.Id)
            .Take(200)
            .ToListAsync();

        if (!HiddenStates.Contains(state))
        {
            var unread = messages.Where(m => m.RecipientId == myId && m.ReadAt == null).ToList();
            if (unread.Count > 0)
            {
                var now = DateTime.UtcNow;
                foreach (var m in unread) m.ReadAt = now;
                await db.SaveChangesAsync();
            }
        }

        messages.Reverse();
        return Ok(new DmThreadDto(state, CanSend(state), messages.Select(m => ToDto(m, myId)).ToList()));
    }

    [HttpPost("{userId:int}")]
    public async Task<ActionResult<DirectMessageDto>> Send(int userId, [FromBody] SendMessageDto dto)
    {
        var body = dto.Body?.Trim() ?? "";
        if (body.Length == 0 || body.Length > MaxBodyLength) return BadRequest("Message must be 1–4000 characters.");

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        if (userId == myId) return BadRequest();
        if (!await db.Users.AnyAsync(u => u.Id == userId)) return NotFound();

        var requestCreated = false;
        if (!await AreFriendsAsync(myId, userId))
        {
            var req = await FindRequestAsync(myId, userId);
            switch (StateOf(req, myId))
            {
                case "pending_outgoing":
                    return Conflict("Waiting for the recipient to accept your message request.");
                case "declined":
                    return StatusCode(StatusCodes.Status403Forbidden, "The recipient declined your message request.");
                case "pending_incoming":
                case "declined_by_me":
                    // Відповідь на запит (або на раніше відхилений) = схвалення.
                    req!.Status = "accepted";
                    req.RespondedAt = DateTime.UtcNow;
                    break;
                case "none":
                    db.DmRequests.Add(new DmRequest { RequesterId = myId, AddresseeId = userId });
                    requestCreated = true;
                    break;
            }
        }

        var message = new DirectMessage { SenderId = myId, RecipientId = userId, Body = body };
        db.DirectMessages.Add(message);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException) when (requestCreated)
        {
            // Гонка: співрозмовник саме створив зустрічний запит — нехай спробує ще раз.
            return Conflict("Please retry.");
        }

        await NotifyAsync(userId, requestCreated ? "dmRequestsChanged" : "dmReceived", myId);
        await NotifySelfAsync("dmSent", userId);
        return Ok(ToDto(message, myId));
    }

    private async Task NotifyAsync(int userId, string evt, int arg)
    {
        var email = await db.Users.Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefaultAsync();
        if (email is not null) await hub.Clients.Group(MusicHub.UserGroup(email)).SendAsync(evt, arg);
    }

    // Іншим вкладкам самого користувача.
    private Task NotifySelfAsync(string evt, int arg) =>
        hub.Clients.Group(MusicHub.UserGroup(User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "")).SendAsync(evt, arg);

    private static string Preview(string body) => body.Length > 120 ? body[..120] + "…" : body;

    private static DirectMessageDto ToDto(DirectMessage m, int myId) =>
        new(m.Id, m.SenderId, m.RecipientId, m.Body, m.CreatedAt.ToString("yyyy-MM-dd HH:mm"), m.SenderId == myId);
}
