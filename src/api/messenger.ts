/**
 * Мессенджер инстанса GREEN-API. По ТЗ основной — MAX; при недоступности MAX
 * допускаются WhatsApp или Telegram. Формат URL методов одинаковый:
 * {apiUrl}/waInstance{id}/{method}/{token}.
 */
export type Messenger = 'max' | 'whatsapp' | 'telegram'

export const DEFAULT_MESSENGER: Messenger = 'max'

/** Порядок в переключателе: WhatsApp / Telegram / MAX. */
export const MESSENGERS: readonly Messenger[] = ['whatsapp', 'telegram', 'max'] as const

export const MESSENGER_LABELS: Record<Messenger, string> = {
  max: 'MAX',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
}

export function parseMessenger(raw: unknown): Messenger {
  if (typeof raw !== 'string') {
    return DEFAULT_MESSENGER
  }
  const v = raw.trim().toLowerCase()
  if (v === 'whatsapp' || v === 'wa') {
    return 'whatsapp'
  }
  if (v === 'telegram' || v === 'tg') {
    return 'telegram'
  }
  return DEFAULT_MESSENGER
}

/** Мессенджер из сохранённых credentials (старые сессии без поля → MAX). */
export function getMessenger(credentials?: { messenger?: unknown } | null): Messenger {
  return parseMessenger(credentials?.messenger)
}

export function messengerLabel(credentials?: { messenger?: unknown } | null): string {
  return MESSENGER_LABELS[getMessenger(credentials)]
}

/** typeInstance из Partner API (`max`, `whatsapp`, …) → Messenger. */
export function messengerFromTypeInstance(typeInstance: unknown): Messenger {
  return parseMessenger(typeInstance)
}
