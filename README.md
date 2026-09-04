# MyTracker

Трекер задач на React JavaScript, Express и PostgreSQL. Вход — только по email/имени и паролю. Пользователей создаёт администратор и самостоятельно передаёт им реквизиты. Публичной регистрации и внешнего входа нет. По умолчанию используются русский язык и тёмная тема.

## Структура проекта

| Папка | Назначение |
| --- | --- |
| `TrackerWebApp/Client` | React + Vite, действующий frontend |
| `TrackerWebApp/Server` | Express + TypeScript, API, миграции PostgreSQL |
| `html+css+js` | Исходное автономное демо для сравнения верстки |

Запускайте приложение из `Client` и `Server`. Открытие `html+css+js/index.html` запускает старое демо с собственными данными в браузере, а не React-приложение с API.

## Что нужно установить

- Node.js **22.19.0 или новее**, вместе с npm.
- PostgreSQL **17**, с запущенным сервером и доступом администратора БД для первоначальной настройки.
- Для UI-тестов — Microsoft Edge. Для обычного запуска он не обязателен.

Команды ниже приведены для **PowerShell на Windows**. Корень проекта — папка с этим README. Зависимости устанавливаются отдельно в `Client` и `Server`; общего `npm start` в корне нет. Docker для этого способа запуска не нужен.

Проверить Node.js и npm:

```powershell
node --version
npm --version
```

## Первый запуск

### 1. Создать базу PostgreSQL

Подключитесь к локальному PostgreSQL под его администратором. Для стандартной установки Windows:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h 127.0.0.1 -p 5432 -U postgres -d postgres
```

Если PostgreSQL установлен в другой каталог, замените путь; если `psql` добавлен в PATH, можно вызывать просто `psql`. При запросе введите пароль пользователя PostgreSQL `postgres`, заданный при установке.

В открывшейся консоли **psql** выполните по порядку:

```text
CREATE ROLE tracker WITH LOGIN;
\password tracker
CREATE DATABASE tracker OWNER tracker;
\q
```

Команда `\password tracker` попросит задать пароль для подключения приложения к базе. Сохраните его для следующего шага. Пользователь БД `tracker` и администратор веб-приложения — разные учётные записи. Если нужная база и её пользователь уже существуют, используйте их и пропустите создание.

### 2. Настроить и запустить backend

В первом терминале, из корня проекта:

```powershell
cd .\TrackerWebApp\Server
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Откройте `TrackerWebApp/Server/.env` в редакторе. Укажите свой пароль БД вместо `YOUR_DB_PASSWORD`; остальные приведённые значения подходят для локального запуска:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
DATABASE_URL=postgresql://tracker:YOUR_DB_PASSWORD@127.0.0.1:5432/tracker
DATABASE_SSL=false
PUBLIC_URL=http://127.0.0.1:3000
FRONTEND_URL=http://127.0.0.1:5173
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ALLOW_DEMO_SEED=false
```

При другом адресе, порте или имени БД измените `DATABASE_URL`. Специальные символы пароля в URL нужно кодировать: например, `@` как `%40`, `#` как `%23`. Значения `POSTGRES_*` в примере `.env` относятся к Docker Compose; локальный backend использует `DATABASE_URL`.

Примените миграции, оставаясь в `Server`:

```powershell
npm run db:migrate
```

Теперь создайте первого администратора приложения. В том же `.env` заполните:

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_DISPLAY_NAME=Администратор
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
```

Замените email и пароль своими значениями. Пароль администратора должен содержать **от 12 до 128 символов**. Затем выполните:

```powershell
npm run admin:create
```

После успешного создания очистите значение `ADMIN_PASSWORD` в `.env`. Если администратор уже существует, этот шаг повторять не нужно: команда создаёт учётную запись, а не сбрасывает пароль.

Запустите backend:

```powershell
npm run dev
```

Оставьте терминал открытым. API будет доступен на [http://127.0.0.1:3000](http://127.0.0.1:3000). Проверка подключения к БД: [http://127.0.0.1:3000/health/ready](http://127.0.0.1:3000/health/ready) должна вернуть `{"status":"ok","database":"up"}`.

### 3. Запустить frontend

Откройте **второй терминал** в корне проекта:

```powershell
cd .\TrackerWebApp\Client
npm ci
npm run dev
```

Откройте [http://127.0.0.1:5173](http://127.0.0.1:5173) и войдите с email и паролем, заданными при создании администратора.

При стандартных портах `.env` фронтенду не нужен: Vite отправляет `/api` на `http://127.0.0.1:3000`. Если backend работает по другому адресу, создайте `Client/.env` по `Client/.env.example`, измените `API_PROXY_TARGET` и перезапустите Vite.

После такой инициализации новой базы в трекере будет **только администратор**, без очередей/досок и задач. Для создания сотрудников откройте «Панель администратора» → «Создать пользователя». Данные сохраняются в PostgreSQL между запусками.

## Последующие запуски и остановка

Убедитесь, что PostgreSQL запущен. В двух терминалах из корня проекта:

**Терминал 1 — backend:**

```powershell
cd .\TrackerWebApp\Server
npm run dev
```

**Терминал 2 — frontend:**

```powershell
cd .\TrackerWebApp\Client
npm run dev
```

Откройте `http://127.0.0.1:5173`. Остановка — `Ctrl+C` в каждом терминале; данные останутся в базе. Повторно создавать базу или администратора не нужно. После обновления кода установите зависимости через `npm ci` в обеих папках и примените `npm run db:migrate` в `Server` перед запуском.

## Запуск собранной версии

Для локальной работы без Vite и автоматической перезагрузки остановите процессы `npm run dev`. Из корня проекта:

```powershell
cd .\TrackerWebApp\Client
npm ci
npm run build
cd ..\Server
npm ci
npm run db:migrate
npm run build
npm start
```

Используются ранее настроенные `Server/.env`, база и администратор. Откройте [http://127.0.0.1:3000](http://127.0.0.1:3000): backend раздаёт `Client/dist` и API с одного адреса. Отдельно запускать frontend не нужно. После изменения frontend нужно повторить его сборку; после изменения backend — его сборку и перезапуск.

Для размещения в интернете настройте HTTPS, `NODE_ENV=production`, `PUBLIC_URL`, `FRONTEND_URL` и `CORS_ORIGINS` под свой домен. Подробности и вариант Docker Compose — в [README backend](TrackerWebApp/Server/README.md). Текущий Docker-образ собирает только API, поэтому frontend для Docker размещается отдельно.

## Очистка существующего трекера

**Это удаление данных, а не обязательный шаг запуска.** Команда удаляет все очереди/доски, задачи, комментарии, журнал и пользователей, кроме выбранного администратора. Его логин, пароль и права сохраняются; тема становится тёмной, язык — русским.

Проверьте, что `Server/.env` указывает на нужную базу. Из `TrackerWebApp/Server`:

```powershell
npm run db:migrate
npm run db:reset
```

Если администраторов несколько, перед очисткой укажите ID сохраняемого в переменной `KEEP_ADMIN_ID`. Подробности — в [инструкции очистки](TrackerWebApp/Server/README.md#очистка-существующего-трекера). При запуске приложения очистка автоматически не выполняется. Обычные миграции и seed также не удаляют существующие данные. Данные старого `html+css+js` в localStorage этой командой не изменяются.

## Проверки

Из `TrackerWebApp/Server`:

```powershell
npm run typecheck
npm test
npm run build
```

Из `TrackerWebApp/Client`, после установки зависимостей обоих проектов:

```powershell
npm run build
npm test
npm run test:empty
```

UI-тесты сами поднимают API на порту **4173**, который должен быть свободен. Нужны Edge и PostgreSQL. Тесты используют отдельную временную базу; рабочий `DATABASE_URL` для тестов не используется. UI-отчёты: `Client/playwright-report/index.html` и `Client/playwright-report/empty/index.html`.

## Если не запускается

| Симптом | Что проверить |
| --- | --- |
| `npm` или `node` не найден | Установите Node.js и откройте новый терминал; проверьте версию |
| PowerShell блокирует `npm.ps1` | Используйте `npm.cmd` вместо `npm`, например `npm.cmd run dev` |
| `Invalid environment: DATABASE_URL` | Создайте `Server/.env`, заполните URL и запускайте backend из папки `Server` |
| `ECONNREFUSED` или ошибка пароля PostgreSQL | Проверьте запуск PostgreSQL, адрес, порт, имя пользователя и пароль в `DATABASE_URL` |
| Таблица `schema_migrations` или `users` не существует | Выполните `npm run db:migrate` в `Server` с тем же `.env` |
| `EADDRINUSE` или `Port 5173 is already in use` | Остановите предыдущий экземпляр; Vite не переключает порт автоматически |
| Frontend открыт, но не удаётся войти/связаться с сервером | Проверьте `/health/ready` backend, `API_PROXY_TARGET` и запущенный backend |
| `ORIGIN_NOT_ALLOWED` | Укажите точный адрес frontend, включая порт, в `CORS_ORIGINS` и перезапустите backend |
| `Invalid administrator settings` | Заполните `ADMIN_EMAIL`, `ADMIN_DISPLAY_NAME` и пароль длиной 12–128 символов перед `admin:create` |
| Не подходит `admin123` | Этот пароль создаёт только отдельная команда демо-seed; при `admin:create` используйте свой пароль |
| На порту 3000 нет страницы входа | Сначала соберите `Client` и перезапустите backend либо откройте Vite на порту 5173 |
| Видны старые демозадачи | Проверьте, что открыт React на 5173/3000, а не `html+css+js/index.html`; для уже заполненной БД нужна явная очистка |

Подробная документация: [frontend](TrackerWebApp/Client/README.md), [backend и API](TrackerWebApp/Server/README.md), [отчёт о переносе](TrackerWebApp/Client/MIGRATION_REPORT.md).
