using MusicDB.Api.Data;

namespace MusicDB.Api.Services;

// Журнал подій каталогу для підписників-на-виконавця (додано/видалено
// пісню, додано текст). Один рядок на подію НЕЗАЛЕЖНО від кількості
// підписників — "непрочитане" рахується порівнянням з ArtistFollow.LastReadAt
// (NotificationsController), а не фан-аутом рядка на кожного підписника.
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
