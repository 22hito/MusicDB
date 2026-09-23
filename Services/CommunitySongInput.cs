using MusicDB.Api.Models;

namespace MusicDB.Api.Services;

// Спільна валідація CommunitySongForm для заявки користувача й прямого
// додавання адміном — правила мають бути однакові в обох місцях.
public record CommunitySongInput(
    string Artist, string Title, DateOnly Release, string Duration,
    string[] Genres, string? Album, string? YoutubeVideoId)
{
    public static bool TryParse(CommunitySongForm form, out CommunitySongInput? input, out string? error)
    {
        input = null;
        var artist = form.Artist.Trim();
        var title = form.Title.Trim();
        var genres = form.Genres.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (artist.Length == 0 || title.Length == 0 || genres.Length == 0 || string.IsNullOrWhiteSpace(form.Duration))
        {
            error = "Artist, title, duration and genres are required.";
            return false;
        }
        if (!DateOnly.TryParse(form.Release, out var release))
        {
            error = "Invalid release date.";
            return false;
        }
        if (!YoutubeUrlParser.TryExtract(string.IsNullOrWhiteSpace(form.YoutubeVideo) ? null : form.YoutubeVideo, out var videoId, out _))
        {
            error = "Invalid YouTube video ID or URL.";
            return false;
        }
        // Головне правило таблиці_2: без файлу пісні можна лише з YouTube-відео.
        if (form.Audio is null && videoId is null)
        {
            error = "Either an audio file or a YouTube link is required.";
            return false;
        }

        input = new CommunitySongInput(artist, title, release, form.Duration.Trim(), genres,
            string.IsNullOrWhiteSpace(form.Album) ? null : form.Album.Trim(), videoId);
        error = null;
        return true;
    }
}
