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

    private async Task<int> CurrentUserIdAsync() => await userDirectory.GetOrCreateUserIdAsync(
        CurrentEmail,
        User.FindFirstValue(ClaimTypes.Name),
        User.FindFirstValue("picture") ?? User.FindFirstValue("urn:google:picture"));

    private async Task<PublicUserDto> ToPublicUserDtoAsync(int userId, string relationshipStatus)
    {
        var user = await db.Users.FindAsync(userId);
        var profile = user is null ? null : await db.UserProfiles.FindAsync(user.Email);
        return new PublicUserDto(
            userId,
            profile?.DisplayName ?? user?.GoogleName ?? $"Учасник спільноти #{userId}",
            profile?.AvatarUrl ?? user?.GooglePicture,
            relationshipStatus);
    }

    private async Task<FriendRequestDto> ToFriendRequestDtoAsync(FriendRequest r, int otherUserId)
    {
        var user = await db.Users.FindAsync(otherUserId);
        var profile = user is null ? null : await db.UserProfiles.FindAsync(user.Email);
        return new FriendRequestDto(
            r.Id, otherUserId,
            profile?.DisplayName ?? user?.GoogleName ?? $"Учасник спільноти #{otherUserId}",
            profile?.AvatarUrl ?? user?.GooglePicture,
            r.CreatedAt.ToString("yyyy-MM-dd HH:mm"));
    }

    [HttpGet]
    public async Task<ActionResult<List<PublicUserDto>>> GetFriends()
    {
        var myId = await CurrentUserIdAsync();
        var rows = await db.FriendRequests
            .Where(r => r.Status == "accepted" && (r.RequesterId == myId || r.AddresseeId == myId))
            .ToListAsync();

        var result = new List<PublicUserDto>();
        foreach (var r in rows)
        {
            var otherId = r.RequesterId == myId ? r.AddresseeId : r.RequesterId;
            result.Add(await ToPublicUserDtoAsync(otherId, "friends"));
        }
        return Ok(result);
    }

    [HttpGet("requests/incoming")]
    public async Task<ActionResult<List<FriendRequestDto>>> GetIncoming()
    {
        var myId = await CurrentUserIdAsync();
        var rows = await db.FriendRequests
            .Where(r => r.Status == "pending" && r.AddresseeId == myId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = new List<FriendRequestDto>();
        foreach (var r in rows) result.Add(await ToFriendRequestDtoAsync(r, r.RequesterId));
        return Ok(result);
    }

    [HttpGet("requests/outgoing")]
    public async Task<ActionResult<List<FriendRequestDto>>> GetOutgoing()
    {
        var myId = await CurrentUserIdAsync();
        var rows = await db.FriendRequests
            .Where(r => r.Status == "pending" && r.RequesterId == myId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = new List<FriendRequestDto>();
        foreach (var r in rows) result.Add(await ToFriendRequestDtoAsync(r, r.AddresseeId));
        return Ok(result);
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
