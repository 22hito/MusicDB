# База даних

PostgreSQL (Neon), схема `lab`. Контекст EF Core — `Data/MusicDbContext.cs`.

Схема змінюється через **EF Core Migrations** (`Data/Migrations`), історія застосованих міграцій — у таблиці
`lab.__EFMigrationsHistory`. Нові міграції застосовуються автоматично при старті застосунку
(`Database.Migrate()` у `Program.cs`), тож схема бази завжди відповідає коду, що деплоїться.

## Як змінити схему

```bash
# 1. Змінити модель: сутність у Data/MusicDbContext.cs (властивість, [Column], OnModelCreating)
# 2. Згенерувати міграцію (dotnet-ef — локальний інструмент репозиторію)
dotnet tool restore
dotnet ef migrations add AddSomethingUseful --output-dir Data/Migrations
# 3. Переглянути згенерований Data/Migrations/*_AddSomethingUseful.cs
# 4. Застосувати локально (або просто запустити застосунок — він застосує сам)
dotnet ef database update
# 5. Закомітити модель і міграцію РАЗОМ — на проді міграція застосується при деплої
```

- На .NET 10 SDK `dotnet-ef 9` запускати з `DOTNET_ROLL_FORWARD=Major` (напр. `set DOTNET_ROLL_FORWARD=Major`).
- CI (`main_musicdb.yml`) перевіряє `dotnet ef migrations has-pending-model-changes`: змінили модель без
  міграції — збірка падає ще до деплою.
- Автоматичне застосування можна вимкнути змінною `Database__AutoMigrate=false` — тоді
  `dotnet ef database update` або `dotnet ef migrations script --idempotent` вручну.
- Руйнівні зміни (видалення колонок/таблиць, зміна типу з втратою даних) — окремим кроком, з бекапом;
  EF генерує їх без запитань.

## Базова міграція

`*_Baseline.cs` — точна схема продакшн-бази на 24.09.2026 (`pg_dump --schema-only`), виконується як SQL. На
вже існуючих базах вона лише позначена застосованою; на новій порожній базі створює все. SQL, а не згенеровані
EF-операції — бо реальна схема має `serial`-ідентифікатори, `timestamp` без часового поясу, значення за
замовчуванням, обчислювані колонки й CHECK-обмеження, яких у C#-моделі немає. Нові таблиці, створені майбутніми
міграціями, отримають типи за замовчуванням EF/Npgsql (identity, `timestamptz`).

Колонки `music.lyrics_license` і `music.lyrics_source`, що існували на продакшні поза моделлю й не використовувались,
видалено міграцією `DropUnusedLyricsColumns`.

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

## Історія до міграцій (legacy SQL)

Скрипти, якими схема змінювалась до переходу на EF Core Migrations, — у `Data/Migrations/Legacy/`
(вже застосовані, лише для довідки).

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
