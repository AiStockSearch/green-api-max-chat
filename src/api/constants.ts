/** Значение по умолчанию; для инстанса может быть свой хост из личного кабинета. */
export const DEFAULT_API_URL = 'https://api.green-api.com'

export const STORAGE_KEYS = {
  credentials: 'green-api-max-chat:credentials',
  chats: 'green-api-max-chat:chats',
  messages: 'green-api-max-chat:messages',
} as const

/** Суффикс личного чата по номеру (WhatsApp-совместимый формат GREEN-API). */
export const PHONE_CHAT_SUFFIX = '@c.us'
