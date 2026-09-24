using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MusicDB.Api.Data.Migrations
{
    /// <summary>
    /// Базова міграція: точна схема lab продакшн-бази на 24.09.2026 (pg_dump --schema-only).
    /// До цього схема змінювалась ручними SQL-скриптами (див. Data/Migrations/Legacy).
    /// На вже існуючих базах ця міграція лише ПОЗНАЧЕНА як застосована (рядок у
    /// lab.__EFMigrationsHistory) і не виконується; на новій порожній базі — створює все.
    ///
    /// Чому SQL, а не згенеровані EF-операції: реальна схема має serial-ідентифікатори,
    /// timestamp без часового поясу, значення за замовчуванням, обчислювані колонки
    /// (friend_requests.pair_low/pair_high) і CHECK-обмеження, яких у C#-моделі немає.
    /// Знімок моделі (MusicDbContextModelSnapshot) описує модель EF — наступні міграції
    /// рахуються від нього.
    /// </summary>
    public partial class Baseline : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(Schema);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("Базову схему не відкочують — це видалило б усі дані.");
        }

        private const string Schema = """
            CREATE SCHEMA IF NOT EXISTS lab;

            CREATE TABLE lab.admin_events (
                id integer NOT NULL,
                actor_user_id integer,
                event_type text NOT NULL,
                label text NOT NULL,
                source text DEFAULT 'catalog'::text NOT NULL,
                created_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE SEQUENCE lab.admin_events_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.admin_events_id_seq OWNED BY lab.admin_events.id;

            CREATE TABLE lab.admin_notification_reads (
                user_id integer NOT NULL,
                last_read_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE TABLE lab.admins (
                id integer NOT NULL,
                email text NOT NULL,
                name text,
                created_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE SEQUENCE lab.admins_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.admins_id_seq OWNED BY lab.admins.id;

            CREATE TABLE lab.album (
                id integer NOT NULL,
                name text NOT NULL
            );

            CREATE SEQUENCE lab.album_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.album_id_seq OWNED BY lab.album.id;

            CREATE TABLE lab.artist_events (
                id integer NOT NULL,
                artist_id integer NOT NULL,
                music_id integer,
                event_type text NOT NULL,
                song_label text NOT NULL,
                created_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE SEQUENCE lab.artist_events_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.artist_events_id_seq OWNED BY lab.artist_events.id;

            CREATE TABLE lab.artist_follows (
                user_id integer NOT NULL,
                artist_id integer NOT NULL,
                followed_at timestamp without time zone DEFAULT now() NOT NULL,
                last_read_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE TABLE lab.artists (
                id integer NOT NULL,
                name text NOT NULL,
                normalized_name text NOT NULL,
                bio text,
                image_url text,
                created_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE SEQUENCE lab.artists_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.artists_id_seq OWNED BY lab.artists.id;

            CREATE TABLE lab.bug_reports (
                id integer NOT NULL,
                user_id integer,
                description text NOT NULL,
                context text,
                status text DEFAULT 'open'::text NOT NULL,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                resolved_at timestamp without time zone,
                resolved_by integer,
                screenshots text[] DEFAULT '{}'::text[] NOT NULL
            );

            CREATE SEQUENCE lab.bug_reports_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.bug_reports_id_seq OWNED BY lab.bug_reports.id;

            CREATE TABLE lab.direct_messages (
                id integer NOT NULL,
                sender_id integer NOT NULL,
                recipient_id integer NOT NULL,
                body text NOT NULL,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                read_at timestamp without time zone,
                CONSTRAINT ck_direct_messages_not_self CHECK ((sender_id <> recipient_id))
            );

            CREATE SEQUENCE lab.direct_messages_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.direct_messages_id_seq OWNED BY lab.direct_messages.id;

            CREATE TABLE lab.discussion_posts (
                id integer NOT NULL,
                thread_id integer NOT NULL,
                author_id integer,
                body text NOT NULL,
                created_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE SEQUENCE lab.discussion_posts_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.discussion_posts_id_seq OWNED BY lab.discussion_posts.id;

            CREATE TABLE lab.discussion_threads (
                id integer NOT NULL,
                author_id integer,
                title text NOT NULL,
                body text NOT NULL,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                last_post_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE SEQUENCE lab.discussion_threads_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.discussion_threads_id_seq OWNED BY lab.discussion_threads.id;

            CREATE TABLE lab.dm_cleared (
                user_id integer NOT NULL,
                other_user_id integer NOT NULL,
                cleared_up_to_id integer NOT NULL,
                cleared_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE TABLE lab.dm_requests (
                id integer NOT NULL,
                requester_id integer NOT NULL,
                addressee_id integer NOT NULL,
                status text DEFAULT 'pending'::text NOT NULL,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                responded_at timestamp without time zone,
                pair_low integer GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
                pair_high integer GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
                CONSTRAINT ck_dm_requests_not_self CHECK ((requester_id <> addressee_id))
            );

            CREATE SEQUENCE lab.dm_requests_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.dm_requests_id_seq OWNED BY lab.dm_requests.id;

            CREATE TABLE lab.favorites (
                user_email text NOT NULL,
                music_id integer NOT NULL,
                added_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE TABLE lab.friend_requests (
                id integer NOT NULL,
                requester_id integer NOT NULL,
                addressee_id integer NOT NULL,
                status text DEFAULT 'pending'::text NOT NULL,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                responded_at timestamp without time zone,
                pair_low integer GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
                pair_high integer GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
                CONSTRAINT ck_friend_requests_not_self CHECK ((requester_id <> addressee_id))
            );

            CREATE SEQUENCE lab.friend_requests_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.friend_requests_id_seq OWNED BY lab.friend_requests.id;

            CREATE TABLE lab.genre (
                id integer NOT NULL,
                genre text NOT NULL
            );

            CREATE SEQUENCE lab.genre_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.genre_id_seq OWNED BY lab.genre.id;

            CREATE TABLE lab.listening_history (
                id integer NOT NULL,
                user_email text NOT NULL,
                music_id integer NOT NULL,
                listened_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE SEQUENCE lab.listening_history_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.listening_history_id_seq OWNED BY lab.listening_history.id;

            CREATE TABLE lab.music (
                id integer NOT NULL,
                artist text NOT NULL,
                title text NOT NULL,
                release date,
                duration interval,
                album_ids integer[],
                youtube_video_id text,
                lyrics text,
                lyrics_source text,
                lyrics_license text,
                source text DEFAULT 'catalog'::text NOT NULL,
                submitted_by_user_id integer,
                audio_file text
            );

            CREATE TABLE lab.music_artists (
                music_id integer NOT NULL,
                artist_id integer NOT NULL,
                "position" smallint DEFAULT 0 NOT NULL
            );

            CREATE TABLE lab.music_genre (
                music_id integer NOT NULL,
                genre_id integer NOT NULL
            );

            CREATE SEQUENCE lab.music_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.music_id_seq OWNED BY lab.music.id;

            CREATE TABLE lab.music_requests (
                id integer NOT NULL,
                artist text NOT NULL,
                title text NOT NULL,
                release date,
                duration text,
                genre_ids integer[],
                genre_names text,
                album_title text,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                genre_names_original text,
                youtube_video_id text,
                lyrics text,
                kind text DEFAULT 'catalog'::text NOT NULL,
                requester_user_id integer,
                audio_file text
            );

            CREATE SEQUENCE lab.music_requests_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.music_requests_id_seq OWNED BY lab.music_requests.id;

            CREATE TABLE lab.playlist_songs (
                playlist_id integer NOT NULL,
                music_id integer NOT NULL,
                added_at timestamp without time zone DEFAULT now() NOT NULL
            );

            CREATE TABLE lab.playlists (
                id integer NOT NULL,
                user_email text NOT NULL,
                name text NOT NULL,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                is_public boolean DEFAULT false NOT NULL
            );

            CREATE SEQUENCE lab.playlists_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.playlists_id_seq OWNED BY lab.playlists.id;

            CREATE TABLE lab.song_ratings (
                user_id integer NOT NULL,
                music_id integer NOT NULL,
                score smallint NOT NULL,
                review text,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                updated_at timestamp without time zone DEFAULT now() NOT NULL,
                CONSTRAINT song_ratings_score_check CHECK (((score >= 0) AND (score <= 100)))
            );

            CREATE TABLE lab.user_profiles (
                user_email text NOT NULL,
                display_name text,
                updated_at timestamp without time zone DEFAULT now() NOT NULL,
                avatar_url text
            );

            CREATE TABLE lab.users (
                id integer NOT NULL,
                email text NOT NULL,
                google_name text,
                google_picture text,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                last_login_at timestamp without time zone
            );

            CREATE SEQUENCE lab.users_id_seq
                AS integer
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;

            ALTER SEQUENCE lab.users_id_seq OWNED BY lab.users.id;

            ALTER TABLE ONLY lab.admin_events ALTER COLUMN id SET DEFAULT nextval('lab.admin_events_id_seq'::regclass);

            ALTER TABLE ONLY lab.admins ALTER COLUMN id SET DEFAULT nextval('lab.admins_id_seq'::regclass);

            ALTER TABLE ONLY lab.album ALTER COLUMN id SET DEFAULT nextval('lab.album_id_seq'::regclass);

            ALTER TABLE ONLY lab.artist_events ALTER COLUMN id SET DEFAULT nextval('lab.artist_events_id_seq'::regclass);

            ALTER TABLE ONLY lab.artists ALTER COLUMN id SET DEFAULT nextval('lab.artists_id_seq'::regclass);

            ALTER TABLE ONLY lab.bug_reports ALTER COLUMN id SET DEFAULT nextval('lab.bug_reports_id_seq'::regclass);

            ALTER TABLE ONLY lab.direct_messages ALTER COLUMN id SET DEFAULT nextval('lab.direct_messages_id_seq'::regclass);

            ALTER TABLE ONLY lab.discussion_posts ALTER COLUMN id SET DEFAULT nextval('lab.discussion_posts_id_seq'::regclass);

            ALTER TABLE ONLY lab.discussion_threads ALTER COLUMN id SET DEFAULT nextval('lab.discussion_threads_id_seq'::regclass);

            ALTER TABLE ONLY lab.dm_requests ALTER COLUMN id SET DEFAULT nextval('lab.dm_requests_id_seq'::regclass);

            ALTER TABLE ONLY lab.friend_requests ALTER COLUMN id SET DEFAULT nextval('lab.friend_requests_id_seq'::regclass);

            ALTER TABLE ONLY lab.genre ALTER COLUMN id SET DEFAULT nextval('lab.genre_id_seq'::regclass);

            ALTER TABLE ONLY lab.listening_history ALTER COLUMN id SET DEFAULT nextval('lab.listening_history_id_seq'::regclass);

            ALTER TABLE ONLY lab.music ALTER COLUMN id SET DEFAULT nextval('lab.music_id_seq'::regclass);

            ALTER TABLE ONLY lab.music_requests ALTER COLUMN id SET DEFAULT nextval('lab.music_requests_id_seq'::regclass);

            ALTER TABLE ONLY lab.playlists ALTER COLUMN id SET DEFAULT nextval('lab.playlists_id_seq'::regclass);

            ALTER TABLE ONLY lab.users ALTER COLUMN id SET DEFAULT nextval('lab.users_id_seq'::regclass);

            ALTER TABLE ONLY lab.admin_events
                ADD CONSTRAINT admin_events_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.admin_notification_reads
                ADD CONSTRAINT admin_notification_reads_pkey PRIMARY KEY (user_id);

            ALTER TABLE ONLY lab.admins
                ADD CONSTRAINT admins_email_key UNIQUE (email);

            ALTER TABLE ONLY lab.admins
                ADD CONSTRAINT admins_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.album
                ADD CONSTRAINT album_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.artist_events
                ADD CONSTRAINT artist_events_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.artist_follows
                ADD CONSTRAINT artist_follows_pkey PRIMARY KEY (user_id, artist_id);

            ALTER TABLE ONLY lab.artists
                ADD CONSTRAINT artists_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.bug_reports
                ADD CONSTRAINT bug_reports_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.direct_messages
                ADD CONSTRAINT direct_messages_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.discussion_posts
                ADD CONSTRAINT discussion_posts_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.discussion_threads
                ADD CONSTRAINT discussion_threads_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.dm_cleared
                ADD CONSTRAINT dm_cleared_pkey PRIMARY KEY (user_id, other_user_id);

            ALTER TABLE ONLY lab.dm_requests
                ADD CONSTRAINT dm_requests_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.favorites
                ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_email, music_id);

            ALTER TABLE ONLY lab.friend_requests
                ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.genre
                ADD CONSTRAINT genre_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.listening_history
                ADD CONSTRAINT listening_history_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.music_artists
                ADD CONSTRAINT music_artists_pkey PRIMARY KEY (music_id, artist_id);

            ALTER TABLE ONLY lab.music_genre
                ADD CONSTRAINT music_genre_pkey PRIMARY KEY (music_id, genre_id);

            ALTER TABLE ONLY lab.music
                ADD CONSTRAINT music_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.music_requests
                ADD CONSTRAINT music_requests_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.playlist_songs
                ADD CONSTRAINT playlist_songs_pkey PRIMARY KEY (playlist_id, music_id);

            ALTER TABLE ONLY lab.playlists
                ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);

            ALTER TABLE ONLY lab.song_ratings
                ADD CONSTRAINT song_ratings_pkey PRIMARY KEY (user_id, music_id);

            ALTER TABLE ONLY lab.dm_requests
                ADD CONSTRAINT uq_dm_requests_pair UNIQUE (pair_low, pair_high);

            ALTER TABLE ONLY lab.friend_requests
                ADD CONSTRAINT uq_friend_requests_pair UNIQUE (pair_low, pair_high);

            ALTER TABLE ONLY lab.user_profiles
                ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_email);

            ALTER TABLE ONLY lab.users
                ADD CONSTRAINT users_email_key UNIQUE (email);

            ALTER TABLE ONLY lab.users
                ADD CONSTRAINT users_pkey PRIMARY KEY (id);

            CREATE INDEX idx_admin_events_created ON lab.admin_events USING btree (created_at DESC);

            CREATE INDEX idx_artist_events_artist ON lab.artist_events USING btree (artist_id, created_at DESC);

            CREATE INDEX idx_artist_follows_user ON lab.artist_follows USING btree (user_id);

            CREATE INDEX idx_bug_reports_status ON lab.bug_reports USING btree (status, created_at DESC);

            CREATE INDEX idx_dm_pair ON lab.direct_messages USING btree (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at);

            CREATE INDEX idx_dm_recipient ON lab.direct_messages USING btree (recipient_id, read_at);

            CREATE INDEX idx_dm_requests_addressee ON lab.dm_requests USING btree (addressee_id, status);

            CREATE INDEX idx_friend_requests_addressee ON lab.friend_requests USING btree (addressee_id, status);

            CREATE INDEX idx_friend_requests_requester ON lab.friend_requests USING btree (requester_id, status);

            CREATE INDEX idx_listening_history_user ON lab.listening_history USING btree (user_email, listened_at DESC);

            CREATE INDEX idx_music_artists_artist ON lab.music_artists USING btree (artist_id);

            CREATE INDEX idx_music_source ON lab.music USING btree (source);

            CREATE INDEX idx_playlists_user ON lab.playlists USING btree (user_email);

            CREATE INDEX idx_posts_thread ON lab.discussion_posts USING btree (thread_id, created_at);

            CREATE INDEX idx_song_ratings_music ON lab.song_ratings USING btree (music_id);

            CREATE INDEX idx_threads_last_post ON lab.discussion_threads USING btree (last_post_at DESC);

            CREATE UNIQUE INDEX ux_artists_normalized_name ON lab.artists USING btree (normalized_name);

            CREATE UNIQUE INDEX ux_listening_history_user_music ON lab.listening_history USING btree (user_email, music_id);

            ALTER TABLE ONLY lab.admin_events
                ADD CONSTRAINT admin_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES lab.users(id) ON DELETE SET NULL;

            ALTER TABLE ONLY lab.admin_notification_reads
                ADD CONSTRAINT admin_notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.artist_events
                ADD CONSTRAINT artist_events_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES lab.artists(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.artist_events
                ADD CONSTRAINT artist_events_music_id_fkey FOREIGN KEY (music_id) REFERENCES lab.music(id) ON DELETE SET NULL;

            ALTER TABLE ONLY lab.artist_follows
                ADD CONSTRAINT artist_follows_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES lab.artists(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.artist_follows
                ADD CONSTRAINT artist_follows_user_id_fkey FOREIGN KEY (user_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.bug_reports
                ADD CONSTRAINT bug_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES lab.users(id) ON DELETE SET NULL;

            ALTER TABLE ONLY lab.bug_reports
                ADD CONSTRAINT bug_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES lab.users(id) ON DELETE SET NULL;

            ALTER TABLE ONLY lab.direct_messages
                ADD CONSTRAINT direct_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.direct_messages
                ADD CONSTRAINT direct_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.discussion_posts
                ADD CONSTRAINT discussion_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES lab.users(id) ON DELETE SET NULL;

            ALTER TABLE ONLY lab.discussion_posts
                ADD CONSTRAINT discussion_posts_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES lab.discussion_threads(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.discussion_threads
                ADD CONSTRAINT discussion_threads_author_id_fkey FOREIGN KEY (author_id) REFERENCES lab.users(id) ON DELETE SET NULL;

            ALTER TABLE ONLY lab.dm_cleared
                ADD CONSTRAINT dm_cleared_other_user_id_fkey FOREIGN KEY (other_user_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.dm_cleared
                ADD CONSTRAINT dm_cleared_user_id_fkey FOREIGN KEY (user_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.dm_requests
                ADD CONSTRAINT dm_requests_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.dm_requests
                ADD CONSTRAINT dm_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.favorites
                ADD CONSTRAINT favorites_music_id_fkey FOREIGN KEY (music_id) REFERENCES lab.music(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.friend_requests
                ADD CONSTRAINT friend_requests_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.friend_requests
                ADD CONSTRAINT friend_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES lab.users(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.listening_history
                ADD CONSTRAINT listening_history_music_id_fkey FOREIGN KEY (music_id) REFERENCES lab.music(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.music_artists
                ADD CONSTRAINT music_artists_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES lab.artists(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.music_artists
                ADD CONSTRAINT music_artists_music_id_fkey FOREIGN KEY (music_id) REFERENCES lab.music(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.music_genre
                ADD CONSTRAINT music_genre_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES lab.genre(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.music_genre
                ADD CONSTRAINT music_genre_music_id_fkey FOREIGN KEY (music_id) REFERENCES lab.music(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.music_requests
                ADD CONSTRAINT music_requests_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES lab.users(id) ON DELETE SET NULL;

            ALTER TABLE ONLY lab.music
                ADD CONSTRAINT music_submitted_by_user_id_fkey FOREIGN KEY (submitted_by_user_id) REFERENCES lab.users(id) ON DELETE SET NULL;

            ALTER TABLE ONLY lab.playlist_songs
                ADD CONSTRAINT playlist_songs_music_id_fkey FOREIGN KEY (music_id) REFERENCES lab.music(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.playlist_songs
                ADD CONSTRAINT playlist_songs_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES lab.playlists(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.song_ratings
                ADD CONSTRAINT song_ratings_music_id_fkey FOREIGN KEY (music_id) REFERENCES lab.music(id) ON DELETE CASCADE;

            ALTER TABLE ONLY lab.song_ratings
                ADD CONSTRAINT song_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES lab.users(id) ON DELETE CASCADE;
            """;
    }
}
