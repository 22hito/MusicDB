using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Hubs;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendsController(MusicDbContext db, UserDirectoryService userDirectory, IHubContext<MusicHub> hub) : ControllerBase
{
    // Іншій стороні — одразу оновити дзвіночок/сторінку друзів/профіль і, для нового
    // запиту, показати "X хоче додати вас у друзі" (kind: request | accepted | removed).
    private async Task NotifyFriendsChangedAsync(int otherUserId, int myId, string kind)
    {
        var email = await db.Users.Where(u => u.Id == otherUserId).Select(u => u.Email).FirstOrDefaultAsync();
        if (email is null) return;
        var myName = (await userDirectory.GetUserCardsAsync([myId])).GetValueOrDefault(myId)?.DisplayName;
        await hub.Clients.Group(MusicHub.UserGroup(email)).SendAsync("friendsChanged", myId, myName, kind);
    }

    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? "";

    // Лише читання (і кеш у пам'яті) — не INSERT … ON CONFLICT DO UPDATE на кожен запит, як було.
    private Task<int> CurrentUserIdAsync() => userDirectory.GetCurrentUserIdAsync(User);

    // Імена й аватарки всіх людей списку — одним запитом (GetUserCardsAsync), а не двома на кожного.
    private static FriendRequestDto ToFriendRequestDto(FriendRequest r, int otherUserId, Dictionary<int, UserDirectoryService.UserCard> cards)
    {
        var card = cards.GetValueOrDefault(otherUserId);
        return new FriendRequestDto(
            r.Id, otherUserId,
            card?.DisplayName ?? $"Учасник спільноти #{otherUserId}",
            card?.AvatarUrl,
            r.CreatedAt.ToString("yyyy-MM-dd HH:mm"));
    }

    private async Task<FriendRequestDto> ToFriendRequestDtoAsync(FriendRequest r, int otherUserId) =>
        ToFriendRequestDto(r, otherUserId, await userDirectory.GetUserCardsAsync([otherUserId]));

    [HttpGet]
    public async Task<ActionResult<List<PublicUserDto>>> GetFriends()
    {
        var myId = await CurrentUserIdAsync();
        var rows = await db.FriendRequests
            .Where(r => r.Status == "accepted" && (r.RequesterId == myId || r.AddresseeId == myId))
            .ToListAsync();

        var otherIds = rows.Select(r => r.RequesterId == myId ? r.AddresseeId : r.RequesterId).ToList();
        var cards = await userDirectory.GetUserCardsAsync(otherIds);
        return Ok(otherIds.Select(id => new PublicUserDto(
            id, cards.GetValueOrDefault(id)?.DisplayName ?? $"Учасник спільноти #{id}", cards.GetValueOrDefault(id)?.AvatarUrl, "friends")).ToList());
    }

    [HttpGet("requests/incoming")]
    public async Task<ActionResult<List<FriendRequestDto>>> GetIncoming()
    {
        var myId = await CurrentUserIdAsync();
        var rows = await db.FriendRequests
            .Where(r => r.Status == "pending" && r.AddresseeId == myId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var cards = await userDirectory.GetUserCardsAsync(rows.Select(r => r.RequesterId));
        return Ok(rows.Select(r => ToFriendRequestDto(r, r.RequesterId, cards)).ToList());
    }

    [HttpGet("requests/outgoing")]
    public async Task<ActionResult<List<FriendRequestDto>>> GetOutgoing()
    {
        var myId = await CurrentUserIdAsync();
        var rows = await db.FriendRequests
            .Where(r => r.Status == "pending" && r.RequesterId == myId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var cards = await userDirectory.GetUserCardsAsync(rows.Select(r => r.AddresseeId));
        return Ok(rows.Select(r => ToFriendRequestDto(r, r.AddresseeId, cards)).ToList());
    }

    // Якщо цільовий юзер уже надіслав pending-запит мені — одразу приймаємо,
    // замість створення другого рядка. Унікальність пари (pair_low/pair_high)
    // захищає від гонки: DbUpdateException стає ідемпотентною відповіддю.
    [HttpPost("requests")]
    public async Task<ActionResult<FriendRequestDto>> SendRequest([FromBody] SendFriendRequestDto dto)
    {
        var myId = await CurrentUserIdAsync();
        if (dto.TargetUserId == myId) return BadRequest();
        if (!await db.Users.AnyAsync(u => u.Id == dto.TargetUserId)) return NotFound();

        var reverse = await db.FriendRequests.FirstOrDefaultAsync(r =>
            r.RequesterId == dto.TargetUserId && r.AddresseeId == myId && r.Status == "pending");
        if (reverse is not null)
        {
            reverse.Status = "accepted";
            reverse.RespondedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            await NotifyFriendsChangedAsync(dto.TargetUserId, myId, "accepted");
            return Ok(await ToFriendRequestDtoAsync(reverse, dto.TargetUserId));
        }

        var req = new FriendRequest { RequesterId = myId, AddresseeId = dto.TargetUserId, Status = "pending" };
        db.FriendRequests.Add(req);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            var existing = await db.FriendRequests.FirstAsync(r =>
                (r.RequesterId == myId && r.AddresseeId == dto.TargetUserId) ||
                (r.RequesterId == dto.TargetUserId && r.AddresseeId == myId));
            return Ok(await ToFriendRequestDtoAsync(existing, dto.TargetUserId));
        }
        await NotifyFriendsChangedAsync(dto.TargetUserId, myId, "request");
        return Ok(await ToFriendRequestDtoAsync(req, dto.TargetUserId));
    }

    [HttpPost("requests/{requestId:int}/accept")]
    public async Task<IActionResult> Accept(int requestId)
    {
        var myId = await CurrentUserIdAsync();
        var req = await db.FriendRequests.FirstOrDefaultAsync(r => r.Id == requestId && r.AddresseeId == myId && r.Status == "pending");
        if (req is null) return NotFound();

        req.Status = "accepted";
        req.RespondedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await NotifyFriendsChangedAsync(req.RequesterId, myId, "accepted");
        return Ok(await ToFriendRequestDtoAsync(req, req.RequesterId));
    }

    // Скасувати вихідний запит АБО відхилити вхідний — обидва просто видаляють pending-рядок.
    [HttpDelete("requests/{requestId:int}")]
    public async Task<IActionResult> CancelOrReject(int requestId)
    {
        var myId = await CurrentUserIdAsync();
        var req = await db.FriendRequests.FirstOrDefaultAsync(r =>
            r.Id == requestId && r.Status == "pending" && (r.RequesterId == myId || r.AddresseeId == myId));
        if (req is null) return NotFound();

        db.FriendRequests.Remove(req);
        await db.SaveChangesAsync();
        await NotifyFriendsChangedAsync(req.RequesterId == myId ? req.AddresseeId : req.RequesterId, myId, "removed");
        return NoContent();
    }

    [HttpDelete("{friendUserId:int}")]
    public async Task<IActionResult> Unfriend(int friendUserId)
    {
        var myId = await CurrentUserIdAsync();
        var req = await db.FriendRequests.FirstOrDefaultAsync(r =>
            r.Status == "accepted" &&
            ((r.RequesterId == myId && r.AddresseeId == friendUserId) ||
             (r.RequesterId == friendUserId && r.AddresseeId == myId)));
        if (req is null) return NotFound();

        db.FriendRequests.Remove(req);
        await db.SaveChangesAsync();
        await NotifyFriendsChangedAsync(friendUserId, myId, "removed");
        return NoContent();
    }
}
