#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.production"
COMPOSE_FILE="$PROJECT_DIR/compose.production.yaml"

fail() {
  printf 'Ошибка: %s\n' "$1" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker не установлен. Сначала установите Docker Engine и Compose plugin."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin не установлен."

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$PROJECT_DIR/.env.production.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  if command -v openssl >/dev/null 2>&1; then
    generated_password="$(openssl rand -hex 32)"
  else
    generated_password="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
  fi
  sed -i "s/GENERATE_WITH_OPENSSL_RAND_HEX_32/${generated_password}/" "$ENV_FILE"
  fail "Создан .env.production и сгенерирован пароль БД. Замените tracker.example.com своим доменом, затем повторите команду."
fi

chmod 600 "$ENV_FILE"

if grep -Eq 'tracker\.example\.com|GENERATE_WITH_OPENSSL_RAND_HEX_32' "$ENV_FILE"; then
  fail ".env.production всё ещё содержит примерные значения. Замените их перед деплоем."
fi

required_keys=(APP_DOMAIN POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD)
for key in "${required_keys[@]}"; do
  if ! grep -Eq "^[[:space:]]*${key}=.+$" "$ENV_FILE"; then
    fail "В .env.production отсутствует ${key}."
  fi
done

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

app_domain="$(env_value APP_DOMAIN)"
postgres_db="$(env_value POSTGRES_DB)"
postgres_user="$(env_value POSTGRES_USER)"
postgres_password="$(env_value POSTGRES_PASSWORD)"

if [[ ! "$app_domain" =~ ^[A-Za-z0-9.-]+$ || "$app_domain" == .* || "$app_domain" == *. || "$app_domain" != *.* ]]; then
  fail "APP_DOMAIN должен быть именем хоста без https://, пути и завершающей точки."
fi

[[ "$postgres_db" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || fail "POSTGRES_DB должен быть допустимым именем PostgreSQL."
[[ "$postgres_user" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || fail "POSTGRES_USER должен быть допустимым именем PostgreSQL."
[[ "$postgres_password" =~ ^[A-Za-z0-9]{32,}$ ]] || fail "POSTGRES_PASSWORD должен содержать минимум 32 латинские буквы/цифры без специальных символов."

available_mb="$(awk '/MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo 2>/dev/null || true)"
if [[ -n "$available_mb" && "$available_mb" -lt 1200 ]]; then
  printf 'Предупреждение: доступно только %s МиБ RAM. Для MSK-E1 настройте swap 2 ГБ перед сборкой.\n' "$available_mb" >&2
fi

cd "$PROJECT_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docker volume create mytracker_postgres_data >/dev/null
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull db caddy
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build --pull app
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

app_id="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q app)"
[[ -n "$app_id" ]] || fail "Контейнер приложения не был создан."

printf 'Ожидаю успешную проверку приложения'
for _ in {1..60}; do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$app_id")"
  if [[ "$health" == "healthy" ]]; then
    printf '\nMyTracker работает. Caddy автоматически завершит настройку HTTPS.\n'
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    printf '\nПосле создания администратора настройте ежедневный запуск deploy/backup.sh.\n'
    exit 0
  fi
  if [[ "$health" == "unhealthy" || "$health" == "exited" || "$health" == "dead" ]]; then
    printf '\n'
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 app
    fail "Приложение не запустилось."
  fi
  printf '.'
  sleep 2
done

printf '\n'
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 app
fail "Превышено время ожидания готовности приложения."
