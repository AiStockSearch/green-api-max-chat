import { describe, expect, it } from 'vitest'
import { chatIdsMatch, parseIncomingTextMessage } from './notifications'
import type { IncomingWebhookBody } from './types'

const sampleBody: IncomingWebhookBody = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1763115112,
  idMessage: '126543123451133331119',
  senderData: {
    chatId: '10000000',
    chatName: 'Тест',
    senderName: 'Тест',
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: {
      textMessage: 'Привет!',
    },
  },
}

describe('parseIncomingTextMessage', () => {
  it('извлекает текст входящего сообщения', () => {
    const parsed = parseIncomingTextMessage(sampleBody)
    expect(parsed).toMatchObject({
      chatId: '10000000',
      text: 'Привет!',
      idMessage: '126543123451133331119',
    })
    expect(parsed?.timestamp).toBe(1763115112 * 1000)
  })

  it('игнорирует другие типы webhook', () => {
    expect(
      parseIncomingTextMessage({ ...sampleBody, typeWebhook: 'outgoingMessageStatus' }),
    ).toBeNull()
  })

  it('игнорирует не-текстовые сообщения', () => {
    expect(
      parseIncomingTextMessage({
        ...sampleBody,
        messageData: { typeMessage: 'imageMessage' },
      }),
    ).toBeNull()
  })
})

describe('chatIdsMatch', () => {
  it('сопоставляет номер и @c.us', () => {
    expect(chatIdsMatch('79991234567@c.us', '79991234567@c.us')).toBe(true)
    expect(chatIdsMatch('79991234567@c.us', '79991234567')).toBe(true)
  })
})
