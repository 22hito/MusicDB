# N'Owl

Музична база даних із пошуком, плейлистами, ШІ-рекомендаціями та соціальними фічами — сайт, десктоп-застосунок (Electron) і мобільний застосунок (React Native), що всі працюють проти одного спільного бекенду.

[![Build & Deploy](https://github.com/22hito/MusicDB/actions/workflows/main_musicdb.yml/badge.svg)](https://github.com/22hito/MusicDB/actions/workflows/main_musicdb.yml)
[![CodeQL](https://github.com/22hito/MusicDB/actions/workflows/codeql.yml/badge.svg)](https://github.com/22hito/MusicDB/actions/workflows/codeql.yml)
[![Lint](https://github.com/22hito/MusicDB/actions/workflows/lint.yml/badge.svg)](https://github.com/22hito/MusicDB/actions/workflows/lint.yml)

🔗 **Живий сайт**: https://musicdb-b5c4grhhdjdjd5gv.polandcentral-01.azurewebsites.net/

📚 **Документація для розробників** — у [`docs/`](docs/): [архітектура](docs/architecture.md) · [API](docs/api.md) · [база даних](docs/database.md) · [веб-фронтенд](docs/frontend.md) · [мобільний застосунок](docs/mobile.md). Історія змін — [CHANGELOG.md](CHANGELOG.md).

## Можливості

**Музика**
- Каталог пісень (таблиця_1): пошук, фільтри за жанром/альбомом (клік по бейджу), сортування, заявки на додавання з автозаповненням через iTunes/Last.fm/Gemini, редагування адміном (зокрема текст пісні).
- Пісні ком'юніті (таблиця_2): власні пісні користувачів — файл до 25 МБ (Cloudflare R2) або посилання на YouTube, з ніком автора й усім функціоналом каталогу.
- Плеєр: YouTube і аудіофайли, черга, перемішування/повтор, відео-попап, текст пісні (караоке), біжучий рядок для довгих назв, медіа-клавіші ОС (Media Session).
- Оцінки пісень 0–100 і рецензії; Топ 100 найпрослуханіших.
- ШІ-рекомендації (Gemini) на основі історії прослуховувань, з фолбеком за жанрами без ключа.
- Ігри: колесо фортуни (випадковий жанр → плейлист), батл рояль (турнір на вибування з кроком назад).
- Граф схожості пісень/жанрів/альбомів/синглів (фізична симуляція, малювання на `<canvas>`).

**Соціальне**
- Профіль (Google OAuth): аватар, улюблені, приватні/публічні плейлисти, історія прослуховувань.
- Друзі (запити → прийняття), публічні профілі з аватарками.
- Особисті повідомлення: друзям — вільно, іншим — через «Запити на листування»; «Видалити чат у себе».
- Гілки обговорень ком'юніті.
- Сторінки виконавців: дискографія, підписка й сповіщення про нові пісні/текст.
- Глобальний пошук у навбарі (пісні, виконавці, люди).

**Адміністрування й сервіс**
- Адмін-панель: модерація заявок (обидві таблиці), додавання пісень, ШІ-об'єднання дублікатів жанрів, сповіщення про дії інших адмінів.
- Баг-репорти з технічними даними й до 3 скріншотів; перегляд, статус і видалення в адмінці.
- Реалтайм без перезавантаження (SignalR): каталог, заявки, повідомлення, друзі, оцінки, сповіщення, тости.

**Клієнти**
- Сайт: теми (темна/сіра/світла/системна), 6 акцентних кольорів, налаштування інтерфейсу, PWA; на телефоні — вигляд мобільного застосунку (нижній таббар, картки пісень).
- Десктоп (Electron): нативні медіа-клавіші, відео в окремому вікні, автооновлення через GitHub Releases.
- Мобільний застосунок (React Native / Expo): усі функції сайту, фонове відтворення файлів із керуванням на екрані блокування, оновлення «по повітрю» (EAS Update).

## Технології

| Шар | Стек |
|---|---|
| Backend | ASP.NET Core 10, EF Core, Npgsql (PostgreSQL, хостинг на Neon), SignalR |
| Frontend | Vanilla JS/CSS без фреймворку й збирача: модулі `wwwroot/js/*.js` і `wwwroot/css/*.css` |
| Файли | Cloudflare R2 (S3 API, AWSSDK.S3): аудіо ком'юніті, скріншоти баг-репортів |
| Auth | Google OAuth 2.0 + cookie-сесії |
| Desktop | Electron + electron-builder (auto-update через GitHub Releases) |
| Mobile | React Native (Expo SDK 57, expo-router, expo-audio), EAS Build + EAS Update |
| Хостинг | Azure App Service |
| CI/CD | GitHub Actions (build/test/deploy, CodeQL, ESLint, OTA-оновлення мобільного, Dependabot) |

## Структура репозиторію

```
Controllers/        REST API контролери
Services/            Бізнес-логіка (нормалізація жанрів/виконавців, рекомендації, пошук)
Data/                EF Core DbContext і сутності
Models/              DTO
Filters/             Атрибути авторизації (AdminOnly)
Hubs/                SignalR hub
wwwroot/             Фронтенд (без збирача) + статичні файли
  index.html         Розмітка всіх сторінок; підключає css/ і js/ у потрібному порядку
  css/               Стилі за шарами (порядок = каскад): base → components → player → layout →
                     nocturne → overlays → responsive → features → mobile-app
  js/                Логіка за функціями: i18n, navigation, songs, player, battle, wheel, graph,
                     chat, auth, … — звичайні <script> зі спільними глобальними іменами;
                     i18n.js першим, main.js (запуск застосунку) — останнім
Tests/               xUnit тести
MusicDB_desktop/     Electron-застосунок
MusicDB_mobile/      React Native застосунок (Expo): src/app — екрани, src/components, src/api, src/player
.github/workflows/   CI/CD: деплой на Azure, CodeQL, ESLint, OTA-оновлення мобільного (mobile-update.yml)
db/                  SQL-міграції (окремо від git — див. коментар нижче)
docs/                Документація для розробників (Markdown)
```

> Новий модуль фронтенду: створити `wwwroot/js/<назва>.js` і додати `<script>` в `index.html` перед `main.js`.
> ESLint (`npm run lint`) сам підхоплює всі файли `js/` і знає про спільні імена між ними.

> Схема БД наразі змінюється вручну SQL-скриптами (`db/*.sql`, поза цим репозиторієм), не через EF Core Migrations — це заплановане до переходу.

## Файли пісень ком'юніті (Cloudflare R2)

Без налаштувань файли пишуться на диск (`App_Data/audio` локально, `%HOME%\data\musicdb-audio` на Azure).
Щойно заповнено `Uploads:R2`, файли йдуть у бакет R2, а `/api/songs/{id}/audio` відповідає редиректом
на підписане посилання (6 год) — аудіо тягнеться напряму з Cloudflare, бакет лишається приватним.

1. Cloudflare → R2 → **Create bucket** (напр. `nowl-audio`).
2. R2 → **Manage API tokens** → **Create API token**: права *Object Read & Write*, лише цей бакет.
   Збережіть *Access Key ID* і *Secret Access Key* (секрет показується один раз). *Account ID* — на головній R2.
3. Azure → App Service → **Environment variables** (подвійне підкреслення замість `:`):
   `Uploads__R2__AccountId`, `Uploads__R2__AccessKeyId`, `Uploads__R2__SecretAccessKey`, `Uploads__R2__Bucket`.
   Локально — ті самі ключі в `appsettings.Local.json`.
4. Необов'язково: `Uploads__R2__PublicBaseUrl` — публічний домен бакета (власний домен у Cloudflare),
   тоді віддаються прямі посилання з кешем CDN замість підписаних.

## Мобільний застосунок (Expo)

```bash
cd MusicDB_mobile
npm install
npx expo start          # відкрити в Expo Go (QR-код)
```

- **Збірка APK:** `eas build --platform android --profile preview` (хмара EAS). Потрібна лише коли змінюються
  нативні модулі/плагіни — тоді ще й підняти `version` у `app.json` (`runtimeVersion` = версія застосунку).
- **Оновлення «по повітрю»:** кожен пуш у `main`, що змінює `MusicDB_mobile/`, публікує новий JS-код
  (`.github/workflows/mobile-update.yml`, секрет репозиторію `EXPO_TOKEN`). Застосунок завантажує його сам
  і пропонує перезапуститись. Вручну: `eas update --branch preview`.
- **Адреса бекенду** за замовчуванням — продакшн; для локального сервера:
  `EXPO_PUBLIC_API_BASE=http://<IP-комп'ютера>:5000 npx expo start`.

## Локальний запуск

Потрібні: .NET 10 SDK, локальна PostgreSQL-база.

```bash
# 1. Секрети — лише локально, не в git
cp appsettings.json appsettings.Local.json
# заповнити ConnectionStrings:Postgres, Authentication:Google:ClientSecret, YouTube/Gemini/LastFm ключі

# 2. Застосувати схему БД — SQL-скрипти в db/ (поза цим репо), по порядку створення

# 3. Запуск
dotnet run
# сайт на http://localhost:5000
```

Тести:

```bash
dotnet test
```

Лінт фронтенд-JS:

```bash
npm install
npm run lint
```
