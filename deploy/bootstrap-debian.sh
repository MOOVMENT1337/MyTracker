#!/usr/bin/env bash
set -Eeuo pipefail

fail() {
  printf 'Ошибка: %s\n' "$1" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "Запустите скрипт через sudo: sudo bash deploy/bootstrap-debian.sh"
[[ -r /etc/os-release ]] || fail "Не удалось определить Linux-дистрибутив."

# shellcheck disable=SC1091
. /etc/os-release
case "${ID:-}" in
  debian | ubuntu) ;;
  *) fail "Поддерживаются только Debian и Ubuntu." ;;
esac

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates cron curl git nano ufw

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  architecture="$(dpkg --print-architecture)"
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/%s %s stable\n' \
    "$architecture" "$ID" "$VERSION_CODENAME" >/etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

systemctl enable --now docker
systemctl enable --now cron
docker compose version >/dev/null 2>&1 || fail "Docker установлен без Compose plugin."

if [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != "root" ]]; then
  usermod -aG docker "$SUDO_USER"
fi

if [[ -z "$(swapon --show=NAME --noheadings)" ]]; then
  if [[ -e /swapfile ]]; then
    printf 'Предупреждение: /swapfile уже существует, но не активен; он оставлен без изменений.\n' >&2
  else
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -Fq '/swapfile none swap sw 0 0' /etc/fstab \
      || printf '/swapfile none swap sw 0 0\n' >>/etc/fstab
  fi
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

printf '\nСервер подготовлен: Docker запущен, firewall включён, swap проверен.\n'
if [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != "root" ]]; then
  printf 'Переподключитесь по SSH, чтобы членство в группе docker вступило в силу.\n'
fi
