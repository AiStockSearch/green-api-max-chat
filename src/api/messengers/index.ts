import { getMessenger, type Messenger } from '../messenger'
import { maxAdapter } from './max'
import { telegramAdapter } from './telegram'
import type { MessengerAdapter } from './types'
import { whatsappAdapter } from './whatsapp'

export type { MessengerAdapter, RecipientCheck } from './types'

const ADAPTERS: Record<Messenger, MessengerAdapter> = {
  max: maxAdapter,
  whatsapp: whatsappAdapter,
  telegram: telegramAdapter,
}

export function getAdapter(messenger: Messenger): MessengerAdapter {
  return ADAPTERS[messenger]
}

/** Адаптер по credentials (старые сессии без messenger → MAX). */
export function adapterFor(credentials?: { messenger?: unknown } | null): MessengerAdapter {
  return ADAPTERS[getMessenger(credentials)]
}
