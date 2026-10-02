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
public class MessagesController(MusicDbContext db, UserDirectoryService userDirectory, IHubContext<MusicHub> hub,
    IAudioStorage storage, MusicService musicService) : ControllerBase
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
        var cleared = await ClearedUpToAsync(myId);
        groups = groups
            .Where(g => !HiddenStates.Contains(states[g.OtherId]))
            .Where(g => g.LastId > cleared.GetValueOrDefault(g.OtherId)) // після "видалити чат у себе" — лише якщо прийшло нове
            .ToList();

        var lastIds = groups.Select(g => g.LastId).ToList();
        var lastMessages = await db.DirectMessages.Where(m => lastIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id);
        var lastSongIds = lastMessages.Values.Where(m => m.MusicId is not null).Select(m => m.MusicId!.Value).ToList();
        var lastSongs = await db.Songs.Where(m => lastSongIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => $"{m.Artist} — {m.Title}");
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
                    Preview(last, lastSongs),
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
            // Лише повідомлення, надіслані ПІСЛЯ появи запиту: якщо раніше ви були
            // друзями, стара історія лишається в діалозі, але превʼю й лічильник
            // запиту мають показувати саме нове повідомлення, а не найстаріше.
            var fromThem = messages.Where(m => m.SenderId == r.RequesterId && m.CreatedAt >= r.CreatedAt).ToList();
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

        var clearedUpTo = (await ClearedUpToAsync(myId)).GetValueOrDefault(userId);
        var messages = await db.DirectMessages
            .Where(m => (m.SenderId == myId && m.RecipientId == userId) || (m.SenderId == userId && m.RecipientId == myId))
            .Where(m => m.Id > clearedUpTo)
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
        var songs = await SongsForAsync(messages);
        return Ok(new DmThreadDto(state, CanSend(state), messages.Select(m => ToDto(m, myId, songs)).ToList()));
    }

    // "Видалити чат у себе": ховає всю поточну переписку лише для мене. Співрозмовник
    // свою копію зберігає; нові повідомлення (від будь-кого) з'являться знову.
    [HttpDelete("{userId:int}")]
    public async Task<IActionResult> ClearForMe(int userId)
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var pair = db.DirectMessages.Where(m =>
            (m.SenderId == myId && m.RecipientId == userId) || (m.SenderId == userId && m.RecipientId == myId));
        var lastId = await pair.MaxAsync(m => (int?)m.Id);
        if (lastId is null) return NoContent();

        var row = await db.DmCleared.FindAsync(myId, userId);
        if (row is null) db.DmCleared.Add(new DmCleared { UserId = myId, OtherUserId = userId, ClearedUpToId = lastId.Value });
        else { row.ClearedUpToId = lastId.Value; row.ClearedAt = DateTime.UtcNow; }

        // Приховане не має висіти непрочитаним у лічильниках.
        var now = DateTime.UtcNow;
        foreach (var m in await pair.Where(m => m.RecipientId == myId && m.ReadAt == null && m.Id <= lastId).ToListAsync())
            m.ReadAt = now;
        await db.SaveChangesAsync();

        await NotifySelfAsync("dmSent", userId); // інші вкладки — оновити список розмов і лічильник
        return NoContent();
    }

    private async Task<Dictionary<int, int>> ClearedUpToAsync(int myId) =>
        await db.DmCleared.Where(c => c.UserId == myId).ToDictionaryAsync(c => c.OtherUserId, c => c.ClearedUpToId);

    [HttpPost("{userId:int}")]
    public async Task<ActionResult<DirectMessageDto>> Send(int userId, [FromBody] SendMessageDto dto)
    {
        var body = dto.Body?.Trim() ?? "";
        if (body.Length == 0 || body.Length > MaxBodyLength) return BadRequest("Message must be 1–4000 characters.");

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var (error, requestCreated) = await PrepareSendAsync(myId, userId);
        if (error is not null) return error;
        return await CommitAsync(myId, userId, new DirectMessage { SenderId = myId, RecipientId = userId, Body = body }, requestCreated);
    }

    // Повідомлення з файлом і/або піснею (multipart: body?, musicId?, file?). Хоч щось одне має бути.
    // Файл зберігається лише після перевірки, що писати можна, — без осиротілих файлів у сховищі.
    [HttpPost("{userId:int}/rich")]
    [RequestSizeLimit(AudioFiles.MaxAttachmentBytes + 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = AudioFiles.MaxAttachmentBytes + 1024 * 1024)]
    public async Task<ActionResult<DirectMessageDto>> SendRich(int userId, [FromForm] string? body, [FromForm] int? musicId, IFormFile? file)
    {
        body = body?.Trim() ?? "";
        if (body.Length > MaxBodyLength) return BadRequest("Message must be at most 4000 characters.");
        if (body.Length == 0 && musicId is null && file is null) return BadRequest("Empty message.");
        if (musicId is not null && !await db.Songs.AnyAsync(m => m.Id == musicId)) return BadRequest("Unknown song.");

        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var (error, requestCreated) = await PrepareSendAsync(myId, userId);
        if (error is not null) return error;

        var message = new DirectMessage { SenderId = myId, RecipientId = userId, Body = body, MusicId = musicId };
        if (file is not null)
        {
            var (stored, saveError) = await storage.SaveAttachmentAsync(file);
            if (stored is null) return BadRequest(saveError);
            message.AttachmentFile = stored;
            message.AttachmentName = AudioFiles.CleanDisplayName(file.FileName, stored);
            message.AttachmentSize = file.Length;
        }
        return await CommitAsync(myId, userId, message, requestCreated);
    }

    // Чи можна писати зараз: друзям — завжди; не-другу перше повідомлення стає запитом, відповідь на
    // вхідний запит — схваленням. Зміни (новий/схвалений запит) лишаються в контексті до CommitAsync.
    private async Task<(ActionResult? Error, bool RequestCreated)> PrepareSendAsync(int myId, int userId)
    {
        if (userId == myId) return (BadRequest(), false);
        if (!await db.Users.AnyAsync(u => u.Id == userId)) return (NotFound(), false);
        if (await AreFriendsAsync(myId, userId)) return (null, false);

        var req = await FindRequestAsync(myId, userId);
        switch (StateOf(req, myId))
        {
            case "pending_outgoing":
                return (Conflict("Waiting for the recipient to accept your message request."), false);
            case "declined":
                return (StatusCode(StatusCodes.Status403Forbidden, "The recipient declined your message request."), false);
            case "pending_incoming":
            case "declined_by_me":
                // Відповідь на запит (або на раніше відхилений) = схвалення.
                req!.Status = "accepted";
                req.RespondedAt = DateTime.UtcNow;
                return (null, false);
            case "none":
                db.DmRequests.Add(new DmRequest { RequesterId = myId, AddresseeId = userId });
                return (null, true);
            default:
                return (null, false);
        }
    }

    private async Task<ActionResult<DirectMessageDto>> CommitAsync(int myId, int userId, DirectMessage message, bool requestCreated)
    {
        db.DirectMessages.Add(message);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException) when (requestCreated)
        {
            // Гонка: співрозмовник саме створив зустрічний запит — нехай спробує ще раз.
            await storage.DeleteAsync(message.AttachmentFile);
            return Conflict("Please retry.");
        }

        // Ім'я відправника — щоб отримувач одразу показав "Нове повідомлення від …",
        // не роблячи окремого запиту. Мобільний клієнт читає лише args[0] — сумісно.
        var senderName = (await userDirectory.GetUserCardsAsync([myId])).GetValueOrDefault(myId)?.DisplayName;
        await NotifyAsync(userId, requestCreated ? "dmRequestsChanged" : "dmReceived", myId, senderName);
        await NotifySelfAsync("dmSent", userId);
        return Ok(ToDto(message, myId, await SongsForAsync([message])));
    }

    // Файл із повідомлення — лише відправнику й отримувачу. Картинки, аудіо й відео — для показу в чаті,
    // решта — завантаженням під назвою від відправника.
    // download=true — будь-який файл на збереження (кнопка «Завантажити»);
    // inline=true — PDF і текст для перегляду просто на сайті (вбудований переглядач), а не завантаженням.
    [HttpGet("attachment/{messageId:int}")]
    public async Task<IActionResult> GetAttachment(int messageId, [FromQuery] bool download = false, [FromQuery] bool inline = false)
    {
        var source = await OpenAttachmentAsync(messageId, download, inline);
        if (source is null) return NotFound();
        // Локальне сховище віддає файл саме — переглядач показує його у фреймі нашого ж сайту.
        if (inline && source.RedirectUrl is null)
        {
            Response.Headers.XFrameOptions = "SAMEORIGIN";
            Response.Headers.ContentSecurityPolicy = "frame-ancestors 'self'";
        }
        return this.ToResult(source);
    }

    // Пряме посилання (застосунку: картинка чи плеєр не несуть куку сесії).
    [HttpGet("attachment/{messageId:int}/link")]
    public async Task<IActionResult> GetAttachmentLink(int messageId, [FromQuery] bool download = false, [FromQuery] bool inline = false)
    {
        var source = await OpenAttachmentAsync(messageId, download, inline);
        if (source is null) return NotFound();
        var query = download ? "?download=true" : inline ? "?inline=true" : "";
        return Ok(new { url = source.RedirectUrl ?? $"/api/messages/attachment/{messageId}{query}" });
    }

    private async Task<AudioSource?> OpenAttachmentAsync(int messageId, bool download = false, bool inline = false)
    {
        var myId = await userDirectory.GetCurrentUserIdAsync(User);
        var m = await db.DirectMessages.FindAsync(messageId);
        if (m?.AttachmentFile is null || (m.SenderId != myId && m.RecipientId != myId)) return null;
        var type = AudioFiles.GetContentType(m.AttachmentFile);
        if (download) return await storage.OpenAsync(m.AttachmentFile, m.AttachmentName ?? "file");
        if (AudioFiles.IsInlineType(type)) return await storage.OpenAsync(m.AttachmentFile);
        if (inline && type == "text/plain") return await storage.OpenAsync(m.AttachmentFile, null, "text/plain; charset=utf-8");
        if (inline && type == "application/pdf") return await storage.OpenAsync(m.AttachmentFile);
        return await storage.OpenAsync(m.AttachmentFile, m.AttachmentName);
    }

    private async Task<Dictionary<int, SongDto>> SongsForAsync(IEnumerable<DirectMessage> messages)
    {
        var ids = messages.Where(m => m.MusicId is not null).Select(m => m.MusicId!.Value).Distinct().ToList();
        if (ids.Count == 0) return [];
        var songs = await db.Songs.AsNoTracking().Include(m => m.MusicGenres).ThenInclude(mg => mg.Genre)
            .Where(m => ids.Contains(m.Id)).ToListAsync();
        return (await musicService.BuildSongDtosAsync(songs)).ToDictionary(s => s.Id);
    }

    private async Task NotifyAsync(int userId, string evt, int arg, string? name = null)
    {
        var email = await db.Users.Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefaultAsync();
        if (email is not null) await hub.Clients.Group(MusicHub.UserGroup(email)).SendAsync(evt, arg, name);
    }

    // Іншим вкладкам самого користувача.
    private Task NotifySelfAsync(string evt, int arg) =>
        hub.Clients.Group(MusicHub.UserGroup(User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "")).SendAsync(evt, arg);

    private static string Preview(string body) => body.Length > 120 ? body[..120] + "…" : body;

    // У списку розмов: текст; без тексту — «📎 назва файлу» чи «🎵 Виконавець — Назва» (без слів — не залежить від мови).
    private static string Preview(DirectMessage m, Dictionary<int, string> songs) =>
        m.Body.Length > 0 ? Preview(m.Body)
        : m.AttachmentName is not null ? $"📎 {m.AttachmentName}"
        : m.MusicId is int id && songs.TryGetValue(id, out var song) ? Preview($"🎵 {song}")
        : "";

    private static DirectMessageDto ToDto(DirectMessage m, int myId, Dictionary<int, SongDto>? songs = null)
    {
        DmAttachmentDto? attachment = null;
        if (m.AttachmentFile is not null)
        {
            var type = AudioFiles.GetContentType(m.AttachmentFile);
            var kind = type.StartsWith("image/") ? "image" : type.StartsWith("audio/") ? "audio" : type.StartsWith("video/") ? "video" : "file";
            attachment = new DmAttachmentDto(m.AttachmentName ?? "file", type, m.AttachmentSize ?? 0, kind, $"/api/messages/attachment/{m.Id}");
        }
        var song = m.MusicId is int id && songs is not null ? songs.GetValueOrDefault(id) : null;
        return new(m.Id, m.SenderId, m.RecipientId, m.Body, m.CreatedAt.ToString("yyyy-MM-dd HH:mm"), m.SenderId == myId, attachment, song);
    }
}
