# Backend API

ASP.NET Core 10, мінімальний hosting-model (`Program.cs`). Swagger — лише в середовищі Development (`/swagger`).

## Program.cs

- **Конфігурація:** `appsettings.json` + локальний `appsettings.Local.json`; на Azure — змінні середовища
  (подвійне підкреслення замість `:`, напр. `Uploads__R2__Bucket`). Порт — зі змінної `PORT` або `Urls`.
- **Сервіси:** Scoped — `MusicService`, `UserDirectoryService`, `TasteService`, `ArtistActivityService`, `AdminActivityService`;
  Singleton — `CatalogCache`, `StaticAssetVersions`, `IAudioStorage` (`R2AudioStorage`, якщо заповнено `Uploads:R2`, інакше
  `LocalAudioStorage`); типізовані `HttpClient` — `TranslationService`, `ExternalMusicSearchService`,
  `GenreNormalizationService`, `RecommendationService`, `LastFmGenreService`.
- **Конвеєр:** CORS → заголовки безпеки → (Dev: Swagger) → головна (`index.html` з `?v=<хеш вмісту>` у посиланнях
  на css/js, стиснута раз, ETag) → css/js з пам'яті (`StaticAssetVersions.Find`: стиснуті раз Brotli 11, з `?v=` —
  `immutable` на рік; на проді стилі `<head>` склеєні в `/css/bundle.css`, defer-скрипти — в `/js/bundle.js`,
  вимикається `StaticAssets__Bundle=false`; стискання — у фоні одразу після старту) → решта статики (з `?v=` —
  `immutable`, інакше no-cache + ETag) →
  автентифікація → авторизація → rate limiter → контролери → SignalR (`/hubs/music`) → SPA fallback на ту саму
  головну.
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
| Artists | `/api/artists` | Каталог виконавців (з фото; лічильники — згрупованими запитами в кеші на 2 хв, пошук і сортування — у пам'яті), дискографія, підписка, схожі виконавці (за жанрами); адмін — опис українською й англійською (`PUT /{id}`: `bio`, `bioEn`; без `bioEn` англійський не змінюється), `PUT/DELETE /{id}/image`, фото в R2, віддача — редирект) |
| Corrections | `/api/corrections` | Запит на правку пісні чи виконавця (multipart: поле, текст, джерело, файл пісні для поля `audio`; до 10/год), «мої запити»; адмін — список за статусом, лічильник відкритих, файл і пряме посилання на нього, прикріпити файл до пісні (`POST /{id}/apply-audio`), статус із відповіддю (`PATCH /{id}`), видалення |
| BugReports | `/api/bug-reports` | Створення (JSON або multipart з ≤3 скріншотами), список, лічильник відкритих, статус, видалення, скріншот і пряме посилання на нього (адмін) |
| ExternalSearch | `/api/external-search` | iTunes для автозаповнення заявки; жанри (Last.fm → Gemini) |
| Favorites | `/api/favorites` | Улюблені пісні |
| Friends | `/api/friends` | Друзі, запити (надіслати/прийняти/відхилити/скасувати), розірвання дружби |
| Genres | `/api/genres` | Жанри; ШІ-об'єднання дублікатів (адмін) |
| History | `/api/history` | Логування прослуховування (унікальність + rate limit; повторне — лише оновлює час), `GET` — нещодавно прослухані (`limit` ≤ 100, `offset` — наступні сторінки «Усієї історії») |
| Messages | `/api/messages` | Розмови, непрочитані, запити на листування, діалог, надсилання (JSON; з файлом до 20 МБ і/або піснею — multipart `POST /{userId}/rich`), файл із повідомлення лише учасникам (`GET /attachment/{id}`, `/link`; `?download=true` — на збереження під назвою відправника, `?inline=true` — PDF і текст (`charset=utf-8`) для перегляду на сайті), «видалити чат у себе» |
| Notifications | `/api/notifications` | Події підписок на виконавців; `GET /threads` — нові дописи в гілках, де я учасник (`unreadCount`, дописи з `toMe` / `unread`), `POST /threads/mark-read`, `POST /threads/{threadId}/mark-read` |
| Playlists | `/api/playlists` | Плейлисти, публічні плейлисти, пісні в плейлисті |
| Profile | `/api/profile` | Власний профіль, ім'я й аватар |
| Ratings | `/api/songs/{id}/ratings` | Оцінка 0–100 і рецензії |
| Recommendations | `/api/recommendations` | ШІ-рекомендації з поясненням |
| Requests | `/api/requests` | Заявки на пісні каталогу й ком'юніті (з файлом), редагування, схвалення, відхилення, текст, файл заявки |
| Songs | `/api/songs` | Каталог (`source=catalog\|community\|all\|background` — останнє: пісні з файлом з обох таблиць), CRUD (адмін), пісні ком'юніті, аудіо (редирект на R2), файл будь-якої пісні — додати/замінити/прибрати (адмін), кеш YouTube videoId, текст пісні |
| Stats | `/api/stats` | Статистика таблиці (`source`, з кешем) і Топ-N |
| Threads | `/api/threads` | Гілки обговорень (у списку — `unread` для учасника), відповіді (`replyToPostId` — відповідь на допис, з цитатою й сповіщенням його автору), `POST/DELETE /{id}/follow` — стежити за гілкою, видалення. Автор гілки й ті, хто відповідав, — учасники: їм SignalR `threadReply` (id гілки, ім'я автора, назва, чи це відповідь мені). Відкриття гілки позначає її прочитаною (`threadNotificationsChanged` іншим вкладкам) |
| UploadToken | `/api/upload-token` | Короткоживучий (10 хв) токен завантаження файлів для мобільного застосунку; видається лише за cookie-сесією. Заголовок `X-Upload-Token` приймається тільки на ендпоінтах завантаження (заявка/пісня ком'юніті, заміна файлу, баг-репорт зі скріншотами, фото виконавця, запит на правку, повідомлення з файлом) |
| Users | `/api/users` | Пошук людей, публічний профіль зі статусом стосунків, `GET /{id}/avatar` — аватарка (своя з data:-URI профілю або редирект на Google; версійована адреса, кеш назавжди — у посиланнях на автора замість вмісту картинки), `GET /taste` — граф «Схожий смак» (люди, ребра схожості, найсхожіші до мене) |

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
