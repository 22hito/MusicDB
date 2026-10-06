#!/usr/bin/env bash
# Оновлення сервера до свіжої гілки v2: код → збірка образів → перезапуск (міграції бази — автоматично в API).
set -euo pipefail
cd "$(dirname "$0")/.."
git fetch origin v2 && git checkout v2 && git reset --hard origin/v2
cd deploy
./backup.sh || echo "попередження: копію бази не зроблено (перший запуск?)"
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker image prune -f >/dev/null
docker compose -f docker-compose.prod.yml --env-file .env ps
