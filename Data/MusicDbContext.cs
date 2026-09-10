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
    public ICollection<MusicGenre> MusicGenres { get; set; } = [];
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
    }
}