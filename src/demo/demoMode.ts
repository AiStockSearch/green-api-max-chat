import type { Chat, GreenApiCredentials, StoredMessage } from '../api/types'

export type DemoVariant = 'empty' | 'modal' | 'active' | null

export function getDemoVariant(): DemoVariant {
  const v = new URLSearchParams(window.location.search).get('demo')
  if (v === 'empty' || v === 'modal' || v === 'active') {
    return v
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
