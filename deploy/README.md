# Розгортання N'Owl v2 (Oracle Cloud Free + Docker)

Один сервер: PostgreSQL, API, сайт і Caddy (HTTPS від Let's Encrypt). Файли — у цій теці.

## 1. Сервер (робить власник акаунта)

1. Зареєструватися в Oracle Cloud (Free Tier; картка — лише для перевірки, списань немає).
2. **Compute → Instances → Create**: образ **Ubuntu 24.04**, форма **VM.Standard.A1.Flex** (Ampere, 4 OCPU, 24 GB — у межах Always Free),
   завантажити свій публічний SSH-ключ. Записати публічний IP.
3. **Networking → VCN → Security List**: додати Ingress-правила TCP 80 і 443 з 0.0.0.0/0.
4. Домен: A-запис на IP сервера (свій домен або безкоштовний піддомен, напр. на duckdns.org).

## 2. Підготовка сервера (по SSH)

```bash
sudo apt update && sudo apt -y upgrade
# Образи Oracle блокують порти правилами iptables — відкрити 80/443
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && newgrp docker
# Код
git clone -b v2 https://github.com/22hito/MusicDB.git ~/MusicDB
cd ~/MusicDB/deploy && cp .env.example .env && nano .env   # заповнити секрети
chmod +x deploy.sh backup.sh
```

## 3. Перенесення даних з v1

Нова база має бути порожньою. Перенесення лише читає стару базу (сесія read-only):

```bash
cd ~/MusicDB/deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d db
# Тимчасово відкрити порт бази лише для цього кроку, або запустити з контейнера Node в тій самій мережі:
docker run --rm --network deploy_default -v ~/MusicDB:/repo -w /repo node:24-slim bash -c "
  npm i -g pnpm@12.9.1 && pnpm install --frozen-lockfile --filter @musicdb/legacy-migrate... &&
  LEGACY_DATABASE_URL='<рядок підключення до бази v1 (Neon)>' \
  DATABASE_URL='postgres://nowl:<POSTGRES_PASSWORD>@db:5432/nowl' \
  pnpm --filter @musicdb/legacy-migrate migrate"
```

Рядок підключення до бази v1 вводить власник — у репозиторії його немає.

## 4. Запуск

```bash
./deploy.sh        # збирає образи, запускає, міграції застосовуються автоматично
crontab -e         # 0 4 * * * /home/ubuntu/MusicDB/deploy/backup.sh
```

Перевірка: `https://<DOMAIN>/health` → `{"ok":true}`.

## 5. Після запуску

- **Звірка каталогу** з офіційними платформами (дані з v1 її ще не мають):
  `DATABASE_URL=… pnpm --filter @musicdb/catalog-verify verify` (довго; можна переривати й продовжувати).
- **Google OAuth**: у Google Console додати redirect URI `https://<DOMAIN>/v1/auth/callback/google`.
- **Перехід з v1**: на старому сайті (Azure) — переадресація на `https://<DOMAIN>`. API v1 лишити працювати,
  доки в Google Play не вийде новий застосунок (старі встановлені версії ходять у v1).
- **Застосунок**: у `apps/mobile/eas.json` для профілів `play` і `direct` задати
  `EXPO_PUBLIC_API_URL=https://<DOMAIN>` і `EXPO_PUBLIC_WEB_URL=https://<DOMAIN>`, зібрати й відправити в Google Play.

## Оновлення

`~/MusicDB/deploy/deploy.sh` — підтягує гілку `v2`, робить копію бази, перезбирає й перезапускає.
Відкат: `git checkout <попередній коміт> && docker compose -f docker-compose.prod.yml --env-file .env up -d --build`;
база — з `backups/` через `pg_restore`.
