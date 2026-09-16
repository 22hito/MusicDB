using MusicDB.Api.Data;

namespace MusicDB.Api.Services;

// Журнал подій каталогу для підписників-на-виконавця. Один рядок на подію
// незалежно від кількості підписників (не фан-аут) — див. ArtistFollow.LastReadAt.
public class ArtistActivityService(MusicDbContext db)
{
    public async Task RecordEventAsync(IEnumerable<int> artistIds, string eventType, int? musicId, string songLabel)
    {
        var ids = artistIds.Distinct().ToList();
        if (ids.Count == 0) return;

        foreach (var artistId in ids)
            db.ArtistEvents.Add(new ArtistEvent
            {
                ArtistId = artistId,
                MusicId = musicId,
                EventType = eventType,
                SongLabel = songLabel
            });

        await db.SaveChangesAsync();
    }
}
