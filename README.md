# GREEN-API Chat — WhatsApp, Telegram и MAX (тестовое задание)

![CI](https://github.com/AiStockSearch/green-api-max-chat/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/AiStockSearch/green-api-max-chat/actions/workflows/deploy.yml/badge.svg)
![Pages](https://github.com/AiStockSearch/green-api-max-chat/actions/workflows/deploy-pages.yml/badge.svg)

🌐 **Онлайн-демо:** [инстансы (`?demo=dashboard`)](https://aistocksearch.github.io/green-api-max-chat/?demo=dashboard) · [чат (`?demo=active`)](https://aistocksearch.github.io/green-api-max-chat/?demo=active) · [приложение](https://aistocksearch.github.io/green-api-max-chat/)

📘 **Пошаговое руководство:** [https://aistocksearch.github.io/green-api-max-chat/guide.html](https://aistocksearch.github.io/green-api-max-chat/guide.html) (исходник: [docs/guide.html](docs/guide.html))

Веб-приложение на **React + TypeScript (Vite)** для отправки и приёма **текстовых** сообщений в **WhatsApp, Telegram и MAX** через [GREEN-API](https://green-api.com). Можно подключить **несколько инстансов сразу**: экран «Инстансы» со статусами, общий список чатов с иконками мессенджеров, фильтр по инстансу и параллельный опрос очередей. Приложение устанавливается как **PWA** (компьютер, Android, iOS) и открывается без сети. Интерфейс вдохновлён [web.max.ru](https://web.max.ru): список чатов слева, переписка справа.

![Экран «Инстансы»](docs/screenshots/08-instances-dashboard.png)

### Разделы руководства

1. [Обзор: WhatsApp / Telegram / MAX, несколько инстансов, PWA](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-1)
2. [Получение ключей в консоли GREEN-API](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-2)
3. [Добавление инстанса: карточки мессенджеров, «Режим партнёра»](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-3)
4. [Экран «Инстансы»: статусы, «Обновить статусы», «Все чаты»](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-4)
5. [Авторизация: QR и вход по коду](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-5)
6. [Чаты: общий список, фильтр, новый чат с выбором инстанса, отправка и приём](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-6)
7. [«Выйти из инстанса» и «Убрать из приложения»](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-7)
8. [Установка как приложение (PWA): компьютер, Android, iOS; офлайн; обновления](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-8)
9. [Запуск локально и в Docker, демо-режимы](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-9)
10. [Ошибки и состояния](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-10)
11. [Тесты](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-11)
12. [CI/CD и GitHub Pages](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-12)
13. [FAQ](https://aistocksearch.github.io/green-api-max-chat/guide.html#step-13)

## Стек

- React 19, TypeScript, Vite
- CSS Modules (без тяжёлых UI-библиотек)
- Vitest — unit-тесты API-слоя
- ESLint + Prettier

## Клонирование

```bash
git clone https://github.com/AiStockSearch/green-api-max-chat.git
cd green-api-max-chat
```

## Локальный запуск

```bash
npm install
npm run dev
```

Приложение откроется на `http://127.0.0.1:43123`.

## Запуск в Docker

Рекомендуемый **production**-вариант: статика + **nginx** с same-origin прокси `/green-api-proxy/*` (обход CORS без токенов в образе).

```bash
docker compose up --build
# или
docker build -t green-api-max-chat:local .
docker run --rm -p 8080:8080 green-api-max-chat:local
```

Откройте `http://127.0.0.1:8080`, введите ключи инстанса в UI (как при локальном dev). Healthcheck: `GET /health`.

Сборка включает `VITE_GREEN_API_SAME_ORIGIN_PROXY=true` — клиент ходит на API через nginx, allowlist только хосты `*.api.greenapi.com`, `*.api.green-api.com`, `api.green-api.com`, `api.greenapi.com`.

## Переменные окружения (сборка / CI)

| Переменная | Где | Назначение |
|------------|-----|------------|
| `VITE_GREEN_API_SAME_ORIGIN_PROXY` | `.env` / `docker build --build-arg` | `true` — в prod-сборке использовать `/green-api-proxy` (Docker/nginx) |
| `GITHUB_PAGES` | CI / локально | `true` — base path для GitHub Pages |
| `CYPRESS` | E2E | `1` — strict port Vite для Cypress |

Секреты инстанса (**не** в образ и **не** в git):

- Локально Cypress: `cypress.env.json` (см. `cypress.env.example.json`)
- GitHub Actions live E2E (опционально): `GREEN_API_ID_INSTANCE`, `GREEN_API_TOKEN`, `GREEN_API_URL`, опционально `GREEN_API_CHAT_ID` и `GREEN_API_MESSENGER` (`max` | `whatsapp`, variable или secret)

> **Безопасность:** `apiTokenInstance` и `partnerToken` вводятся только в браузере или в CI-секретах. В Docker-образ попадает лишь собранный статический `dist/` — **токены в image не запекаются**.

## CI/CD

Workflows в `.github/workflows/`:

| Workflow | Триггер | Что делает |
|----------|---------|------------|
| **ci.yml** | push/PR → `main` | `npm ci`, lint, Vitest, build, `docker build`; Cypress **03** (демо, без секретов); live Cypress **01–05** — только если заданы секреты `GREEN_API_*` |
| **deploy.yml** | push `main`, теги `v*.*.*`, `workflow_dispatch` | Сборка и push образа в **GHCR** (`ghcr.io/aistocksearch/green-api-max-chat`) |
| **deploy-pages.yml** | push `main`, `workflow_dispatch` | Демо-сборка SPA (`GITHUB_PAGES=true`, base `/green-api-max-chat/`) + `docs/guide.html` и `docs/screenshots` → **GitHub Pages** |

**Статический хостинг** (Vercel, GitHub Pages, S3): CORS к GREEN-API из браузера может блокироваться — нужен свой backend-прокси или используйте **Docker-образ** как полное решение.

**Vercel:** `vercel.json` — SPA rewrite; без серверного прокси API-запросы могут не пройти CORS.

Проверки перед сдачей:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

### Cypress (E2E с вашим инстансом)

1. Скопируйте `cypress.env.example.json` → `cypress.env.json` (файл в `.gitignore`).
2. Укажите `idInstance`, `apiTokenInstance`, `apiUrl` **как в кабинете** (например `https://7107.api.greenapi.com`) и `messenger`: `max` (по умолчанию) или `whatsapp`. Переменная окружения `GREEN_API_MESSENGER=max|whatsapp` переопределяет значение из файла. В `npm run dev` прокси включается автоматически.
3. Запуск: `npm run test:e2e` (поднимает Vite на порту **43128** и гоняет Cypress).

Сценарии: live `getStateInstance`, UI-вход → экран QR, демо register/partner/instance-qr, **05-live-send-receive** (SendMessage API+UI, ReceiveNotification/delete, опционально входящее в UI).

Для **05** нужны `chatId` (номер, ID чата MAX или `79990000000@c.us` для WhatsApp) и **`authorized`** инстанс. Входящее в UI: во время прогона (~2 мин) отправьте с MAX на инстанс текст `e2e-in-…` из лога Cypress, либо задайте `incomingMarker` и `requireIncoming: true`.

## Учётные данные и «аккаунт» в приложении

У GREEN-API **нет публичного API** регистрации/логина конечного пользователя в личный кабинет. Регистрация и вход на сайте — [console.green-api.com](https://console.green-api.com).

В приложении два режима (вкладки на экране **«Вход»**: «По ключам инстанса» и «Режим партнёра»):

| Режим | Что нужно | API |
|--------|-----------|-----|
| **Инстанс** | `idInstance`, `apiTokenInstance`, `apiUrl` | GetStateInstance → чат или экран QR |
| **Партнёр** | `partnerToken`, `partnerApiUrl` (из кабинета / support) | [Partner API](https://green-api.com/docs/partners/): getInstances, createInstance, deleteInstanceAccount → авторизация инстанса → чат |

### Инстанс MAX

1. Создайте инстанс MAX в кабинете.
2. Скопируйте **idInstance**, **apiTokenInstance**, **apiUrl**.
3. Войдите в приложении на вкладке «По ключам инстанса». При `notAuthorized` откроется шаг **QR** (метод `GET …/qr/…`, страница [qr.green-api.com](https://qr.green-api.com)) и опрос **getStateInstance**. При `pendingPassword` — **sendAuthorizationPassword** (2FA MAX).

### Partner API

Ключ `partnerToken` (вид `gac.…`) выдаётся через [support@green-api.com](mailto:support@green-api.com). Формат запросов: `{{partnerApiUrl}}/partner/{method}/{{partnerToken}}`.

> **Безопасность:** хранение `partnerToken` в browser-only SPA — только для **демо/тестов**. В продакшене Partner API и секреты инстанса должны идти через **backend-прокси**, не из фронтенда.

### Сохранение ключей

- По умолчанию ключи живут в **sessionStorage** (до закрытия вкладки).
- Чекбокс **«Запомнить»** сохраняет в **localStorage** (явное согласие).
- Формы используют `autocomplete="username"` / `current-password` для менеджера паролей; при поддержке браузера вызывается Credential Management API (`PasswordCredential`).

> **Не коммитьте** реальные токены в репозиторий.

### Что есть в документации MAX (проверено)

| Метод | Статус для MAX |
|--------|----------------|
| getStateInstance | ✅ |
| QR (`/qr/`, qr.green-api.com) | ✅ |
| sendAuthorizationPassword (2FA после QR) | ✅ |
| getAuthorizationCode / StartAuthorization / SendAuthorizationCode | ❌ не поддерживаются MAX (WhatsApp OTP; см. [новость интеграции MAX](https://green-api.com/articles/en/news/04-02-2026-release-max-integration/)); StartAuthorization/SendAuthorizationCode используются в режиме Telegram |
| Partner: getInstances, createInstance, deleteInstanceAccount | ✅ (общие методы партнёра; тип мессенджера в ответе `typeInstance`) |

Параметра «создать только MAX» в теле `createInstance` в документации **нет** — тип инстанса определяется на стороне GREEN-API/кабинета.

## Настройка приёма входящих сообщений

Для опроса очереди через HTTP API (методы [ReceiveNotification](https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/) и [DeleteNotification](https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/)):

1. В настройках инстанса **очистите поле webhookUrl** (если задан свой webhook, HTTP API-очередь недоступна).
2. Включите получение уведомлений о **входящих сообщениях** (в кабинете или через SetSettings).

Приложение в фоне опрашивает `receiveNotification` (таймаут 5 с), показывает текстовые ответы в соответствующем чате и подтверждает обработку через `deleteNotification(receiptId)`. Прочие типы webhook игнорируются, но уведомление всё равно удаляется из очереди.

## Сценарий использования

1. Войти с `idInstance`, `apiTokenInstance` и при необходимости скорректировать `apiUrl`.
2. Создать чат: номер телефона (`79991234567`) или готовый `chatId` (для MAX — числовой ID личного чата, либо `79001234567@c.us` по документации SendMessage).
3. Отправить текст (**SendMessage**). Enter — отправка, Shift+Enter — новая строка.
4. Ответ собеседника в MAX (WhatsApp, Telegram) появится в чате после опроса очереди.

## WhatsApp (фолбэк по ТЗ)

ТЗ разрешает WhatsApp или Telegram, если MAX недоступен. На экране входа выберите **Мессенджер → WhatsApp**; выбор сохраняется вместе с ключами (`messenger` в sessionStorage/localStorage, старые сессии без поля считаются MAX).

Методы GREEN-API те же, формат URL унифицирован: `{{apiUrl}}/waInstance{{idInstance}}/{method}/{{apiTokenInstance}}`. Отличия режима WhatsApp (`src/api/whatsapp.ts`, `src/api/messengerAdapter.ts`):

| Что | MAX | WhatsApp |
|-----|-----|----------|
| chatId | номер → `…@c.us` или числовой ID чата | только `{номер}@c.us`, группа `…@g.us`, `…@lid` |
| Новый чат | — | **CheckWhatsapp**: проверка аккаунта; если API вернул `…@lid`, он сохраняется как алиас чата, и ответы с lid попадают в тот же диалог |
| Уведомления | `incomingMessageReceived` + `textMessage` | также `extendedTextMessage`/`quotedMessage` (`extendedTextMessageData.text`) и исходящие `outgoingMessageReceived` (с телефона) / `outgoingAPIMessageReceived` (через API) |
| QR | `qr.green-api.com/waInstance{id}/{token}/v3`, 2FA `sendAuthorizationPassword` | `qr.green-api.com/waInstance{id}/{token}`; при ошибке QR «You need to make log out» — кнопка **Logout** и новый QR |

Прокси (Vite в dev и nginx в Docker) пропускает те же хосты: `*.api.greenapi.com`, `*.api.green-api.com`, `api.green-api.com`, `api.greenapi.com`.

## Telegram (фолбэк по ТЗ)

На экране входа выберите **Мессенджер → Telegram** (инстанс GREEN-API для Telegram, idInstance обычно `4100…`). Код режима — `src/api/telegram.ts`, `src/api/messengers/telegram.ts`.

| Что | Telegram |
|-----|----------|
| chatId | только цифры → ID личного чата (`10000000`); `-100…` → группа; номер с `+`/скобками или `79990000000@c.us` → `{номер}@c.us` |
| Авторизация | QR на `qr.green-api.com/waInstance{id}/{token}/telegram` («Настройки → Устройства → Подключить устройство»); облачный пароль (2FA) — `sendAuthorizationPassword`; **вход по коду**: `startAuthorization {phoneNumber}` → код из Telegram → `sendAuthorizationCode {code[, password]}` |
| Уведомления | `incomingMessageReceived` / `outgoingAPIMessageReceived` с `textMessage`; если в `senderData` есть `senderPhoneNumber`, ответ на чат, созданный по номеру, попадает в тот же диалог (числовой chatId сохраняется как алиас) |
| Ограничения | Только текст; Telegram-инстанс в тестовом аккаунте не авторизован, поэтому живого прогона Telegram не было — логика покрыта unit-тестами по документации GREEN-API |

## Несколько инстансов

- **Экран «Инстансы»** (как в консоли GREEN-API): карточка на каждый подключённый инстанс — иконка мессенджера (WhatsApp / Telegram / MAX), название, idInstance, статус `getStateInstance` (Авторизован / Неавторизован / …), кнопки «Открыть», «QR / авторизация», «Обновить статусы».
- **«Добавить инстанс»** — выбор WhatsApp / Telegram / MAX → форма ключей (необязательное «Название»). Профиль хранится по id `messenger:idInstance`: с «Запомнить» — в localStorage, без — в sessionStorage (`src/api/profilesStore.ts`). Старая одиночная сессия мигрирует автоматически.
- **«Выйти из инстанса»** — после подтверждения в модалке вызывается метод GREEN-API **Logout**: аккаунт мессенджера отвязывается, статус становится `notAuthorized`, приложение предлагает **«Авторизовать по QR»**. Профиль остаётся в приложении. Доступно на карточке и иконкой выхода в чате (при фильтре по инстансу).
- **«Убрать из приложения»** — после подтверждения удаляет профиль и его локальные чаты/сообщения **без запросов к API** (инстанс в GREEN-API не трогается).
- **«Все чаты»** — единый список чатов всех инстансов с иконкой мессенджера; переключатель над списком фильтрует по инстансу. Отправка идёт через инстанс, которому принадлежит чат; новый чат в режиме «Все» создаётся с выбором инстанса.
- **Параллельный опрос**: для каждого авторизованного инстанса свой цикл `receiveNotification`/`deleteNotification` (`InstancePoller`), входящие раскладываются по чатам своего инстанса (`src/utils/inbox.ts`).
- Демо: [`?demo=dashboard`](https://aistocksearch.github.io/green-api-max-chat/?demo=dashboard).

## Установка как приложение (PWA)

Приложение — устанавливаемое PWA: манифест `public/manifest.webmanifest` («GREEN-API Chat», `lang: ru`, `display: standalone`, `theme_color #0077ff`, `background_color #f7f9fc`, иконки 192/512 + maskable, apple-touch-icon 180) и Service Worker `src/pwa/sw.ts` → `dist/sw.js`. Пути в манифесте относительные, SW регистрируется от `import.meta.env.BASE_URL` — одна и та же сборка работает и на GitHub Pages (`/green-api-max-chat/`), и в Docker (`/`).

**Как установить**

- **Chrome / Edge (Windows, macOS, Linux):** откройте приложение → значок «Установить» в адресной строке или всплывающее «Установить GREEN-API Chat как приложение?» → «Установить». Приложение откроется в отдельном окне и появится в меню «Пуск» / Launchpad.
- **Android (Chrome):** меню ⋮ → «Установить приложение» (или «Добавить на главный экран»), либо кнопка «Установить» во всплывающем окне приложения.
- **iOS / iPadOS (Safari):** кнопка «Поделиться» → «На экран „Домой“» → «Добавить». Запуск с иконки — без адресной строки (`apple-mobile-web-app-capable`). Всплывающего предложения установки в iOS нет — это ограничение Safari.

**Что кэшируется.** Только app shell: `index.html`, хешированные JS/CSS, манифест и иконки (precache со списком файлов, который плагин `gac-pwa` в `vite.config.ts` подставляет при сборке) и шрифты Google Fonts. Запросы к GREEN-API — **только сеть**: прямые хосты `*.green-api.com` / `*.greenapi.com`, прокси `/green-api-proxy/…` и пути `/waInstance…/`, `/partner/…` Service Worker не перехватывает, поэтому ответы API и URL с `apiTokenInstance` в Cache Storage не попадают (`src/pwa/swPolicy.ts`, unit-тесты). Ключи по-прежнему лежат только в sessionStorage/localStorage.

**Офлайн.** Приложение открывается из кэша, сохранённые чаты видны, сверху — плашка «Нет сети · отправка и приём возобновятся после подключения», в шапке чата — «Нет сети». `navigator.onLine` ненадёжен, поэтому после сетевой ошибки запроса приложение дополнительно проверяет связь лёгким `HEAD sw.js` (`src/pwa/networkStatus.ts`).

**Обновления.** Новая версия SW ставится в фоне и ждёт; внизу появляется «Доступна новая версия — Обновить». По кнопке SW активируется (`SKIP_WAITING`) и страница перезагружается один раз. Проверка обновлений — при каждом открытии и раз в час.

**Заголовки.** nginx (Docker) отдаёт `sw.js`, `manifest.webmanifest` и `index.html` с `Cache-Control: no-cache`, `/assets/*` — `immutable`; CI проверяет заголовки и PWA в собранном контейнере. На GitHub Pages заголовки не настраиваются, но SW регистрируется с `updateViaCache: 'none'`, поэтому обновления не залипают.

**Проверка:** `node scripts/verify-pwa.mjs <url>` (headless Chrome + CDP): манифест, `Page.getInstallabilityErrors`, регистрация SW, содержимое Cache Storage (нет GREEN-API/токенов), офлайн-запуск и плашка «Нет сети». Иконки пересобираются из `public/icons/app-icon.svg`: `node scripts/generate-pwa-icons.mjs`.

## Ограничения

- Только **текст**; медиа и статусы не отображаются.
- Без Docker запросы идут из браузера напрямую; **CORS** может блокировать API. В **dev** — прокси Vite; в **production** — Docker/nginx (`/green-api-proxy`) или свой backend.
- Один опрос на инстанс во вкладке; при нескольких вкладках с одним инстансом возможны конфликты очереди.
- Состояние чатов хранится локально в браузере.

## Деплой

- **Docker / GHCR** (рекомендуется): `deploy.yml` → образ с nginx + CORS-прокси; `docker pull ghcr.io/aistocksearch/green-api-max-chat:main`.
- **Vercel**: `vercel.json` (SPA rewrite). Build: `npm run build`, output: `dist` — **без** same-origin прокси, возможен CORS.
- **GitHub Pages**: `deploy-pages.yml` (на каждый push в `main`) → https://aistocksearch.github.io/green-api-max-chat/ (демо: `?demo=active`, руководство: `guide.html`). Без прокси — live-запросы к API могут упираться в CORS.

### Ссылка на деплой

- Демо и PWA: https://aistocksearch.github.io/green-api-max-chat/ (`?demo=dashboard`, `?demo=active`)
- Руководство: https://aistocksearch.github.io/green-api-max-chat/guide.html
- Docker-образ: `ghcr.io/aistocksearch/green-api-max-chat:main`

### Скриншоты

Все кадры сняты в демо-режиме (без реальных ключей) в headless Chrome. Подробные пояснения — в [руководстве](https://aistocksearch.github.io/green-api-max-chat/guide.html).

| Экран | Файл |
|-------|------|
| Вход: карточки мессенджеров | [01-login.png](docs/screenshots/01-login.png) |
| «Добавить инстанс» (← Инстансы) | [02-add-instance.png](docs/screenshots/02-add-instance.png) |
| Вход на мобильном (390 px) | [03-add-instance-mobile.png](docs/screenshots/03-add-instance-mobile.png) |
| Вкладка «Режим партнёра» | [04-partner-tab.png](docs/screenshots/04-partner-tab.png) |
| Регистрация | [05-register.png](docs/screenshots/05-register.png) |
| Инстансы партнёра | [06-partner-instances.png](docs/screenshots/06-partner-instances.png) |
| Partner: createInstance | [07-create-instance.png](docs/screenshots/07-create-instance.png) |
| Экран «Инстансы» | [08-instances-dashboard.png](docs/screenshots/08-instances-dashboard.png) |
| «Инстансы» на мобильном | [09-instances-dashboard-mobile.png](docs/screenshots/09-instances-dashboard-mobile.png) |
| Авторизация по QR | [10-instance-qr-auth.png](docs/screenshots/10-instance-qr-auth.png) |
| Telegram: QR и вход по коду | [11-telegram-code-auth.png](docs/screenshots/11-telegram-code-auth.png) |
| «Все чаты»: общий список | [12-all-chats.png](docs/screenshots/12-all-chats.png) |
| Фильтр по инстансу | [13-chat-filter.png](docs/screenshots/13-chat-filter.png) |
| «Новый чат» с выбором инстанса | [14-new-chat-modal.png](docs/screenshots/14-new-chat-modal.png) |
| Активный чат | [15-active-chat.png](docs/screenshots/15-active-chat.png) |
| Пустое состояние | [16-empty-state.png](docs/screenshots/16-empty-state.png) |
| Мобильный список чатов | [17-mobile-chat-list.png](docs/screenshots/17-mobile-chat-list.png) |
| Мобильный чат | [18-mobile-active-chat.png](docs/screenshots/18-mobile-active-chat.png) |
| «Выйти из инстанса?» (Logout) | [19-instance-logout-confirm.png](docs/screenshots/19-instance-logout-confirm.png) |
| Logout из шапки чата | [20-chat-logout-confirm.png](docs/screenshots/20-chat-logout-confirm.png) |
| После Logout → «Авторизовать по QR» | [21-after-logout.png](docs/screenshots/21-after-logout.png) |
| «Убрать из приложения?» | [22-remove-confirm.png](docs/screenshots/22-remove-confirm.png) |
| Инстанс не авторизован | [23-instance-unauthorized.png](docs/screenshots/23-instance-unauthorized.png) |
| Сеть / CORS, «Повторить» | [24-network-error.png](docs/screenshots/24-network-error.png) |
| Загрузка | [25-loading.png](docs/screenshots/25-loading.png) |
| Неверные ключи | [26-login-error.png](docs/screenshots/26-login-error.png) |
| PWA: предложение установки | [27-pwa-install-prompt.png](docs/screenshots/27-pwa-install-prompt.png) |
| PWA: отдельное окно | [28-pwa-standalone.png](docs/screenshots/28-pwa-standalone.png) |
| PWA: «Нет сети» | [29-pwa-offline.png](docs/screenshots/29-pwa-offline.png) |
| PWA: «Доступна новая версия — Обновить» | [30-pwa-update.png](docs/screenshots/30-pwa-update.png) |

Демо-режим (без реальных токенов), query-параметр `demo`:

| `demo=` | Что показывает |
|---------|----------------|
| `dashboard` | Экран «Инстансы»: WhatsApp, Telegram, MAX; «Все чаты», Logout, «Убрать» |
| `active`, `empty`, `modal` | Диалог, пустое состояние, модалка «Новый чат» |
| `instance-qr` | Экран авторизации QR / getStateInstance |
| `error` | Экран входа с баннером и inline-ошибками полей |
| `unauthorized` | Карточка «Инстанс не авторизован», «Проверить снова» |
| `network` | Баннер CORS/сети, неотправленное сообщение с «Повторить» |
| `loading` | Скелетоны списка и переписки |
| `logout` | Подтверждение «Выйти из инстанса» в чате |
| `register`, `partner`, `create-instance` | Регистрация, инстансы партнёра, форма createInstance |
| `mobile-list`, `mobile-chat` | Мобильная вёрстка (≤768px) |

Переснять скриншоты: `npm run screenshots` (сборка + `scripts/capture-screenshots.mjs` для 01–26 и `scripts/capture-pwa-screenshots.mjs` для 27, 29, 30; кадр 28 — окно `chrome --app=…/?demo=active`).

## Структура проекта

```
docker/           — nginx.conf (SPA + green-api-proxy allowlist)
src/api/          — клиент GREEN-API, same-origin прокси (devProxy.ts), уведомления
src/hooks/        — опрос ReceiveNotification
src/api/messengers/ — адаптеры MAX / WhatsApp / Telegram (chatId, уведомления, QR)
src/pwa/          — Service Worker (sw.ts, swPolicy.ts), регистрация/обновление, «Нет сети»
src/utils/        — inbox (входящие по инстансам), instances (фильтр, удаление)
src/components/   — экран входа, layout чата, instances/ (дашборд, переключатель, опрос)
src/styles/       — theme.css (CSS-переменные), global.css, ui.module.css
```

Визуальная тема сосредоточена в `src/styles/theme.css` (Inter, primary `#0077FF`, radius `12px`). Компоненты размечены атрибутами `data-ui` (`login-screen`, `empty-state`, `new-chat-panel`, `active-chat`) для подстановки макета Stitch без изменения логики.

## Лицензия

Учебный проект для тестового задания GREEN-API.
