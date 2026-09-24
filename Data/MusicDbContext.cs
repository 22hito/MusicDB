using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MusicDB.Api.Data;

[Table("admins", Schema = "lab")]
public class Admin
{
    [Key, Column("id")] public int Id { get; set; }
    [Required, Column("email")] public string Email { get; set; } = "";
    [Column("name")] public string? Name { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("genre", Schema = "lab")]
public class Genre
{
    [Key, Column("id")] public int Id { get; set; }
    [Required, Column("genre")] public string GenreName { get; set; } = "";
    public ICollection<MusicGenre> MusicGenres { get; set; } = [];
}

[Table("album", Schema = "lab")]
public class Album
{
    [Key, Column("id")] public int Id { get; set; }
    [Required, Column("name")] public string Name { get; set; } = "";
}

[Table("music", Schema = "lab")]
public class Music
{
    [Key, Column("id")] public int Id { get; set; }
    [Required, Column("artist")] public string Artist { get; set; } = "";
    [Required, Column("title")] public string Title { get; set; } = "";
    [Column("release")] public DateOnly Release { get; set; }
    [Column("duration")] public TimeSpan Duration { get; set; }
    [Column("album_ids")] public int[]? AlbumIds { get; set; }
    // Кешований YouTube videoId, щойно якийсь клієнт його знайшов і підтвердив
    // (пройшов перевірку релевантності) — рятує від повторного пошуку через API.
    [Column("youtube_video_id")] public string? YoutubeVideoId { get; set; }
    // Текст пісні для режиму караоке — вводиться вручну адміном, не через стороннє API.
    [Column("lyrics")] public string? Lyrics { get; set; }
    // "catalog" — головна таблиця_1, "community" — таблиця_2 (пісні від користувачів).
    [Column("source")] public string Source { get; set; } = SongSources.Catalog;
    [Column("submitted_by_user_id")] public int? SubmittedByUserId { get; set; }
    // Ім'я файлу в AudioStorageService — лише для ком'юніті-пісень.
    [Column("audio_file")] public string? AudioFile { get; set; }
    public ICollection<MusicGenre> MusicGenres { get; set; } = [];
}

public static class SongSources
{
    public const string Catalog = "catalog";
    public const string Community = "community";
    public static bool IsValid(string? s) => s is Catalog or Community;
}

[Table("music_genre", Schema = "lab")]
public class MusicGenre
{
    [Column("music_id")] public int MusicId { get; set; }
    [Column("genre_id")] public int GenreId { get; set; }
    public Music Music { get; set; } = null!;
    public Genre Genre { get; set; } = null!;
}

[Table("music_requests", Schema = "lab")]
public class MusicRequest
{
    [Key, Column("id")] public int Id { get; set; }
    [Required, Column("artist")] public string Artist { get; set; } = "";
    [Required, Column("title")] public string Title { get; set; } = "";
    [Column("release")] public DateOnly Release { get; set; }
    [Column("duration")] public string? Duration { get; set; }
    [Column("genre_ids")] public int[]? GenreIds { get; set; }
    [Column("genre_names")] public string? GenreNames { get; set; }
    // Оригінал жанрів до перекладу; заповнюється лише якщо переклад застосовувався.
    [Column("genre_names_original")] public string? GenreNamesOriginal { get; set; }
    [Column("album_title")] public string? AlbumTitle { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // Адмін може вставити відео вручну ще на етапі розгляду заявки — щоб не
    // покладатись на автопошук для нішевих/малопопулярних треків.
    [Column("youtube_video_id")] public string? YoutubeVideoId { get; set; }
    // Текст пісні, який адмін може вставити ще на етапі розгляду заявки —
    // переноситься на саму пісню при підтвердженні (див. RequestsController.Approve).
    [Column("lyrics")] public string? Lyrics { get; set; }
    // "catalog" | "community" — у яку головну таблицю піде пісня після підтвердження.
    [Column("kind")] public string Kind { get; set; } = SongSources.Catalog;
    [Column("requester_user_id")] public int? RequesterUserId { get; set; }
    [Column("audio_file")] public string? AudioFile { get; set; }
}

// ─── Профіль / улюблені / плейлисти / історія прослуховувань ──────────────
// Користувач ідентифікується за email з Google-акаунту — окремої таблиці users нема.

[Table("user_profiles", Schema = "lab")]
public class UserProfile
{
    [Key, Column("user_email")] public string UserEmail { get; set; } = "";
    [Column("display_name")] public string? DisplayName { get; set; }
    // Власна аватарка (URL зображення), яка замінює фото з Google-акаунту.
    [Column("avatar_url")] public string? AvatarUrl { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("favorites", Schema = "lab")]
public class Favorite
{
    [Column("user_email")] public string UserEmail { get; set; } = "";
    [Column("music_id")] public int MusicId { get; set; }
    [Column("added_at")] public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public Music Music { get; set; } = null!;
}

[Table("playlists", Schema = "lab")]
public class Playlist
{
    [Key, Column("id")] public int Id { get; set; }
    [Required, Column("user_email")] public string UserEmail { get; set; } = "";
    [Required, Column("name")] public string Name { get; set; } = "";
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // Публічний плейлист видно іншим користувачам на сторінці "Батл рояль" —
    // за замовчуванням false (як і всі плейлисти дотепер), лише власник бачить.
    [Column("is_public")] public bool IsPublic { get; set; }
    public ICollection<PlaylistSong> PlaylistSongs { get; set; } = [];
}

[Table("playlist_songs", Schema = "lab")]
public class PlaylistSong
{
    [Column("playlist_id")] public int PlaylistId { get; set; }
    [Column("music_id")] public int MusicId { get; set; }
    [Column("added_at")] public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public Playlist Playlist { get; set; } = null!;
    public Music Music { get; set; } = null!;
}

[Table("listening_history", Schema = "lab")]
public class ListeningHistory
{
    [Key, Column("id")] public int Id { get; set; }
    [Required, Column("user_email")] public string UserEmail { get; set; } = "";
    [Column("music_id")] public int MusicId { get; set; }
    [Column("listened_at")] public DateTime ListenedAt { get; set; } = DateTime.UtcNow;
}

// Канонічний реєстр користувачів (апсертиться при кожному логіні, Program.cs
// OnTicketReceived) — opaque Id для публічних посилань, щоб ніде не світити email.
[Table("users", Schema = "lab")]
public class User
{
    [Key, Column("id")] public int Id { get; set; }
    [Required, Column("email")] public string Email { get; set; } = "";
    [Column("google_name")] public string? GoogleName { get; set; }
    [Column("google_picture")] public string? GooglePicture { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("last_login_at")] public DateTime? LastLoginAt { get; set; }
}

// ─── Виконавці ──────────────────────────────────────────────────────────────
// lab.music.artist лишається вільним текстом; це похідна нормалізація —
// кожне ім'я зі списку через кому отримує свій рядок і сторінку з дискографією.
[Table("artists", Schema = "lab")]
public class Artist
{
    [Key, Column("id")] public int Id { get; set; }
    [Required, Column("name")] public string Name { get; set; } = "";
    [Required, Column("normalized_name")] public string NormalizedName { get; set; } = "";
    [Column("bio")] public string? Bio { get; set; }
    [Column("image_url")] public string? ImageUrl { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<MusicArtist> MusicArtists { get; set; } = [];
}

[Table("music_artists", Schema = "lab")]
public class MusicArtist
{
    [Column("music_id")] public int MusicId { get; set; }
    [Column("artist_id")] public int ArtistId { get; set; }
    [Column("position")] public short Position { get; set; }
    public Music Music { get; set; } = null!;
    public Artist Artist { get; set; } = null!;
}

// Підписка на виконавця — непрочитане рахується від last_read_at (без
// рядка-на-подію-на-підписника), див. ArtistEvent нижче.
[Table("artist_follows", Schema = "lab")]
public class ArtistFollow
{
    [Column("user_id")] public int UserId { get; set; }
    [Column("artist_id")] public int ArtistId { get; set; }
    [Column("followed_at")] public DateTime FollowedAt { get; set; } = DateTime.UtcNow;
    [Column("last_read_at")] public DateTime LastReadAt { get; set; } = DateTime.UtcNow;
}

// Подія каталогу (пісню додано/видалено, додано текст) — один рядок на подію
// незалежно від кількості підписників; SongLabel — знімок "Артист — Назва".
[Table("artist_events", Schema = "lab")]
public class ArtistEvent
{
    [Key, Column("id")] public int Id { get; set; }
    [Column("artist_id")] public int ArtistId { get; set; }
    [Column("music_id")] public int? MusicId { get; set; }
    [Required, Column("event_type")] public string EventType { get; set; } = "";
    [Required, Column("song_label")] public string SongLabel { get; set; } = "";
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// ─── Друзі ──────────────────────────────────────────────────────────────────
// pair_low/pair_high — генеровані колонки Postgres (унікальність пари), в EF не мапляться.
[Table("friend_requests", Schema = "lab")]
public class FriendRequest
{
    [Key, Column("id")] public int Id { get; set; }
    [Column("requester_id")] public int RequesterId { get; set; }
    [Column("addressee_id")] public int AddresseeId { get; set; }
    [Required, Column("status")] public string Status { get; set; } = "pending";
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("responded_at")] public DateTime? RespondedAt { get; set; }
}

// ─── Сповіщення адмінів ─────────────────────────────────────────────────────
// Один рядок на подію для всіх адмінів; прочитане — AdminNotificationRead.LastReadAt.
[Table("admin_events", Schema = "lab")]
public class AdminEvent
{
    [Key, Column("id")] public int Id { get; set; }
    [Column("actor_user_id")] public int? ActorUserId { get; set; }
    [Required, Column("event_type")] public string EventType { get; set; } = "";
    [Required, Column("label")] public string Label { get; set; } = "";
    [Column("source")] public string Source { get; set; } = SongSources.Catalog;
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("admin_notification_reads", Schema = "lab")]
public class AdminNotificationRead
{
    [Key, Column("user_id")] public int UserId { get; set; }
    [Column("last_read_at")] public DateTime LastReadAt { get; set; } = DateTime.UtcNow;
}

// ─── Особисті повідомлення / обговорення ────────────────────────────────────
[Table("direct_messages", Schema = "lab")]
public class DirectMessage
{
    [Key, Column("id")] public int Id { get; set; }
    [Column("sender_id")] public int SenderId { get; set; }
    [Column("recipient_id")] public int RecipientId { get; set; }
    [Required, Column("body")] public string Body { get; set; } = "";
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("read_at")] public DateTime? ReadAt { get; set; }
}

// Дозвіл на листування між не-друзями. pair_low/pair_high — генеровані
// колонки Postgres (унікальність пари), в EF не мапляться — як у FriendRequest.
[Table("dm_requests", Schema = "lab")]
public class DmRequest
{
    [Key, Column("id")] public int Id { get; set; }
    [Column("requester_id")] public int RequesterId { get; set; }
    [Column("addressee_id")] public int AddresseeId { get; set; }
    [Required, Column("status")] public string Status { get; set; } = "pending"; // pending | accepted | declined
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("responded_at")] public DateTime? RespondedAt { get; set; }
}

// "Видалити чат у себе": повідомлення з id <= ClearedUpToId цьому користувачу
// не показуються; співрозмовник свою копію переписки зберігає.
[Table("dm_cleared", Schema = "lab")]
public class DmCleared
{
    [Column("user_id")] public int UserId { get; set; }
    [Column("other_user_id")] public int OtherUserId { get; set; }
    [Column("cleared_up_to_id")] public int ClearedUpToId { get; set; }
    [Column("cleared_at")] public DateTime ClearedAt { get; set; } = DateTime.UtcNow;
}

// Баг-репорт від користувача; адміни бачать у адмін-панелі й отримують сповіщення.
[Table("bug_reports", Schema = "lab")]
public class BugReport
{
    [Key, Column("id")] public int Id { get; set; }
    [Column("user_id")] public int? UserId { get; set; }
    [Required, Column("description")] public string Description { get; set; } = "";
    [Column("context")] public string? Context { get; set; }
    [Required, Column("status")] public string Status { get; set; } = "open"; // open | resolved
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("resolved_at")] public DateTime? ResolvedAt { get; set; }
    [Column("resolved_by")] public int? ResolvedBy { get; set; }
}

[Table("discussion_threads", Schema = "lab")]
public class DiscussionThread
{
    [Key, Column("id")] public int Id { get; set; }
    [Column("author_id")] public int? AuthorId { get; set; }
    [Required, Column("title")] public string Title { get; set; } = "";
    [Required, Column("body")] public string Body { get; set; } = "";
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("last_post_at")] public DateTime LastPostAt { get; set; } = DateTime.UtcNow;
    public ICollection<DiscussionPost> Posts { get; set; } = [];
}

[Table("discussion_posts", Schema = "lab")]
public class DiscussionPost
{
    [Key, Column("id")] public int Id { get; set; }
    [Column("thread_id")] public int ThreadId { get; set; }
    [Column("author_id")] public int? AuthorId { get; set; }
    [Required, Column("body")] public string Body { get; set; } = "";
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DiscussionThread Thread { get; set; } = null!;
}

// ─── Оцінки / рецензії ─────────────────────────────────────────────────────
// Шкала 0–100 — тимчасова заглушка, рецензія можлива лише разом з оцінкою.
[Table("song_ratings", Schema = "lab")]
public class SongRating
{
    [Column("user_id")] public int UserId { get; set; }
    [Column("music_id")] public int MusicId { get; set; }
    [Column("score")] public short Score { get; set; }
    [Column("review")] public string? Review { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("updated_at")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class MusicDbContext(DbContextOptions<MusicDbContext> opts) : DbContext(opts)
{
    public DbSet<Music> Songs { get; set; }
    public DbSet<Genre> Genres { get; set; }
    public DbSet<Album> Albums { get; set; }
    public DbSet<MusicGenre> MusicGenres { get; set; }
    public DbSet<MusicRequest> Requests { get; set; }
    public DbSet<Admin> Admins { get; set; }
    public DbSet<UserProfile> UserProfiles { get; set; }
    public DbSet<Favorite> Favorites { get; set; }
    public DbSet<Playlist> Playlists { get; set; }
    public DbSet<PlaylistSong> PlaylistSongs { get; set; }
    public DbSet<ListeningHistory> ListeningHistory { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Artist> Artists { get; set; }
    public DbSet<MusicArtist> MusicArtists { get; set; }
    public DbSet<ArtistFollow> ArtistFollows { get; set; }
    public DbSet<ArtistEvent> ArtistEvents { get; set; }
    public DbSet<FriendRequest> FriendRequests { get; set; }
    public DbSet<AdminEvent> AdminEvents { get; set; }
    public DbSet<AdminNotificationRead> AdminNotificationReads { get; set; }
    public DbSet<DirectMessage> DirectMessages { get; set; }
    public DbSet<DmRequest> DmRequests { get; set; }
    public DbSet<BugReport> BugReports { get; set; }
    public DbSet<DmCleared> DmCleared { get; set; }
    public DbSet<DiscussionThread> DiscussionThreads { get; set; }
    public DbSet<DiscussionPost> DiscussionPosts { get; set; }
    public DbSet<SongRating> SongRatings { get; set; }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<MusicGenre>().HasKey(mg => new { mg.MusicId, mg.GenreId });

        mb.Entity<MusicGenre>()
            .HasOne(mg => mg.Music)
            .WithMany(m => m.MusicGenres)
            .HasForeignKey(mg => mg.MusicId);

        mb.Entity<MusicGenre>()
            .HasOne(mg => mg.Genre)
            .WithMany(g => g.MusicGenres)
            .HasForeignKey(mg => mg.GenreId);

        mb.Entity<Music>()
            .Property(m => m.AlbumIds)
            .HasColumnType("integer[]");

        mb.Entity<MusicRequest>()
            .Property(r => r.GenreIds)
            .HasColumnType("integer[]");

        mb.Entity<Favorite>().HasKey(f => new { f.UserEmail, f.MusicId });
        mb.Entity<Favorite>()
            .HasOne(f => f.Music)
            .WithMany()
            .HasForeignKey(f => f.MusicId);

        mb.Entity<PlaylistSong>().HasKey(ps => new { ps.PlaylistId, ps.MusicId });
        mb.Entity<PlaylistSong>()
            .HasOne(ps => ps.Playlist)
            .WithMany(p => p.PlaylistSongs)
            .HasForeignKey(ps => ps.PlaylistId);
        mb.Entity<PlaylistSong>()
            .HasOne(ps => ps.Music)
            .WithMany()
            .HasForeignKey(ps => ps.MusicId);

        mb.Entity<User>().HasIndex(u => u.Email).IsUnique();

        mb.Entity<Artist>().HasIndex(a => a.NormalizedName).IsUnique();

        mb.Entity<MusicArtist>().HasKey(ma => new { ma.MusicId, ma.ArtistId });
        mb.Entity<MusicArtist>()
            .HasOne(ma => ma.Music)
            .WithMany()
            .HasForeignKey(ma => ma.MusicId);
        mb.Entity<MusicArtist>()
            .HasOne(ma => ma.Artist)
            .WithMany(a => a.MusicArtists)
            .HasForeignKey(ma => ma.ArtistId);

        mb.Entity<ArtistFollow>().HasKey(f => new { f.UserId, f.ArtistId });

        mb.Entity<SongRating>().HasKey(r => new { r.UserId, r.MusicId });
        mb.Entity<DmCleared>().HasKey(c => new { c.UserId, c.OtherUserId });

        mb.Entity<DiscussionPost>()
            .HasOne(p => p.Thread)
            .WithMany(t => t.Posts)
            .HasForeignKey(p => p.ThreadId);
    }
}