# N'Owl

Музична база даних із пошуком, плейлистами, ШІ-рекомендаціями та соціальними фічами — сайт, десктоп-застосунок (Electron) і мобільний застосунок (React Native), що всі працюють проти одного спільного бекенду.

[![Build & Deploy](https://github.com/22hito/MusicDB/actions/workflows/main_musicdb.yml/badge.svg)](https://github.com/22hito/MusicDB/actions/workflows/main_musicdb.yml)
[![CodeQL](https://github.com/22hito/MusicDB/actions/workflows/codeql.yml/badge.svg)](https://github.com/22hito/MusicDB/actions/workflows/codeql.yml)
[![Lint](https://github.com/22hito/MusicDB/actions/workflows/lint.yml/badge.svg)](https://github.com/22hito/MusicDB/actions/workflows/lint.yml)

🔗 **Живий сайт**: https://musicdb-b5c4grhhdjdjd5gv.polandcentral-01.azurewebsites.net/

## Можливості

- Каталог пісень: пошук, фільтри за жанром, сортування, редагування (адмін), заявки на додавання пісень із авто-заповненням через iTunes/Last.fm/Gemini.
- Профіль користувача (Google OAuth): улюблені пісні, приватні/публічні плейлисти, історія прослуховувань.
- Головна таблиця_2 — пісні від ком'юніті: власні пісні користувачів (файл до 25 МБ або посилання на YouTube), з ніком автора; увесь функціонал каталогу (улюблені, плейлисти, топ, оцінки, редагування адміном).
- Оцінки пісень 0–100 (тимчасова шкала) і рецензії.
- Особисті повідомлення та гілки обговорень ком'юніті (реалтайм через SignalR).
- Глобальний пошук у навбарі (пісні, виконавці, люди); сповіщення адмінів про нові заявки й дії інших адмінів.
- Друзі: пошук людей, запити в друзі (invite → accept).
- Сторінки виконавців: дискографія, підписка на оновлення (нова пісня/текст) із сповіщеннями.
- ШІ-рекомендації (Gemini) на основі історії прослуховувань, з фолбеком за жанрами без ключа.
- Ігри: колесо фортуни (випадковий жанр → плейлист), батл рояль (турнір пісень на вибування).
- Граф схожості пісень/жанрів/альбомів (фізична симуляція вузлів у SVG).
- Реалтайм-оновлення каталогу через SignalR.
- Десктоп-застосунок (Electron): нативні медіа-клавіші ОС, відео в окремому вікні, автооновлення через GitHub Releases.
- Мобільний застосунок (React Native / Expo).

## Технології

| Шар | Стек |
|---|---|
| Backend | ASP.NET Core 10, EF Core, Npgsql (PostgreSQL, хостинг на Neon) |
| Frontend | Vanilla JS/CSS (без фреймворку/збірника), SignalR client |
| Auth | Google OAuth 2.0 + cookie-сесії |
| Desktop | Electron + electron-builder (auto-update через GitHub Releases) |
| Mobile | React Native (Expo) |
| Хостинг | Azure App Service |
| CI/CD | GitHub Actions (build/test/deploy, CodeQL, ESLint, Dependabot) |

## Структура репозиторію

```
Controllers/        REST API контролери
Services/            Бізнес-логіка (нормалізація жанрів/виконавців, рекомендації, пошук)
Data/                EF Core DbContext і сутності
Models/              DTO
Filters/             Атрибути авторизації (AdminOnly)
Hubs/                SignalR hub
wwwroot/             Фронтенд (index.html, app.js, styles.css) + статичні файли
Tests/               xUnit тести
MusicDB_desktop/     Electron-застосунок
MusicDB_mobile/      React Native застосунок
db/                  SQL-міграції (окремо від git — див. коментар нижче)
```

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
