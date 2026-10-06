# N'Owl v2 на Vercel (Hobby, безкоштовно)

Сайт і API — один проєкт Vercel: API працює всередині Next (`apps/web/src/app/v1/[...path]/route.ts`,
вмикається `EMBEDDED_API=1`). База — Neon (безкоштовна). Файли — Cloudflare R2. WebSocket немає — клієнти
оновлюються опитуванням (`NEXT_PUBLIC_REALTIME=off`, у застосунку `EXPO_PUBLIC_REALTIME=off`).
Тариф Hobby — лише некомерційне використання: преміум сховано (`FEATURES.premium = false`).

## 1. Проєкт
1. vercel.com → увійти через GitHub → **Add New → Project** → репозиторій `22hito/MusicDB`.
2. **Root Directory**: `apps/web`. Framework: Next.js (інше — з `apps/web/vercel.json`).
3. Після створення: **Settings → Git → Production Branch** = `v2` (гілка `main` — це v1, її Vercel не збирає).
4. **Settings → General → Node.js Version**: 24.x.

## 2. База
**Storage → Create Database → Neon** (Free), регіон **Frankfurt (eu-central-1)**, підключити до проєкту —
Vercel сам додасть `DATABASE_URL` і `DATABASE_URL_UNPOOLED`. Міграції застосовуються під час кожної збірки.

## 3. Змінні середовища (Settings → Environment Variables, Production)
| Змінна | Значення |
|---|---|
| `EMBEDDED_API` | `1` |
| `NEXT_PUBLIC_REALTIME` | `off` |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` (pnpm 12 з `packageManager`) |
| `AUTH_SECRET` | випадковий рядок ≥ 32 символи (`openssl rand -base64 48`) |
| `API_URL`, `WEB_ORIGINS` | `https://nowl.pp.ua` |
| `ADMIN_EMAILS` | `dima1post1@gmail.com` |
| `PAYMENTS_MODE` | `disabled` |
| `STORAGE_DRIVER` | `s3` |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | Cloudflare R2 (як у v1) |
| `YOUTUBE_API_KEYS` | ключі YouTube Data API через кому |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |

Потім **Deployments → Redeploy**.

## 4. Домен
`nowl.pp.ua` (NIC.UA). У NIC.UA: **NS-servers → NIC.UA name servers**, записи **A** `@` → `76.76.21.21`
і **CNAME** `www` → `cname.vercel-dns.com`. У Vercel: **Settings → Domains → Add** `nowl.pp.ua` (+ `www.nowl.pp.ua`
з переадресацією). HTTPS Vercel видасть сам. Безкоштовний `.pp.ua` треба продовжувати щороку (до 6.10.2027).

## 5. Дані з v1 (після першої збірки — схема вже створена, база порожня)
На своєму комп'ютері, у корені репозиторію:
```bash
LEGACY_DATABASE_URL='<база v1 (Neon)>' DATABASE_URL='<DATABASE_URL_UNPOOLED нової бази>' \
  pnpm --filter @musicdb/legacy-migrate migrate
```
Потім звірка каталогу: `DATABASE_URL='<те саме>' pnpm --filter @musicdb/catalog-verify verify`
(відповіді платформ уже в кеші — піде швидко).

## 6. Решта
- Google Console → OAuth → redirect URI `https://nowl.pp.ua/v1/auth/callback/google`.
- Старий сайт (Azure) → переадресація на `https://nowl.pp.ua`; API v1 лишити до виходу нового застосунку.
- Застосунок: `eas build --profile play` (адреса й вимкнений реалтайм уже в `apps/mobile/eas.json`).

## Обмеження Hobby
Фонові задачі (обробка аудіо, сповіщення) — після запиту, до 60 с; без WebSocket; некомерційно.
Коли повернемо оплату — тариф Pro або окремий сервер для API (див. `deploy/README.md`).
