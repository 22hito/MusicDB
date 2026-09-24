# Архітектура

MusicDB (публічний бренд — **N'Owl**) — музична платформа: каталог пісень, виконавців і жанрів, власні пісні
користувачів (ком'юніті), соціальні функції, ШІ-рекомендації та realtime-оновлення інтерфейсу.

## Клієнти

| Клієнт | Що це |
|---|---|
| Сайт | Основний клієнт. Vanilla JS/CSS без збирача ([frontend.md](frontend.md)); на телефоні — вигляд мобільного застосунку, встановлюється як PWA |
| Десктоп (`MusicDB_desktop`) | Electron-обгортка над продакшн-сайтом: медіа-клавіші ОС, відео в окремому вікні, автооновлення через GitHub Releases |
| Мобільний (`MusicDB_mobile`) | Нативний React Native (Expo) застосунок з усіма функціями сайту ([mobile.md](mobile.md)) |

Усі клієнти працюють з одним бекендом і однією базою, тож дані користувача синхронізовані між пристроями.

## Схема

```
 Сайт / Десктоп / Мобільний
            │  HTTPS (cookie-сесія)          SignalR /hubs/music
            ▼                                        ▲
   ASP.NET Core API (Azure App Service) ─────────────┘
     │            │                 │
     ▼            ▼                 ▼
 PostgreSQL   Cloudflare R2     Зовнішні API
 (Neon, lab)  (файли, приватний  (Google OAuth, YouTube, iTunes,
              бакет)             Last.fm, Gemini, MyMemory)
```

- **API** — ASP.NET Core 10, EF Core + Npgsql, схема `lab` ([api.md](api.md), [database.md](database.md)).
- **Файли** (аудіо пісень ком'юніті, скріншоти баг-репортів) — у Cloudflare R2. API відповідає редиректом на
  підписане посилання (6 год), тож трафік іде напряму з Cloudflare, а бакет лишається приватним. Без
  налаштованого R2 файли пишуться на локальний диск.
- **Realtime** — SignalR-хаб `MusicHub`. Користувач потрапляє в особисту групу, адмін — ще й у групу `admins`.
  Події: `songsChanged`, `requestsChanged`, `adminNotification`, `dmReceived`/`dmSent`/`dmRequestsChanged`,
  `threadsChanged`, `ratingChanged`, `friendsChanged`, `bugReportsChanged`. Веб-клієнт перепідключається
  безкінечно й дочитує пропущене при поверненні на вкладку.
- **Авторизація** — Google OAuth + cookie `MusicDB.Session` (7 днів, ковзне продовження). Десктоп і мобільний
  проходять той самий флоу у вбудованому вікні/WebView. Адмін — claim `role=admin` для email із таблиці `admins`.
- **Кеш** — список пісень і статистика в `IMemoryCache` (30 с), інвалідація при будь-якій зміні каталогу.
- Черг, Redis і фонових воркерів немає: логіка виконується в межах HTTP-запитів.

## Стек

| Шар | Технології |
|---|---|
| Backend | ASP.NET Core (.NET 10), EF Core + Npgsql, SignalR, Swashbuckle, AWSSDK.S3 |
| База даних | PostgreSQL (Neon), схема `lab` |
| Файли | Cloudflare R2 (S3 API) |
| Веб | HTML/CSS/JS без фреймворку й збирача, SignalR JS Client |
| Десктоп | Electron, electron-builder, electron-updater |
| Мобільний | Expo SDK 57, React Native 0.86, TypeScript, expo-router, expo-audio, EAS Build + EAS Update |
| Тести | xUnit, EF Core InMemory, coverlet |
| CI/CD | GitHub Actions → Azure; CodeQL; ESLint; OTA-оновлення мобільного; Dependabot |

## CI/CD

| Workflow | Що робить |
|---|---|
| `main_musicdb.yml` | Push у `main`: build → тести → publish → деплой в Azure Web App |
| `codeql.yml` | Статичний аналіз C# і JS/TS (push, PR, щотижня) |
| `lint.yml` | ESLint для `wwwroot/js` і `wwwroot/sw.js` |
| `mobile-update.yml` | Зміни в `MusicDB_mobile/`: перевірка типів + публікація OTA-оновлення (секрет `EXPO_TOKEN`) |
| `dependabot.yml` | Щотижневі оновлення NuGet, npm (desktop, mobile) і GitHub Actions |

## Безпека

- Секрети — лише в `appsettings.Local.json` (локально, у `.gitignore`), змінних середовища Azure і секретах
  GitHub. У git їх немає.
- Заголовки: HSTS, `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy і Content-Security-Policy
  з явним білим списком джерел.
- Email користувача ніколи не потрапляє в публічні DTO — назовні лише непрозорий числовий `UserId`.
- Файли в приватному бакеті R2 видаються тільки через підписані посилання (скріншоти баг-репортів — лише адмінам);
  типи й розміри файлів перевіряє сервер. Rate limiting: прослуховування (2 за 15 с), баг-репорти (5 за годину).

## Обмеження й плани

- Фонове відтворення в мобільному застосунку — лише для завантажених файлів: правила YouTube API забороняють
  фон для вбудованого плеєра (YouTube Premium на це не впливає).
- Мобільний застосунок працює з cookie-сесією через прихований WebView; якщо Google посилить обмеження для
  вбудованих WebView, знадобиться окремий мобільний auth-флоу (JWT/API-ключ).
- Схема БД змінюється вручну SQL-скриптами, а не EF Core Migrations ([database.md](database.md)).
- Донабір жанрів і тривалостей іде невеликими порціями щодня — у межах безкоштовної квоти Gemini.
