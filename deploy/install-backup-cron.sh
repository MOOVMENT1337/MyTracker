#!/usr/bin/env bash
set -Eeuo pipefail

fail() {
  printf 'Ошибка: %s\n' "$1" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "Запустите через sudo: sudo bash deploy/install-backup-cron.sh"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
[[ -f "$PROJECT_DIR/.env.production" ]] || fail "Нет .env.production. Сначала выполните deploy/deploy.sh."

mkdir -p "$PROJECT_DIR/backups"
chmod 700 "$PROJECT_DIR/backups"

printf -v quoted_project '%q' "$PROJECT_DIR"
cron_file=/etc/cron.d/mytracker-backup
{
  printf 'SHELL=/bin/bash\n'
  printf 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n'
  printf '17 3 * * * root cd %s && bash deploy/backup.sh >> backups/backup.log 2>&1\n' "$quoted_project"
} >"$cron_file"
chmod 0644 "$cron_file"

systemctl enable --now cron
printf 'Ежедневный backup установлен: %s (03:17 по времени сервера).\n' "$cron_file"
