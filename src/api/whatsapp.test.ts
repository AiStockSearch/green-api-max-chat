import { describe, expect, it } from 'vitest'
import type { IncomingWebhookBody } from './types'
import {
  aliasesFromCheckWhatsapp,
  buildWhatsAppQrPageUrl,
  chatMatchesId,
  extractWhatsAppText,
  parseWhatsAppHistoryItem,
  parseWhatsAppNotification,
  qrErrorNeedsLogout,
  whatsappChatId,
} from './whatsapp'

describe('whatsappChatId', () => {
  it('номер с форматированием → {digits}@c.us', () => {
    expect(whatsappChatId('+7 (999) 000-00-00')).toBe('79990000000@c.us')
    expect(whatsappChatId('79990000000')).toBe('79990000000@c.us')
  })

  it('готовый chatId @c.us / @g.us возвращается как есть (нижний регистр)', () => {
    expect(whatsappChatId('79990000000@c.us')).toBe('79990000000@c.us')
    expect(whatsappChatId('79990000000@C.US')).toBe('79990000000@c.us')
    expect(whatsappChatId('120363000000000000@g.us')).toBe('120363000000000000@g.us')
  })

  it('короткий числовой ID (как в MAX) не принимается', () => {
    expect(() => whatsappChatId('10000000')).toThrow()
  })

  it('чужой суффикс и пустая строка — ошибка', () => {
    expect(() => whatsappChatId('user@example.com')).toThrow()
    expect(() => whatsappChatId('   ')).toThrow()
  })
})

const base = {
  timestamp: 1763115112,
  idMessage: 'BAE5F4886F6F2D05',
  senderData: {
    chatId: '79990000000@c.us',
    chatName: 'Иван',
    sender: '79990000000@c.us',
    senderName: 'Иван Петров',
  },
}

describe('parseWhatsAppNotification', () => {
  it('incomingMessageReceived + textMessage → входящее', () => {
    const body: IncomingWebhookBody = {
      ...base,
      typeWebhook: 'incomingMessageReceived',
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: ' Привет ' } },
    }
    expect(parseWhatsAppNotification(body)).toEqual({
      chatId: '79990000000@c.us',
      text: 'Привет',
      idMessage: 'BAE5F4886F6F2D05',
      timestamp: 1763115112 * 1000,
      senderName: 'Иван Петров',
      direction: 'incoming',
    })
  })

  it('extendedTextMessage → extendedTextMessageData.text', () => {
    const body: IncomingWebhookBody = {
      ...base,
      typeWebhook: 'incomingMessageReceived',
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'https://green-api.com' },
      },
    }
    expect(parseWhatsAppNotification(body)?.text).toBe('https://green-api.com')
  })

  it('quotedMessage (ответ с цитатой) → extendedTextMessageData.text', () => {
    const body: IncomingWebhookBody = {
      ...base,
      typeWebhook: 'incomingMessageReceived',
      messageData: { typeMessage: 'quotedMessage', extendedTextMessageData: { text: 'Ответ' } },
    }
    expect(parseWhatsAppNotification(body)?.text).toBe('Ответ')
  })

  it('outgoingMessageReceived (с телефона) → исходящее, имя чата', () => {
    const body: IncomingWebhookBody = {
      ...base,
      typeWebhook: 'outgoingMessageReceived',
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'с телефона' } },
    }
    expect(parseWhatsAppNotification(body)).toMatchObject({
      direction: 'outgoing',
      text: 'с телефона',
      senderName: 'Иван',
    })
  })

  it('outgoingAPIMessageReceived → исходящее', () => {
    const body: IncomingWebhookBody = {
      ...base,
      typeWebhook: 'outgoingAPIMessageReceived',
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'через API' },
      },
    }
    expect(parseWhatsAppNotification(body)).toMatchObject({
      direction: 'outgoing',
      text: 'через API',
    })
  })

  it('игнорирует статусы, медиа и пустой текст', () => {
    expect(parseWhatsAppNotification({ ...base, typeWebhook: 'outgoingMessageStatus' })).toBeNull()
    expect(
      parseWhatsAppNotification({
        ...base,
        typeWebhook: 'incomingMessageReceived',
        messageData: { typeMessage: 'imageMessage' },
      }),
    ).toBeNull()
    expect(
      parseWhatsAppNotification({
        ...base,
        typeWebhook: 'incomingMessageReceived',
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: '  ' } },
      }),
    ).toBeNull()
    expect(
      parseWhatsAppNotification({
        typeWebhook: 'incomingMessageReceived',
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'x' } },
      }),
    ).toBeNull()
  })

  it('extractWhatsAppText без messageData → null', () => {
    expect(extractWhatsAppText({ typeWebhook: 'incomingMessageReceived' })).toBeNull()
  })
})

describe('QR helpers', () => {
  it('ссылка qr.green-api.com без /v3 для WhatsApp', () => {
    expect(
      buildWhatsAppQrPageUrl({ idInstance: '1101000001', apiTokenInstance: 'tok', apiUrl: '' }),
    ).toBe('https://qr.green-api.com/waInstance1101000001/tok')
  })

  it('распознаёт ошибку «need to make log out»', () => {
    expect(qrErrorNeedsLogout('Instance has auth. You need to make log out')).toBe(true)
    expect(qrErrorNeedsLogout('timeout')).toBe(false)
  })
})

describe('lid mapping', () => {
  it('whatsappChatId принимает …@lid', () => {
    expect(whatsappChatId('155508384256027@lid')).toBe('155508384256027@lid')
  })

  it('aliasesFromCheckWhatsapp: lid отличается от chatId → алиас', () => {
    expect(aliasesFromCheckWhatsapp('79990000000@c.us', { chatId: '155508384256027@lid' })).toEqual(
      ['155508384256027@lid'],
    )
    expect(aliasesFromCheckWhatsapp('79990000000@c.us', { chatId: '79990000000@c.us' })).toEqual([])
    expect(aliasesFromCheckWhatsapp('79990000000@c.us', {})).toEqual([])
  })

  it('chatMatchesId: входящее с @lid попадает в чат по номеру', () => {
    const chat = { chatId: '79990000000@c.us', aliases: ['155508384256027@lid'] }
    const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
    expect(chatMatchesId(chat, '155508384256027@lid', eq)).toBe(true)
    expect(chatMatchesId(chat, '79990000000@c.us', eq)).toBe(true)
    expect(chatMatchesId(chat, '1@lid', eq)).toBe(false)
  })
})

describe('parseWhatsAppHistoryItem (GetChatHistory)', () => {
  const chatId = '79990000000@c.us'
  it('входящее textMessage и исходящее extendedTextMessage', () => {
    expect(
      parseWhatsAppHistoryItem(
        {
          type: 'incoming',
          idMessage: 'a',
          timestamp: 10,
          typeMessage: 'textMessage',
          chatId,
          textMessage: ' привет ',
          senderName: 'Лена',
        },
        chatId,
      ),
    ).toEqual({
      chatId,
      text: 'привет',
      idMessage: 'a',
      timestamp: 10000,
      senderName: 'Лена',
      direction: 'incoming',
    })
    expect(
      parseWhatsAppHistoryItem(
        {
          type: 'outgoing',
          idMessage: 'b',
          timestamp: 5,
          typeMessage: 'extendedTextMessage',
          chatId,
          extendedTextMessage: { text: 'тест' },
        },
        chatId,
      )?.direction,
    ).toBe('outgoing')
  })
  it('медиа и пустой текст — null', () => {
    expect(
      parseWhatsAppHistoryItem({ type: 'incoming', typeMessage: 'imageMessage' }, chatId),
    ).toBeNull()
    expect(
      parseWhatsAppHistoryItem(
        { type: 'outgoing', typeMessage: 'textMessage', textMessage: ' ' },
        chatId,
      ),
    ).toBeNull()
  })
})
