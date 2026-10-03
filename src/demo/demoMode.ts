import type { Chat, GreenApiCredentials, InstanceProfile, StoredMessage } from '../api/types'

export type DemoVariant =
  | 'empty'
  | 'modal'
  | 'active'
  | 'error'
  | 'loading'
  | 'unauthorized'
  | 'network'
  | 'mobile-list'
  | 'mobile-chat'
  | 'logout'
  | 'register'
  | 'partner'
  | 'create-instance'
  | 'instance-qr'
  | 'dashboard'
  | null

export function getDemoVariant(): DemoVariant {
  const v = new URLSearchParams(window.location.search).get('demo')
  const allowed: DemoVariant[] = [
    'empty',
    'modal',
    'active',
    'error',
    'loading',
    'unauthorized',
    'network',
    'mobile-list',
    'mobile-chat',
    'logout',
    'register',
    'partner',
    'create-instance',
    'instance-qr',
    'dashboard',
  ]
  if (allowed.includes(v as DemoVariant)) {
    return v as DemoVariant
  }
  return null
}

export function isDemoMode(): boolean {
  return getDemoVariant() !== null
}

export const DEMO_CREDENTIALS: GreenApiCredentials = {
  idInstance: '7105183921',
  apiTokenInstance: 'demo-token-not-real',
  apiUrl: 'https://api.green-api.com',
}

/** Демо-профили для ?demo=dashboard (3 мессенджера) */
export const DEMO_PROFILES: InstanceProfile[] = [
  {
    ...DEMO_CREDENTIALS,
    idInstance: '7105183921',
    messenger: 'max',
    id: 'max:7105183921',
    label: 'MAX — поддержка',
    remember: false,
    createdAt: 0,
  },
  {
    ...DEMO_CREDENTIALS,
    idInstance: '7107000001',
    messenger: 'whatsapp',
    id: 'whatsapp:7107000001',
    label: 'WhatsApp — продажи',
    remember: false,
    createdAt: 0,
  },
  {
    ...DEMO_CREDENTIALS,
    idInstance: '4100000001',
    messenger: 'telegram',
    id: 'telegram:4100000001',
    label: 'Telegram — бот-аккаунт',
    remember: false,
    createdAt: 0,
  },
]

export const DEMO_PARTNER = {
  partnerToken: 'gac.demo-partner-token',
  partnerApiUrl: 'https://api.green-api.com',
}

const now = Date.now()
const hour = 60 * 60 * 1000

export const DEMO_CHATS: Chat[] = [
  {
    id: 'demo-chat-1',
    chatId: '10000001',
    title: 'Анна Петрова',
    createdAt: now - 5 * hour,
  },
  {
    id: 'demo-chat-2',
    chatId: '79123456789@c.us',
    title: '+7 912 345-67-89',
    createdAt: now - 24 * hour,
  },
]

export const DEMO_MESSAGES: StoredMessage[] = [
  {
    id: 'm1',
    chatId: '10000001',
    text: 'Здравствуйте! Нужна помощь с настройкой отправки уведомлений через GREEN-API.',
    timestamp: now - 2 * hour,
    direction: 'incoming',
  },
  {
    id: 'm2',
    chatId: '10000001',
    text: 'Добрый день! Конечно, давайте разберём ваш вопрос. Какой метод API используете?',
    timestamp: now - 2 * hour + 3 * 60 * 1000,
    direction: 'outgoing',
    status: 'sent',
  },
  {
    id: 'm3',
    chatId: '10000001',
    text: 'Используем SendMessage для отправки текстовых сообщений из CRM.',
    timestamp: now - 2 * hour + 5 * 60 * 1000,
    direction: 'incoming',
  },
  {
    id: 'm4',
    chatId: '10000001',
    text: 'На связи',
    timestamp: now - 5 * 60 * 1000,
    direction: 'incoming',
  },
  {
    id: 'm5',
    chatId: '79123456789@c.us',
    text: 'Отчёт по интеграции API отправлен…',
    timestamp: now - 26 * hour,
    direction: 'incoming',
  },
]

export const DEMO_FAILED_MESSAGE: StoredMessage = {
  id: 'm-fail',
  chatId: '10000001',
  text: 'спецификация v2.pdf',
  timestamp: now - 60 * 1000,
  direction: 'outgoing',
  status: 'failed',
  error: 'CORS preflight request blocked (TypeError: Failed to fetch)',
}

export const DEMO_SENDING_MESSAGE: StoredMessage = {
  id: 'm-pending',
  chatId: '10000001',
  text: 'Сообщение',
  timestamp: now - 30 * 1000,
  direction: 'outgoing',
  status: 'sending',
}

export function demoMessagesForVariant(variant: DemoVariant): StoredMessage[] {
  if (variant === 'network') {
    return [...DEMO_MESSAGES, DEMO_FAILED_MESSAGE]
  }
  if (variant === 'loading') {
    return [...DEMO_MESSAGES.slice(0, 2), DEMO_SENDING_MESSAGE]
  }
  return DEMO_MESSAGES
}
