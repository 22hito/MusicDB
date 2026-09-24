# База даних

PostgreSQL (Neon), схема `lab`. Контекст EF Core — `Data/MusicDbContext.cs`.

> Схема змінюється **не** через EF Core Migrations, а ручними ідемпотентними SQL-скриптами (`db/*.sql`, поза цим
> репозиторієм). Скрипт застосовують до локальної й продакшн-бази **до** деплою коду, що на нього спирається.

## Таблиці

| Група | Таблиці |
|---|---|
| Каталог | `music` (зокрема `source`, `submitted_by_user_id`, `audio_file`, `lyrics`), `genre`, `album`, `music_genre`, `music_requests` (`kind`, `requester_user_id`, `audio_file`, `lyrics`) |
| Виконавці | `artists`, `music_artists`, `artist_follows`, `artist_events` |
| Користувачі | `users` (непрозорий id), `user_profiles` (ім'я, аватар), `friend_requests` |
| Персоналізація | `favorites`, `playlists` (`is_public`), `playlist_songs`, `listening_history` |
| Ком'юніті | `direct_messages`, `dm_requests`, `dm_cleared`, `discussion_threads`, `discussion_posts`, `song_ratings` |
| Адміністрування | `admins`, `admin_events`, `admin_notification_reads`, `bug_reports` (`screenshots text[]`) |

Особливості: складені первинні ключі для зв'язків M:N; `integer[]` для полів на кшталт `album_ids`; унікальні
індекси на `users.email` і `artists.normalized_name`; у `friend_requests` колонки `pair_low/pair_high`
обчислює сама БД (одна дружба на пару).

## Історія скриптів

| Скрипт | Що робить |
|---|---|
| `create_users_table.sql` | Реєстр користувачів |
| `create_artists_tables.sql` | Виконавці й зв'язок з піснями |
| `create_artist_follows_and_events.sql` | Підписки й журнал подій |
| `create_friend_requests_table.sql` | Дружба |
| `create_profile_tables.sql` | Профілі, улюблені, плейлисти, історія |
| `add_avatar_url.sql`, `add_genre_names_original.sql`, `add_lyrics.sql`, `add_playlist_is_public.sql`, `add_request_lyrics.sql` | Аватар, оригінальна назва жанру, текст пісні, публічні плейлисти, текст у заявці |
| `backfill_artists_from_music.sql`, `merge_duplicate_songs.sql`, `normalize_genre_case.sql`, `fix_alternative_pop_merge.sql` | Перенесення старих даних і одноразові очищення |
| `create_community_features.sql` | Ком'юніті: таблиця_2, повідомлення й запити, обговорення, оцінки, стрічка адмінів |
| `create_bug_reports.sql` | Баг-репорти |
| `create_dm_cleared.sql` | «Видалити чат у себе» |
| `add_bug_report_screenshots.sql` | Скріншоти баг-репортів |
