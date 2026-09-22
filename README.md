# N'Owl

Музична база даних із пошуком, плейлистами, ШІ-рекомендаціями та соціальними фічами — сайт, десктоп-застосунок (Electron) і мобільний застосунок (React Native), що всі працюють проти одного спільного бекенду.

[![Build & Deploy](https://github.com/22hito/MusicDB/actions/workflows/main_musicdb.yml/badge.svg)](https://github.com/22hito/MusicDB/actions/workflows/main_musicdb.yml)
[![CodeQL](https://github.com/22hito/MusicDB/actions/workflows/codeql.yml/badge.svg)](https://github.com/22hito/MusicDB/actions/workflows/codeql.yml)
[![Lint](https://github.com/22hito/MusicDB/actions/workflows/lint.yml/badge.svg)](https://github.com/22hito/MusicDB/actions/workflows/lint.yml)

🔗 **Живий сайт**: https://musicdb-b5c4grhhdjdjd5gv.polandcentral-01.azurewebsites.net/

## Можливості

- Каталог пісень: пошук, фільтри за жанром, сортування, редагування (адмін), заявки на додавання пісень із авто-заповненням через iTunes/Last.fm/Gemini.
- Профіль користувача (Google OAuth): улюблені пісні, приватні/публічні плейлисти, історія прослуховувань.
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

## Ліцензія

Особистий проєкт, без публічної ліцензії.
