#!/usr/bin/env bash
# Щоденна копія бази (cron: 0 4 * * * /home/ubuntu/MusicDB/deploy/backup.sh). Зберігає 14 останніх.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
docker compose -f docker-compose.prod.yml --env-file .env exec -T db \
  pg_dump -U nowl -d nowl --format=custom > "backups/nowl-$(date +%F).dump"
ls -1t backups/nowl-*.dump | tail -n +15 | xargs -r rm -f
echo "копія: backups/nowl-$(date +%F).dump"
