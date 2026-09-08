#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.production"
COMPOSE_FILE="$PROJECT_DIR/compose.production.yaml"

[[ -f "$ENV_FILE" ]] || {
  printf 'Ошибка: нет .env.production. Сначала выполните bash deploy/deploy.sh.\n' >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || {
  printf 'Ошибка: Docker не установлен.\n' >&2
  exit 1
}

read -r -p 'Email администратора: ' ADMIN_EMAIL
read -r -p 'Отображаемое имя [Administrator]: ' ADMIN_DISPLAY_NAME
ADMIN_DISPLAY_NAME="${ADMIN_DISPLAY_NAME:-Administrator}"
read -r -s -p 'Пароль администратора (12–128 символов): ' ADMIN_PASSWORD
printf '\n'

if (( ${#ADMIN_PASSWORD} < 12 || ${#ADMIN_PASSWORD} > 128 )); then
  printf 'Ошибка: пароль должен содержать от 12 до 128 символов.\n' >&2
  exit 1
fi

export ADMIN_EMAIL ADMIN_DISPLAY_NAME ADMIN_PASSWORD
cd "$PROJECT_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm \
  -e ADMIN_EMAIL -e ADMIN_DISPLAY_NAME -e ADMIN_PASSWORD \
  app node dist/db/cli.js admin
unset ADMIN_PASSWORD
