export interface GreenApiCredentials {
  idInstance: string
  apiTokenInstance: string
  /** Host API from личного кабинета, например https://3100.api.green-api.com */
  apiUrl: string
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
  }
  messageData?: {
    typeMessage?: string
    textMessageData?: {
      textMessage?: string
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

export interface Chat {
  id: string
  chatId: string
  title: string
  phone?: string
  createdAt: number
}

export interface StoredMessage {
  id: string
  chatId: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
  idMessage?: string
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
