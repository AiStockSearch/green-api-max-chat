# GREEN-API MAX Chat (тестовое задание)

Небольшое веб-приложение на **React + TypeScript (Vite)** для отправки и приёма **текстовых** сообщений в мессенджере **MAX** через [GREEN-API](https://green-api.com). Интерфейс вдохновлён [web.max.ru](https://web.max.ru): список чатов слева, переписка с пузырями справа.

## Стек

- React 19, TypeScript, Vite
- CSS Modules (без тяжёлых UI-библиотек)
- Vitest — unit-тесты API-слоя
- ESLint + Prettier

## Локальный запуск

```bash
npm install
npm run dev
```

Приложение откроется на `http://127.0.0.1:43123`.

Проверки перед сдачей:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

### Cypress (E2E с вашим инстансом)

1. Скопируйте `cypress.env.example.json` → `cypress.env.json` (файл в `.gitignore`).
2. Укажите `idInstance`, `apiTokenInstance` из [console.green-api.com](https://console.green-api.com) и **apiUrl через прокси**:
   `http://127.0.0.1:43128/green-api-proxy/7107` — так обходится CORS в браузере (хост `7107.api.greenapi.com`).
3. Запуск: `npm run test:e2e` (поднимает Vite на порту **43128** и гоняет Cypress).

Сценарии: live `getStateInstance`, UI-вход → экран QR, демо register/partner/instance-qr.

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
- Нет серверной части: запросы идут из браузера. При блокировке **CORS** со стороны API может потребоваться прокси (в dev настроен заготовленный proxy `/green-api-proxy` в `vite.config.ts` — при необходимости можно доработать клиент).
- Один активный опрос на вкладку; при нескольких вкладках возможны конфликты очереди.
- Состояние чатов хранится локально в браузере.

## Деплой

- **Vercel**: конфиг `vercel.json` (SPA rewrite). Подключите репозиторий в Vercel, build command: `npm run build`, output: `dist`.
- **GitHub Pages**: workflow `.github/workflows/deploy-pages.yml` (при необходимости измените `base` в `vite.config.ts` под имя репозитория).

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
src/api/          — клиент GREEN-API, разбор уведомлений, chatId, storage
src/hooks/        — опрос ReceiveNotification
src/components/   — экран входа и layout чата
src/styles/       — theme.css (CSS-переменные), global.css, ui.module.css
```

Визуальная тема сосредоточена в `src/styles/theme.css` (Inter, primary `#0077FF`, radius `12px`). Компоненты размечены атрибутами `data-ui` (`login-screen`, `empty-state`, `new-chat-panel`, `active-chat`) для подстановки макета Stitch без изменения логики.

## Лицензия

Учебный проект для тестового задания GREEN-API.
