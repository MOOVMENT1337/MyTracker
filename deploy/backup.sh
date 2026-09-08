#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.production"
COMPOSE_FILE="$PROJECT_DIR/compose.production.yaml"
BACKUP_DIR="$PROJECT_DIR/backups"

fail() {
  printf 'Ошибка: %s\n' "$1" >&2
  exit 1
}

[[ -f "$ENV_FILE" ]] || fail "Нет .env.production. Сначала выполните deploy/deploy.sh."
command -v docker >/dev/null 2>&1 || fail "Docker не установлен."

env_value() {
  awk -v key="$1" '
    index($0, key "=") == 1 {
      sub(/^[^=]*=/, "")
      sub(/\r$/, "")
      print
      exit
    }
  ' "$ENV_FILE"
}

postgres_db="$(env_value POSTGRES_DB)"
postgres_user="$(env_value POSTGRES_USER)"
retention_days="$(env_value BACKUP_RETENTION_DAYS)"
retention_days="${retention_days:-14}"

[[ "$retention_days" =~ ^[0-9]+$ ]] && (( retention_days >= 1 && retention_days <= 365 )) \
  || fail "BACKUP_RETENTION_DAYS должен быть числом от 1 до 365."

cd "$PROJECT_DIR"
compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")
db_id="$("${compose[@]}" ps --status running -q db)"
[[ -n "$db_id" ]] || fail "PostgreSQL не запущена."

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/mytracker_${timestamp}.dump"
temporary="${target}.tmp"
trap 'rm -f "$temporary"' EXIT

"${compose[@]}" exec -T db \
  pg_dump --username "$postgres_user" --dbname "$postgres_db" \
  --format=custom --compress=6 --no-owner --no-acl >"$temporary"

[[ -s "$temporary" ]] || fail "PostgreSQL создала пустую резервную копию."
"${compose[@]}" exec -T db pg_restore --list <"$temporary" >/dev/null
mv "$temporary" "$target"
trap - EXIT

find "$BACKUP_DIR" -type f -name 'mytracker_*.dump' -mtime "+${retention_days}" -delete
printf 'Резервная копия создана: %s\n' "$target"
printf 'Важно: регулярно копируйте каталог backups на другое устройство или в S3.\n'
