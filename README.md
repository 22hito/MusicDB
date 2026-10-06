# N'Owl v2

Музична платформа: стрімінг пісень незалежних артистів, каталог для відкриття музики, оцінки й рецензії,
«схожий смак», обговорення й особисті повідомлення. Сайт і мобільний застосунок на спільному TypeScript-ядрі.

> Гілка `v2` — переписування з нуля. Продакшн працює на v1 (гілка `main`) до паритету функцій і перенесення даних.
> Архітектура й рішення — [docs/architecture.md](docs/architecture.md).

## Що всередині

| | |
|---|---|
| `apps/api` | Hono + Drizzle + PostgreSQL + better-auth. ~90 ендпоінтів з контрактів, OpenAPI на `/docs`, WebSocket, черга фонових задач, обробка аудіо (ffmpeg: EBU R128, хвиля, AAC) |
| `apps/web` | Next.js 16: оболонка в стилі стрімінгових сервісів, плеєр без перерв між сторінками (аудіо + YouTube), SSR публічних сторінок |
| `apps/mobile` | Expo: ті самі SDK, плеєр, переклади й токени; фонове відтворення й керування з екрана блокування |
| `packages/contracts` | zod-схеми й таблиця ендпоінтів — єдине джерело правди для сервера, клієнтів і документації |
| `packages/sdk` | Типізований клієнт, React-хуки з оптимістичними оновленнями, реалтайм |
| `packages/player` | Ядро плеєра: черга, перемішування, повтор, радіо, зарахування прослуховувань |
| `packages/db` | Схема, міграції, пошуковий індекс (FTS + триграми), тестова БД у пам'яті |
| `packages/tokens`, `packages/i18n` | Дизайн-токени й переклади uk/en |

## Швидкий старт

Потрібно: Node 24, pnpm 12. Docker і встановлений Postgres **не** потрібні.

```bash
pnpm install
pnpm db:start                          # вбудований PostgreSQL 18 (окремий термінал)
pnpm db:migrate
pnpm --filter @musicdb/seed dev        # каталог для розробки (SNAPSHOT_DIR — тека зі знімками)
cp apps/api/.env.example apps/api/.env # за потреби — Google, R2, YouTube
pnpm dev                               # API :8787 + сайт :3000
pnpm dev:mobile                        # Expo (EXPO_PUBLIC_API_URL — адреса API для телефона)
```

- Сайт: http://localhost:3000 · документація API: http://localhost:8787/docs
- Адмін: email з `ADMIN_EMAILS` отримує роль admin при реєстрації.

## Перевірки

```bash
pnpm lint          # Biome
pnpm typecheck     # TypeScript у всіх пакетах
pnpm test          # API (інтеграційні, справжній Postgres у пам'яті) + ядро плеєра
```

## Розгортання

`docker compose up -d --build` з `.env` (`PUBLIC_URL`, `AUTH_SECRET`, `POSTGRES_PASSWORD`, R2-ключі). API застосовує
міграції при старті. Окремо можна запускати воркер фонових задач (`node dist/worker.js`, `WORKER_MODE=off` для API).
