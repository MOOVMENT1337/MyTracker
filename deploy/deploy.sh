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

command -v docker >/dev/null 2>&1 || fail "Docker не установлен. Сначала выполните deploy/bootstrap-debian.sh."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin не установлен."

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$PROJECT_DIR/.env.production.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  fail "Создан .env.production. Укажите домен и строку Session pooler из Supabase Dashboard -> Connect, затем повторите команду."
fi

chmod 600 "$ENV_FILE"

if grep -Eq 'tracker\.example\.com|PROJECT_REF|YOUR_URL_ENCODED_PASSWORD|YOUR[-_]?PASSWORD|\[YOUR-PASSWORD\]|aws-0-REGION' "$ENV_FILE"; then
  fail ".env.production всё ещё содержит примерные значения. Замените их перед деплоем."
fi

required_keys=(APP_DOMAIN DATABASE_URL DATABASE_SSL)
for key in "${required_keys[@]}"; do
  if ! grep -Eq "^[[:space:]]*${key}=.+$" "$ENV_FILE"; then
    fail "В .env.production отсутствует ${key}."
  fi
done

env_value() {
  awk -v key="$1" '
    $0 ~ "^[[:space:]]*" key "=" {
      sub(/^[^=]*=/, "")
      sub(/\r$/, "")
      print
      exit
    }
  ' "$ENV_FILE"
}

strip_outer_quotes() {
  local value="$1"
  local first="${value:0:1}"
  local last="${value: -1}"
  if [[ ${#value} -ge 2 && (( "$first" == "'" && "$last" == "'" ) || ( "$first" == '"' && "$last" == '"' )) ]]; then
    printf '%s' "${value:1:${#value}-2}"
  else
    printf '%s' "$value"
  fi
}

app_domain="$(strip_outer_quotes "$(env_value APP_DOMAIN)")"
database_url="$(strip_outer_quotes "$(env_value DATABASE_URL)")"
database_ssl="$(strip_outer_quotes "$(env_value DATABASE_SSL)")"

if [[ ! "$app_domain" =~ ^[A-Za-z0-9.-]+$ || "$app_domain" == .* || "$app_domain" == *. || "$app_domain" != *.* ]]; then
  fail "APP_DOMAIN должен быть именем хоста без https://, пути и завершающей точки."
fi

[[ "$database_ssl" == "true" ]] || fail "DATABASE_SSL должен быть true для Supabase."

if [[ ! "$database_url" =~ ^postgres(ql)?://[^/@]+@([A-Za-z0-9.-]+):([0-9]+)/[^/?#]+([?].*)?$ ]]; then
  fail "DATABASE_URL должен быть полной PostgreSQL-строкой из Supabase Dashboard -> Connect. Пароль со спецсимволами нужно URL-кодировать."
fi

database_host="${BASH_REMATCH[2]}"
database_port="${BASH_REMATCH[3]}"

if [[ "$database_host" != *.supabase.co && "$database_host" != *.supabase.com ]]; then
  fail "DATABASE_URL не похож на подключение Supabase. Используйте строку из Supabase Dashboard -> Connect."
fi

if [[ "$database_port" != "5432" ]]; then
  fail "Для постоянно работающего API используйте Direct connection или Session pooler на порту 5432, не Transaction pooler на 6543."
fi

printf 'Проверяю доступность Supabase...\n'
if ! timeout 10 bash -c "exec 3<>/dev/tcp/${database_host}/${database_port}" 2>/dev/null; then
  fail "NuxtCloud VPS не может подключиться к Supabase (${database_host}:${database_port}). Проверьте строку подключения и Network Restrictions; для IPv4 используйте Session pooler."
fi

available_mb="$(awk '/MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo 2>/dev/null || true)"
if [[ -n "$available_mb" && "$available_mb" -lt 1200 ]]; then
  printf 'Предупреждение: доступно только %s МиБ RAM. Убедитесь, что swap 2 ГБ включён перед сборкой.\n' "$available_mb" >&2
fi

cd "$PROJECT_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull caddy
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build --pull app
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

app_id="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q app)"
[[ -n "$app_id" ]] || fail "Контейнер приложения не был создан."

printf 'Ожидаю успешную проверку приложения'
for _ in {1..60}; do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$app_id")"
  if [[ "$health" == "healthy" ]]; then
    printf '\nTask State работает. Миграции Supabase применены, Caddy автоматически завершит настройку HTTPS.\n'
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    exit 0
  fi
  if [[ "$health" == "unhealthy" || "$health" == "exited" || "$health" == "dead" ]]; then
    printf '\n'
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 app
    fail "Приложение не запустилось. Проверьте строку подключения, пароль и ограничения сети Supabase."
  fi
  printf '.'
  sleep 2
done

printf '\n'
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 app
fail "Превышено время ожидания готовности приложения."
