/** Схема v1 (lab.*) за моделлю EF Core — для перевірки перенесення без доступу до продакшну. */
export const LEGACY_DDL = `
create schema lab;
create table lab.admins (id serial primary key, email text not null, name text, created_at timestamp default now());
create table lab.genre (id serial primary key, genre text not null);
create table lab.album (id serial primary key, name text not null, release date, cover_url text);
create table lab.music (id serial primary key, artist text not null, title text not null, release date not null,
  duration interval not null, album_ids integer[], track_number smallint, youtube_video_id text, lyrics text,
  source text not null default 'catalog', submitted_by_user_id integer, audio_file text);
create table lab.music_genre (music_id int not null, genre_id int not null, primary key (music_id, genre_id));
create table lab.music_requests (id serial primary key, artist text not null, title text not null, release date not null,
  duration text, genre_ids integer[], genre_names text, genre_names_original text, album_title text,
  created_at timestamp default now(), youtube_video_id text, lyrics text, kind text not null default 'catalog',
  requester_user_id integer, audio_file text);
create table lab.user_profiles (user_email text primary key, display_name text, avatar_url text, updated_at timestamp default now());
create table lab.favorites (user_email text not null, music_id int not null, added_at timestamp default now(), primary key (user_email, music_id));
create table lab.playlists (id serial primary key, user_email text not null, name text not null, created_at timestamp default now(), is_public boolean default false);
create table lab.playlist_songs (playlist_id int not null, music_id int not null, added_at timestamp default now(), primary key (playlist_id, music_id));
create table lab.listening_history (id serial primary key, user_email text not null, music_id int not null, listened_at timestamp default now());
create table lab.users (id serial primary key, email text not null unique, google_name text, google_picture text, created_at timestamp default now(), last_login_at timestamp);
create table lab.artists (id serial primary key, name text not null, normalized_name text not null unique, bio text, bio_en text, image_url text, created_at timestamp default now());
create table lab.music_artists (music_id int not null, artist_id int not null, position smallint not null default 0, primary key (music_id, artist_id));
create table lab.artist_follows (user_id int not null, artist_id int not null, followed_at timestamp default now(), last_read_at timestamp default now(), primary key (user_id, artist_id));
create table lab.friend_requests (id serial primary key, requester_id int not null, addressee_id int not null, status text not null default 'pending', created_at timestamp default now(), responded_at timestamp);
create table lab.direct_messages (id serial primary key, sender_id int not null, recipient_id int not null, body text not null,
  created_at timestamp default now(), read_at timestamp, attachment_file text, attachment_name text, attachment_size bigint, music_id int);
create table lab.dm_requests (id serial primary key, requester_id int not null, addressee_id int not null, status text not null default 'pending', created_at timestamp default now(), responded_at timestamp);
create table lab.dm_cleared (user_id int not null, other_user_id int not null, cleared_up_to_id int not null, cleared_at timestamp default now(), primary key (user_id, other_user_id));
create table lab.bug_reports (id serial primary key, user_id int, description text not null, context text, status text not null default 'open',
  created_at timestamp default now(), resolved_at timestamp, resolved_by int, screenshots text[] not null default '{}');
create table lab.correction_requests (id serial primary key, user_id int, music_id int, artist_id int, field text not null, message text not null,
  source_url text, target_label text not null, audio_file text, status text not null default 'open', admin_note text,
  created_at timestamp default now(), resolved_at timestamp, resolved_by int);
create table lab.discussion_threads (id serial primary key, author_id int, title text not null, body text not null, created_at timestamp default now(), last_post_at timestamp default now());
create table lab.discussion_posts (id serial primary key, thread_id int not null, author_id int, body text not null, created_at timestamp default now(), reply_to_post_id int);
create table lab.thread_follows (user_id int not null, thread_id int not null, followed_at timestamp default now(), last_read_at timestamp default now(), primary key (user_id, thread_id));
create table lab.song_ratings (user_id int not null, music_id int not null, score smallint not null, review text, created_at timestamp default now(), updated_at timestamp default now(), primary key (user_id, music_id));
`;

export const LEGACY_FIXTURES = `
insert into lab.admins (email) values ('Admin@Example.com');
insert into lab.users (email, google_name, google_picture) values
  ('admin@example.com', 'Адмін', 'https://lh3.googleusercontent.com/a/admin=s96-c'),
  ('olya@example.com', 'Olya G', 'https://lh3.googleusercontent.com/a/olya=s96-c'),
  ('max@example.com', 'Max', null);
insert into lab.user_profiles (user_email, display_name, avatar_url) values
  ('olya@example.com', 'Оля', 'data:image/png;base64,AAAA'),
  ('max@example.com', 'Максим', 'https://example.com/max.jpg');
insert into lab.genre (genre) values ('Nu Metal'), ('nu metal'), ('Rock');
insert into lab.artists (name, normalized_name, bio, bio_en, image_url) values
  ('Linkin Park', 'linkin park', 'Американський гурт', 'American band', '7f3a.jpg'),
  ('Океан Ельзи', 'океан ельзи', null, null, 'https://cdn-images.dzcdn.net/images/artist/x/1000x1000-000000-80-0-0.jpg');
insert into lab.album (name, release, cover_url) values ('Meteora', '2003-03-25', 'https://img/meteora.jpg');
insert into lab.music (artist, title, release, duration, album_ids, track_number, youtube_video_id, lyrics, source, submitted_by_user_id, audio_file) values
  ('Linkin Park', 'Numb', '2003-03-25', '00:03:05', '{1}', 13, 'kXYiU_JCYtU', 'I''m tired of being what you want me to be', 'catalog', null, null),
  ('Linkin Park', 'Faint', '2003-03-25', '00:02:42', '{1}', 7, null, null, 'catalog', null, null),
  ('Океан Ельзи', 'Обійми', '2005-01-01', '00:04:00', null, null, null, null, 'community', 2, 'b1c2.mp3');
insert into lab.music_artists values (1, 1, 0), (2, 1, 0), (3, 2, 0);
insert into lab.music_genre values (1, 1), (1, 3), (2, 2), (3, 3);
insert into lab.favorites (user_email, music_id) values ('olya@example.com', 1), ('OLYA@example.com', 3), ('ghost@example.com', 1);
insert into lab.playlists (user_email, name, is_public) values ('olya@example.com', 'Ранок', true);
insert into lab.playlist_songs (playlist_id, music_id, added_at) values (1, 2, '2026-01-01 10:00'), (1, 1, '2026-01-01 09:00');
insert into lab.listening_history (user_email, music_id) values ('olya@example.com', 1), ('max@example.com', 1), ('max@example.com', 2);
insert into lab.artist_follows (user_id, artist_id) values (2, 1);
insert into lab.friend_requests (requester_id, addressee_id, status) values (2, 3, 'accepted'), (1, 2, 'pending');
insert into lab.song_ratings (user_id, music_id, score, review) values (2, 1, 95, 'Класика'), (3, 1, 70, null);
insert into lab.direct_messages (sender_id, recipient_id, body, read_at, music_id) values
  (2, 3, 'Привіт!', now(), null),
  (3, 2, 'Послухай', null, 1),
  (1, 3, 'Запит від адміна', null, null);
insert into lab.direct_messages (sender_id, recipient_id, body, attachment_file, attachment_name, attachment_size) values
  (2, 3, '', 'aa11.pdf', 'Ноти.pdf', 1234);
insert into lab.dm_cleared (user_id, other_user_id, cleared_up_to_id) values (3, 2, 1);
insert into lab.discussion_threads (author_id, title, body) values (2, 'Найкращий альбом', 'Meteora?');
insert into lab.discussion_posts (thread_id, author_id, body) values (1, 3, 'Так!');
insert into lab.discussion_posts (thread_id, author_id, body, reply_to_post_id) values (1, 2, 'Згодна', 1);
insert into lab.thread_follows (user_id, thread_id) values (2, 1), (3, 1);
insert into lab.music_requests (artist, title, release, duration, genre_names, album_title, kind, requester_user_id, audio_file) values
  ('Нова Група, Гість', 'Перша пісня', '2026-05-01', '3:30', 'indie, rock', 'Демо', 'community', 3, 'req1.mp3');
insert into lab.correction_requests (user_id, music_id, field, message, target_label, status) values (3, 2, 'release_date', 'Дата інша', 'Linkin Park — Faint', 'open');
insert into lab.bug_reports (user_id, description, context, screenshots) values (2, 'Не грає', '{"ua":"x"}', '{s1.png}');
`;
