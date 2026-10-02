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
```

## Учётные данные GREEN-API

1. Зарегистрируйтесь в [личном кабинете GREEN-API](https://green-api.com).
2. Создайте и **авторизуйте** инстанс MAX (QR-код в кабинете или метод QR).
3. В карточке инстанса скопируйте:
   - **idInstance**
   - **apiTokenInstance**
   - **apiUrl** — хост API (часто `https://api.green-api.com` или персональный, например `https://3100.api.green-api.com`)

В приложении на экране входа укажите эти значения. Они сохраняются в **localStorage** браузера (кнопка «Выйти» удаляет только учётные данные; чаты и сообщения остаются в localStorage).

> **Не коммитьте** реальные токены в репозиторий.

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

_Добавьте ссылки на скриншоты или демо-видео._

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
