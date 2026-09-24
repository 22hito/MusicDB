using Microsoft.AspNetCore.SignalR;
using MusicDB.Api.Data;
using MusicDB.Api.Hubs;

namespace MusicDB.Api.Services;

// Журнал дій із заявками/каталогом для дзвіночка адмінів: хто надіслав запит,
// хто з адмінів схвалив/відхилив/додав. Один рядок на подію (не фан-аут),
// прочитане — AdminNotificationRead.LastReadAt.
public class AdminActivityService(MusicDbContext db, IHubContext<MusicHub> hub)
{
    public const string RequestSubmitted = "request_submitted";
    public const string RequestApproved = "request_approved";
    public const string RequestRejected = "request_rejected";
    public const string SongAdded = "song_added";
    public const string BugReported = "bug_reported";

    public async Task RecordAsync(int? actorUserId, string eventType, string label, string source)
    {
        db.AdminEvents.Add(new AdminEvent
        {
            ActorUserId = actorUserId,
            EventType = eventType,
            Label = label,
            Source = source
        });
        await db.SaveChangesAsync();
        await hub.Clients.Group(MusicHub.AdminsGroup).SendAsync("adminNotification");
    }
}
