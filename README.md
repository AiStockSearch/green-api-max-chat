# GREEN-API MAX Chat (тестовое задание)

![CI](https://github.com/Js-Nanodegree/green-api-max-chat/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/Js-Nanodegree/green-api-max-chat/actions/workflows/deploy.yml/badge.svg)

Небольшое веб-приложение на **React + TypeScript (Vite)** для отправки и приёма **текстовых** сообщений в мессенджере **MAX** через [GREEN-API](https://green-api.com). Интерфейс вдохновлён [web.max.ru](https://web.max.ru): список чатов слева, переписка с пузырями справа.

## Стек

- React 19, TypeScript, Vite
- CSS Modules (без тяжёлых UI-библиотек)
- Vitest — unit-тесты API-слоя
- ESLint + Prettier

## Клонирование

```bash
git clone https://github.com/Js-Nanodegree/green-api-max-chat.git
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
- GitHub Actions live E2E (опционально): `GREEN_API_ID_INSTANCE`, `GREEN_API_TOKEN`, `GREEN_API_URL`, опционально `GREEN_API_CHAT_ID`

> **Безопасность:** `apiTokenInstance` и `partnerToken` вводятся только в браузере или в CI-секретах. В Docker-образ попадает лишь собранный статический `dist/` — **токены в image не запекаются**.

## CI/CD

Workflows в `.github/workflows/`:

| Workflow | Триггер | Что делает |
|----------|---------|------------|
| **ci.yml** | push/PR → `main` | `npm ci`, lint, Vitest, build, `docker build`; Cypress **03** (демо, без секретов); live Cypress **01–05** — только если заданы секреты `GREEN_API_*` |
| **deploy.yml** | push `main`, теги `v*.*.*`, `workflow_dispatch` | Сборка и push образа в **GHCR** (`ghcr.io/js-nanodegree/green-api-max-chat`); GitHub Pages — **только вручную** (`publish_pages=true`) |

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
2. Укажите `idInstance`, `apiTokenInstance`, `apiUrl` **как в кабинете** (например `https://7107.api.greenapi.com`). В `npm run dev` прокси включается автоматически.
3. Запуск: `npm run test:e2e` (поднимает Vite на порту **43128** и гоняет Cypress).

Сценарии: live `getStateInstance`, UI-вход → экран QR, демо register/partner/instance-qr, **05-live-send-receive** (SendMessage API+UI, ReceiveNotification/delete, опционально входящее в UI).

Для **05** нужны `chatId` (номер или ID чата MAX) и **`authorized`** инстанс. Входящее в UI: во время прогона (~2 мин) отправьте с MAX на инстанс текст `e2e-in-…` из лога Cypress, либо задайте `incomingMarker` и `requireIncoming: true`.

## Учётные данные и «аккаунт» в приложении

У GREEN-API **нет публичного API** регистрации/логина конечного пользователя в личный кабинет. Регистрация и вход на сайте — [console.green-api.com](https://console.green-api.com).

В приложении два режима (переключатель на экране **«Вход»**):

| Режим | Что нужно | API |
|--------|-----------|-----|
| **Инстанс** | `idInstance`, `apiTokenInstance`, `apiUrl` | GetStateInstance → чат или экран QR |
| **Партнёр** | `partnerToken`, `partnerApiUrl` (из кабинета / support) | [Partner API](https://green-api.com/docs/partners/): getInstances, createInstance, deleteInstanceAccount → авторизация инстанса → чат |

### Инстанс MAX

1. Создайте инстанс MAX в кабинете.
2. Скопируйте **idInstance**, **apiTokenInstance**, **apiUrl**.
3. Войдите в приложении в режиме «Инстанс». При `notAuthorized` откроется шаг **QR** (метод `GET …/qr/…`, страница [qr.green-api.com](https://qr.green-api.com)) и опрос **getStateInstance**. При `pendingPassword` — **sendAuthorizationPassword** (2FA MAX).

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
| getAuthorizationCode / StartAuthorization / SendAuthorizationCode | ❌ не поддерживаются MAX (WhatsApp OTP; см. [новость интеграции MAX](https://green-api.com/articles/en/news/04-02-2026-release-max-integration/)) |
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
4. Ответ собеседника в MAX появится в чате после опроса очереди.

## WhatsApp и другие мессенджеры

Формат URL унифицирован: `{{apiUrl}}/waInstance{{idInstance}}/method/{{apiTokenInstance}}`. Достаточно указать **apiUrl** и учётные данные инстанса WhatsApp — логика отправки и опроса та же.

## Ограничения

- Только **текст**; медиа и статусы не отображаются.
- Без Docker запросы идут из браузера напрямую; **CORS** может блокировать API. В **dev** — прокси Vite; в **production** — Docker/nginx (`/green-api-proxy`) или свой backend.
- Один активный опрос на вкладку; при нескольких вкладках возможны конфликты очереди.
- Состояние чатов хранится локально в браузере.

## Деплой

- **Docker / GHCR** (рекомендуется): `deploy.yml` → образ с nginx + CORS-прокси; `docker pull ghcr.io/js-nanodegree/green-api-max-chat:main`.
- **Vercel**: `vercel.json` (SPA rewrite). Build: `npm run build`, output: `dist` — **без** same-origin прокси, возможен CORS.
- **GitHub Pages**: вручную через `deploy.yml` → `workflow_dispatch` + `publish_pages=true`; `GITHUB_PAGES=true` при сборке.

### Ссылка на деплой

_Добавьте URL после публикации, например: `https://your-app.vercel.app`_

### Скриншоты / видео

Превью интерфейса (демо-данные, без реальных токенов):

| Экран | Файл |
|--------|------|
| Вход | [docs/screenshots/01-login.png](docs/screenshots/01-login.png) |
| Пустое состояние | [docs/screenshots/02-empty-state.png](docs/screenshots/02-empty-state.png) |
| Модалка «Новый чат» | [docs/screenshots/03-new-chat-modal.png](docs/screenshots/03-new-chat-modal.png) |
| Активный чат | [docs/screenshots/04-active-chat.png](docs/screenshots/04-active-chat.png) |
| Ошибка входа | [docs/screenshots/05-login-error.png](docs/screenshots/05-login-error.png) |
| Инстанс не авторизован | [docs/screenshots/06-instance-unauthorized.png](docs/screenshots/06-instance-unauthorized.png) |
| Сеть / CORS | [docs/screenshots/07-network-error.png](docs/screenshots/07-network-error.png) |
| Загрузка / скелетоны | [docs/screenshots/08-loading.png](docs/screenshots/08-loading.png) |
| Выход из инстанса | [docs/screenshots/09-logout-confirm.png](docs/screenshots/09-logout-confirm.png) |
| Мобильный список чатов | [docs/screenshots/10-mobile-chat-list.png](docs/screenshots/10-mobile-chat-list.png) |
| Мобильный активный чат | [docs/screenshots/11-mobile-active-chat.png](docs/screenshots/11-mobile-active-chat.png) |

Демо-режим (без реальных токенов), query-параметр `demo`:

| `demo=` | Что показывает |
|---------|----------------|
| `error` | Экран входа с баннером и inline-ошибками полей |
| `unauthorized` | Карточка «Инстанс не авторизован в MAX», кнопка «Проверить снова» (GetStateInstance) |
| `network` | Баннер CORS/сети, неотправленное сообщение с «Повторить» |
| `loading` | Скелетоны списка и переписки, статус «отправляется» |
| `mobile-list` | Список чатов на ширине ≤768px |
| `mobile-chat` | Активный чат на мобильном с кнопкой «назад» |
| `logout` | Модалка подтверждения выхода |
| `empty`, `modal`, `active` | Как раньше: пустой layout, модалка нового чата, диалог |
| `register` | Экран «Регистрация» (ссылка на console.green-api.com) |
| `partner` | Список инстансов партнёра (демо-данные) |
| `create-instance` | Partner: форма createInstance раскрыта |
| `instance-qr` | Экран авторизации QR / getStateInstance |

Переснять скриншоты: `npm run build && npm run screenshots` (или `node scripts/capture-screenshots.mjs`).

| Экран аккаунта | Файл |
|----------------|------|
| Регистрация | docs/screenshots/12-register.png |
| Partner: инстансы | docs/screenshots/13-partner-instances.png |
| Partner: createInstance | docs/screenshots/14-create-instance.png |
| Авторизация QR | docs/screenshots/15-instance-qr-auth.png |

## Структура проекта

```
docker/           — nginx.conf (SPA + green-api-proxy allowlist)
src/api/          — клиент GREEN-API, same-origin прокси (devProxy.ts), уведомления
src/hooks/        — опрос ReceiveNotification
src/components/   — экран входа и layout чата
src/styles/       — theme.css (CSS-переменные), global.css, ui.module.css
```

Визуальная тема сосредоточена в `src/styles/theme.css` (Inter, primary `#0077FF`, radius `12px`). Компоненты размечены атрибутами `data-ui` (`login-screen`, `empty-state`, `new-chat-panel`, `active-chat`) для подстановки макета Stitch без изменения логики.

## Лицензия

Учебный проект для тестового задания GREEN-API.
