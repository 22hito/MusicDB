# Backend API

ASP.NET Core 10, мінімальний hosting-model (`Program.cs`). Swagger — лише в середовищі Development (`/swagger`).

## Program.cs

- **Конфігурація:** `appsettings.json` + локальний `appsettings.Local.json`; на Azure — змінні середовища
  (подвійне підкреслення замість `:`, напр. `Uploads__R2__Bucket`). Порт — зі змінної `PORT` або `Urls`.
- **Сервіси:** Scoped — `MusicService`, `UserDirectoryService`, `TasteService`, `ArtistActivityService`, `AdminActivityService`;
  Singleton — `CatalogCache`, `IAudioStorage` (`R2AudioStorage`, якщо заповнено `Uploads:R2`, інакше
  `LocalAudioStorage`); типізовані `HttpClient` — `TranslationService`, `ExternalMusicSearchService`,
  `GenreNormalizationService`, `RecommendationService`, `LastFmGenreService`.
- **Конвеєр:** CORS → заголовки безпеки → (Dev: Swagger) → статичні файли (no-cache + ETag) → автентифікація →
  авторизація → rate limiter → контролери → SignalR (`/hubs/music`) → SPA fallback на `index.html`.
- **Мінімальні ендпоінти:** `GET /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /config`
  (ключі YouTube для ротації квоти).
- Для `/api/*` замість редиректів на логін — статуси 401/403. Адмінські дії — `[Authorize, AdminOnly]`
  (`Filters/AdminOnlyAttribute.cs`).

### Конфігурація

| Ключ | Призначення |
|---|---|
| `ConnectionStrings:Postgres` | Підключення до БД |
| `Authentication:Google:ClientId / ClientSecret` | Google OAuth |
| `YouTube:ApiKeys[]` | Ключі YouTube Data API (ротація при вичерпанні квоти) |
| `Gemini:ApiKey / Model`, `LastFm:ApiKey` | ШІ (жанри, рекомендації) і Last.fm |
| `Uploads:R2` (`AccountId`, `AccessKeyId`, `SecretAccessKey`, `Bucket`, опц. `PublicBaseUrl`) | Cloudflare R2 |
| `Uploads:AudioPath` | Тека для локального сховища файлів |

## Контролери

Ендпоінти, що змінюють дані, надсилають SignalR-подію (усім, групі адмінів або конкретному користувачу).

| Контролер | Маршрут | Призначення |
|---|---|---|
| AdminNotifications | `/api/admin-notifications` | Стрічка дій для адмінів, позначення прочитаним |
| Artists | `/api/artists` | Каталог виконавців (з фото), дискографія, підписка, схожі виконавці (за жанрами); адмін — опис і фото (`PUT /{id}`, `PUT/DELETE /{id}/image`, фото в R2, віддача — редирект) |
| BugReports | `/api/bug-reports` | Створення (JSON або multipart з ≤3 скріншотами), список, лічильник відкритих, статус, видалення, скріншот і пряме посилання на нього (адмін) |
| ExternalSearch | `/api/external-search` | iTunes для автозаповнення заявки; жанри (Last.fm → Gemini) |
| Favorites | `/api/favorites` | Улюблені пісні |
| Friends | `/api/friends` | Друзі, запити (надіслати/прийняти/відхилити/скасувати), розірвання дружби |
| Genres | `/api/genres` | Жанри; ШІ-об'єднання дублікатів (адмін) |
| History | `/api/history` | Логування прослуховування (унікальність + rate limit) |
| Messages | `/api/messages` | Розмови, непрочитані, запити на листування, діалог, надсилання, «видалити чат у себе» |
| Notifications | `/api/notifications` | Події підписок на виконавців |
| Playlists | `/api/playlists` | Плейлисти, публічні плейлисти, пісні в плейлисті |
| Profile | `/api/profile` | Власний профіль, ім'я й аватар |
| Ratings | `/api/songs/{id}/ratings` | Оцінка 0–100 і рецензії |
| Recommendations | `/api/recommendations` | ШІ-рекомендації з поясненням |
| Requests | `/api/requests` | Заявки на пісні каталогу й ком'юніті (з файлом), редагування, схвалення, відхилення, текст, файл заявки |
| Songs | `/api/songs` | Каталог (`source=catalog\|community\|all`), CRUD (адмін), пісні ком'юніті, аудіо (редирект на R2), заміна файлу, кеш YouTube videoId, текст пісні |
| Stats | `/api/stats` | Статистика (з кешем) і Топ-N |
| Threads | `/api/threads` | Гілки обговорень, відповіді, видалення |
| UploadToken | `/api/upload-token` | Короткоживучий (10 хв) токен завантаження файлів для мобільного застосунку; видається лише за cookie-сесією. Заголовок `X-Upload-Token` приймається тільки на ендпоінтах завантаження (заявка/пісня ком'юніті, заміна файлу, баг-репорт зі скріншотами) |
| Users | `/api/users` | Пошук людей, публічний профіль зі статусом стосунків, `GET /taste` — граф «Схожий смак» (люди, ребра схожості, найсхожіші до мене) |

## DTO

Контракти — C# record-типи в `Models/Dtos.cs`, окремо від сутностей БД. Email ніколи не потрапляє в публічні
DTO — назовні лише `UserId`.

## Сервіси

| Сервіс | Призначення |
|---|---|
| `MusicService` | Жанри, альбоми, виконавці, збірка `SongDto` (прослуховування, оцінки, автор) |
| `AudioStorage` (`IAudioStorage`) | Файли: диск або R2; аудіо до 25 МБ, картинки (png/jpg/webp/gif) до 5 МБ |
| `CatalogCache` | Кеш каталогу й статистики (30 с) з інвалідацією |
| `AdminActivityService` | Стрічка дій адмінів + SignalR-сповіщення групи `admins` |
| `ArtistActivityService` | Події для підписників на виконавця |
| `CommunitySongInput` | Валідація форми пісні ком'юніті (файл або YouTube) |
| `ExternalMusicSearchService` | iTunes Search API з рівнями релевантності |
| `GenreNames` | Порівняння жанрів без ШІ: регістр/пробіли/дефіси, кирилиця (словник + транслітерація: «хип хоп» = «hip-hop»), синоніми («r&b» = «rnb») |
| `GenreNormalizationService`, `LastFmGenreService`, `TranslationService` | Нормалізація й пошук дублікатів (спершу `GenreNames`, решта — Gemini), жанри (Last.fm), переклад назв (MyMemory) |
| `TasteService` | Схожість смаків: улюблені (вага 1) і прослухані (0,3) пісні → вектори виконавців і жанрів; косинус + збіг улюблених. Назовні — лише відсоток і спільні виконавці |
| `RecommendationService` | ШІ-рекомендації з фолбеком на улюблені жанри |
| `UserDirectoryService` | email → user id, картки користувачів для DTO |
| `DurationParser`, `FuzzyText`, `YoutubeUrlParser` | Розбір тривалості, нечіткий пошук, розбір YouTube-посилань |

## Тести

`Tests/MusicDB.Api.Tests` (xUnit, EF Core InMemory) — 105 тестів: ком'юніті (заявки, повідомлення, обговорення,
оцінки, сповіщення адмінів), баг-репорти (ліміти, скріншоти, видалення), сховище файлів (зокрема формат за
вмістом), токен завантаження, жанри (`GenreNames`, дублікати, нормалізація без ШІ), схожість смаків, схожі
виконавці, кеш каталогу, пошук iTunes, нечіткий пошук, `MusicService`, історія, статистика.

```bash
dotnet test
```

Файли `Tests/MusicDB.Api.Tests/_*.cs` — одноразові локальні скрипти роботи з даними; вони в `.gitignore`.
