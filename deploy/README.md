# Деплой Task State: NuxtCloud + Supabase

Production-схема разделена так:

- NuxtCloud VPS запускает один Docker-образ с Express API и собранным React-фронтендом;
- Caddy на том же VPS принимает HTTP/HTTPS-трафик и автоматически обновляет TLS-сертификат;
- PostgreSQL работает в Supabase, а наружу с VPS опубликованы только порты `80/443`;
- миграции автоматически применяются к Supabase перед каждым запуском API.

Для четырёх пользователей достаточно тарифа уровня E1 с 1 vCPU, 2 ГБ RAM и 30 ГБ NVMe. Если доступ к Supabase по российскому маршруту ограничен, выбирайте VPS NuxtCloud в Германии, Финляндии или Нидерландах и ближайший европейский регион Supabase. Нужен отдельный домен: VPS не заменяет регистрацию домена.

## 1. Подготовить Supabase

1. Создайте проект Supabase и сохраните пароль базы данных.
2. Откройте **Dashboard → Connect → Direct**.
3. Выберите **Session pooler** и скопируйте URI на порту `5432`. Этот вариант работает через IPv4 и подходит постоянно запущенному Express API. Не выбирайте Transaction pooler на порту `6543`.
4. Подставьте пароль вместо шаблона в URI. Если пароль содержит специальные символы, URL-кодируйте именно пароль (`@` → `%40`, `#` → `%23`, `%` → `%25`).

Строка должна быть похожа на:

```text
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

Direct connection `db.PROJECT_REF.supabase.co:5432` тоже поддерживается, но обычно требует исходящий IPv6 от VPS. Для предсказуемого первого деплоя используйте Session pooler.

Если в Supabase включены **Network Restrictions**, разрешите публичный IPv4 вашего NuxtCloud VPS. Не добавляйте URI, пароль или `.env.production` в Git.

## 2. Подготовить сервер и DNS

1. Закажите VPS в подходящей локации и выберите Debian 12 или Ubuntu.
2. Создайте у регистратора домена `A`-запись, например `tracker.example.com`, направленную на IPv4 VPS.
3. Дождитесь обновления DNS. До получения HTTPS-сертификата домен уже должен указывать на VPS.

Подключитесь по SSH, установите Git и клонируйте репозиторий:

```bash
ssh root@IP_СЕРВЕРА
apt-get update && apt-get install -y git
git clone https://github.com/MOOVMENT1337/MyTracker.git taskstate
cd taskstate
bash deploy/bootstrap-debian.sh
```

Скрипт устанавливает Docker Engine и Compose, включает Docker, создаёт swap 2 ГБ при отсутствии другого swap и открывает в firewall только SSH/HTTP/HTTPS. Порты Node.js и PostgreSQL не публикуются.

## 3. Первый деплой

Запустите:

```bash
bash deploy/deploy.sh
```

При первом запуске будет создан закрытый от других пользователей файл `.env.production`. Откройте его:

```bash
nano .env.production
```

Замените:

- `APP_DOMAIN` — на свой домен без `https://` и пути;
- `DATABASE_URL` — на URI Session pooler из Supabase.

Оставьте одинарные кавычки вокруг `DATABASE_URL` и `DATABASE_SSL=true`. Затем повторите:

```bash
bash deploy/deploy.sh
```

Скрипт до сборки проверит формат настроек и сетевую доступность Supabase. Затем он соберёт frontend/API, применит миграции, запустит сервисы и дождётся готовности приложения. Подключение к базе проверяется официальным корневым сертификатом Supabase.

Проверка после запуска:

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

Пароль вводится скрыто и не сохраняется в истории терминала. Скрипт нужно выполнить один раз; остальных пользователей создавайте через панель администратора Task State.

## Обновление и диагностика

Перед обновлением убедитесь в Supabase, что для проекта настроены подходящие вашему тарифу резервные копии. Затем:

```bash
git pull --ff-only
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

Остановка приложения без удаления базы Supabase:

```bash
docker compose --env-file .env.production -f compose.production.yaml down
```

## Что уже учтено

- `.env.production` и учётные данные не попадают в Git или Docker-образ;
- приложение подключается к Supabase по TLS и проверяет официальный корневой сертификат;
- для постоянного API используется Session pooler на порту `5432`;
- frontend и API работают с одного HTTPS-домена, поэтому cookies и CORS не требуют ручной настройки;
- таблицы закрыты от браузерных ролей Supabase и доступны приложению только через Express API;
- приложение запускается непривилегированным пользователем с read-only файловой системой;
- миграции используют транзакцию и advisory lock;
- размер Docker-логов ограничен, а Caddy автоматически обслуживает HTTPS.
