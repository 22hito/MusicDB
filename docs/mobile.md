# Мобільний застосунок (`MusicDB_mobile`)

Expo SDK 57, React Native 0.86, React 19, TypeScript, expo-router (файлова маршрутизація з типізованими
маршрутами). Нативний інтерфейс з усіма функціями сайту; дизайн — та сама палітра (oklch → hex), шрифти
Inter + Playfair Display і 6 акцентних кольорів.

## Структура `src/`

```
app/
  _layout.tsx             корінь: шрифти, провайдери, налаштування, плашка оновлення
  (tabs)/
    index.tsx             Бібліотека: каталог і ком'юніті
    top.tsx               Топ 100
    community/            Спілкування: обговорення, ЛС, запити, друзі; chat/[userId], thread/[id], user/[id]
    explore/              Огляд і рекомендації; wheel, battle, taste, artists, artist/[id]
    profile/              Профіль, playlist/[id]
    admin.tsx             Адмінка: заявки, додавання, сповіщення, баги
    request.tsx           Форма заявки (з файлом для ком'юніті)
api/        ApiBridge.tsx (запити й SignalR через прихований WebView), endpoints.ts, types.ts
components/ UI-кіт, SongRow, SongListBlock, MarqueeText, SelectField, DateField, GenrePickerModal,
            ForceGraph (граф на SVG), ArtistAvatar, модалки (оцінки, текст, баг-репорт…)
player/     PlayerContext.tsx, MiniPlayerBar.tsx
state/      SettingsContext (тема, акцент, мова), FavoritesContext
constants/  theme.ts, i18n.ts
```

- **Запити:** `ApiBridge` виконує `fetch` усередині прихованого WebView з тим самим origin і cookie-сесією, що й
  сайт, і там же слухає SignalR. Завантаження файлів (multipart) іде нативним `fetch`:
  перед ним застосунок бере через WebView короткоживучий токен (`POST /api/upload-token`) і передає його
  заголовком `X-Upload-Token`, бо нативний `fetch` не завжди має куку сесії (на iOS — ніколи).
  Ім'я файлу перед відправкою зводиться до ASCII (розширення зберігається): OkHttp на Android відкидає
  запит, якщо в заголовку частини multipart є кирилиця.
- **Плеєр:** два рушії. Пісні з файлом грає нативний `expo-audio`: у фоні, при вимкненому екрані, з керуванням
  на екрані блокування. YouTube грає у WebView (`mobile-player.html`), лише на активному екрані (правила
  YouTube API), тому поки він грає, екран не гасне (`expo-keep-awake`). Для батлу WebView-плеєр «докується» в
  рамку на екрані.

## Розробка

```bash
cd MusicDB_mobile
npm install
npx expo start                                   # Expo Go, QR-код
EXPO_PUBLIC_API_BASE=http://<IP>:5000 npx expo start   # проти локального бекенду
npx tsc --noEmit -p .                            # перевірка типів
```

У Expo Go фонове аудіо й OTA-оновлення не працюють — лише у встановленому APK.

## Збірка й оновлення

- **APK:** `eas build --platform android --profile preview` (хмара EAS).
- **Оновлення «по повітрю» (EAS Update):** канал `preview`, `runtimeVersion` = `version` з `app.json`.
  Кожен пуш у `main`, що змінює `MusicDB_mobile/`, публікує новий JS-код (`.github/workflows/mobile-update.yml`,
  секрет `EXPO_TOKEN`). Застосунок перевіряє оновлення при запуску й поверненні (не частіше ніж раз на 15 хв)
  і показує плашку «Доступна нова версія — Перезапустити». Вручну: `eas update --branch preview`.
- **Коли потрібна нова збірка:** лише при зміні нативної частини (новий нативний модуль, плагін у `app.json`).
  Тоді підняти `version` (і `android.versionCode`) — старі APK не отримають оновлення, яке в них не запуститься.
