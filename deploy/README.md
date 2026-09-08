# Деплой MyTracker на NuxtCloud

Production-пакет размещает весь проект на одном NuxtCloud VPS:

- Caddy принимает HTTP/HTTPS-трафик и автоматически обновляет TLS-сертификат;
- Express обслуживает `/api` и собранное React-приложение;
- PostgreSQL хранит данные в отдельном постоянном Docker volume;
- наружу открыты только `80/443`, а API и БД доступны лишь во внутренней Docker-сети;
- миграции автоматически выполняются перед каждым запуском API.

Рекомендуемая конфигурация — MSK-E1: 1 vCPU, 2 ГБ RAM и 30 ГБ NVMe. Нужен отдельный домен: NuxtCloud не выдаёт его вместе с VPS.

## 1. Сервер и DNS

1. Закажите MSK-E1 и выберите Debian 12.
2. Создайте у регистратора домена `A`-запись для адреса наподобие `tracker.example.com`, направленную на IPv4 сервера.
3. Дождитесь обновления DNS. Проверить адрес можно командой `nslookup tracker.example.com` на своём компьютере.

До получения HTTPS-сертификата домен должен уже указывать на VPS. Один IPv4 достаточен.

## 2. Однократная подготовка VPS

Подключитесь по SSH с данными из панели NuxtCloud:

```bash
ssh root@IP_СЕРВЕРА
```

Установите Git, клонируйте репозиторий и выполните подготовительный скрипт:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/MOOVMENT1337/MyTracker.git
cd MyTracker
bash deploy/bootstrap-debian.sh
```

Скрипт устанавливает Docker Engine и Compose из официального репозитория Docker, включает их автозапуск, создаёт swap 2 ГБ при отсутствии другого swap и открывает в UFW только SSH/HTTP/HTTPS. Порты `3000` и `5432` не публикуются.

## 3. Первый деплой

Запустите:

```bash
bash deploy/deploy.sh
```

При первом запуске скрипт создаст `.env.production`, автоматически сгенерирует пароль PostgreSQL и остановится. Откройте файл:

```bash
nano .env.production
```

Замените только `tracker.example.com` в `APP_DOMAIN` своим доменом. Имена и пароль БД после первого запуска менять нельзя без отдельной смены учётных данных PostgreSQL.

Повторите деплой:

```bash
bash deploy/deploy.sh
```

Скрипт проверит настройки, создаст защищённый постоянный том, загрузит PostgreSQL и Caddy, соберёт frontend/API, применит миграции и дождётся готовности приложения. Затем откройте:

```text
https://ВАШ_ДОМЕН/health/ready
```

Исправный сервис вернёт:

```json
{ "status": "ok", "database": "up" }
```

## 4. Первый администратор

```bash
bash deploy/admin.sh
```

Пароль вводится скрыто и не сохраняется в истории терминала. Скрипт нужно выполнить один раз; остальных пользователей создавайте через панель администратора MyTracker.

## 5. Резервные копии

Создать и проверить локальную резервную копию:

```bash
bash deploy/backup.sh
```

Файлы сохраняются в `backups/`, права доступа ограничиваются, старые копии удаляются через `BACKUP_RETENTION_DAYS` дней. Установить ежедневный запуск в 03:17 по времени сервера:

```bash
bash deploy/install-backup-cron.sh
```

Копии на том же VPS не защищают от потери сервера. Регулярно выгружайте `backups/` на свой компьютер или в отдельное S3-хранилище.

## Обновление и диагностика

Перед production-обновлением создавайте копию:

```bash
git pull --ff-only
bash deploy/backup.sh
bash deploy/deploy.sh
```

Статус и логи:

```bash
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs -f --tail=200
```

Перезапуск без пересборки:

```bash
docker compose --env-file .env.production -f compose.production.yaml restart
```

Остановка без удаления данных:

```bash
docker compose --env-file .env.production -f compose.production.yaml down
```

Том PostgreSQL имеет внешнее имя `mytracker_postgres_data`, поэтому Compose не удаляет его даже при `down -v`. Не удаляйте этот том вручную. `down -v` всё ещё удалит локальное состояние сертификатов Caddy.

## Что уже защищено конфигурацией

- `.env.production`, база, бэкапы и учётные данные не попадают в Docker-образ или Git.
- Приложение запускается непривилегированным пользователем с read-only файловой системой.
- PostgreSQL и Node.js не публикуют порты на хост.
- API ждёт готовности БД, а миграции используют транзакцию и advisory lock.
- Размер Docker-логов ограничен, чтобы они не заполнили диск.
- Caddy автоматически обслуживает HTTPS; `TRUST_PROXY_HOPS=1` соответствует одному reverse proxy.
