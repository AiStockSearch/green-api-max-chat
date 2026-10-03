import type { Messenger } from './messenger'

export interface GreenApiCredentials {
  idInstance: string
  apiTokenInstance: string
  /** Host API from личного кабинета, например https://3100.api.green-api.com */
  apiUrl: string
  /** Мессенджер инстанса; отсутствует в старых сессиях → MAX. */
  messenger?: Messenger
}

export interface SendMessageResponse {
  idMessage: string
}

export interface ReceiveNotificationResponse {
  receiptId: number
  body: IncomingWebhookBody
}

export interface IncomingWebhookBody {
  typeWebhook: string
  timestamp?: number
  idMessage?: string
  senderData?: {
    chatId?: string
    chatName?: string
    sender?: string
    senderName?: string
    senderPhoneNumber?: number | string
    chatType?: string
  }
  messageData?: {
    typeMessage?: string
    textMessageData?: {
      textMessage?: string
    }
    /** WhatsApp: extendedTextMessage / quotedMessage */
    extendedTextMessageData?: {
      text?: string
    }
  }
}

export interface ParsedIncomingTextMessage {
  chatId: string
  text: string
  idMessage?: string
  timestamp?: number
  senderName?: string
  incoming: true
}

/** Текстовое сообщение из очереди уведомлений (входящее или исходящее). */
export interface ParsedChatMessage {
  chatId: string
  text: string
  idMessage?: string
  timestamp?: number
  senderName?: string
  /** Номер отправителя (Telegram: senderData.senderPhoneNumber) — для связи с чатом, созданным по номеру */
  senderPhone?: string
  direction: 'incoming' | 'outgoing'
}

export interface Chat {
  id: string
  chatId: string
  title: string
  phone?: string
  /** Альтернативные chatId того же собеседника (WhatsApp: …@lid из CheckWhatsapp). */
  aliases?: string[]
  /** Профиль инстанса, которому принадлежит чат (InstanceProfile.id) */
  instanceId?: string
  createdAt: number
}

export interface StoredMessage {
  id: string
  chatId: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
  idMessage?: string
  /** Профиль инстанса (InstanceProfile.id) */
  instanceId?: string
  status?: 'sending' | 'sent' | 'failed'
  error?: string
}

export class GreenApiError extends Error {
  readonly status?: number
  readonly details?: string

  constructor(message: string, status?: number, details?: string) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
    this.details = details
  }
}

/** Сохранённый профиль инстанса (несколько инстансов одновременно). */
export interface InstanceProfile extends GreenApiCredentials {
  /** `${messenger}:${idInstance}` */
  id: string
  label: string
  /** true — localStorage («Запомнить»), false — sessionStorage */
  remember: boolean
  createdAt: number
}
