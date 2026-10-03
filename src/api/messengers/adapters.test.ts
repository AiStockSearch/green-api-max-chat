import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GreenApiCredentials, IncomingWebhookBody } from '../types'
import { adapterFor, getAdapter } from './index'

const creds: GreenApiCredentials = {
  idInstance: '1101000001',
  apiTokenInstance: 'tok',
  apiUrl: 'https://api.green-api.com',
}

const textBody = (typeWebhook: string, chatId: string): IncomingWebhookBody => ({
  typeWebhook,
  idMessage: 'id1',
  timestamp: 1,
  senderData: { chatId, senderName: 'A', chatName: 'A' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'hi' } },
})

describe('getAdapter / adapterFor', () => {
  it('три реализации одного интерфейса', () => {
    expect(getAdapter('max').id).toBe('max')
    expect(getAdapter('whatsapp').id).toBe('whatsapp')
    expect(getAdapter('telegram').id).toBe('telegram')
    expect(adapterFor(creds).id).toBe('max')
    expect(adapterFor({ messenger: 'telegram' }).label).toBe('Telegram')
  })
})

describe('MAX adapter', () => {
  const a = getAdapter('max')
  it('chatId, уведомления, QR — как раньше', () => {
    expect(a.resolveChatId('10000000')).toBe('10000000')
    expect(a.parseNotification(textBody('incomingMessageReceived', '10000000'))?.direction).toBe(
      'incoming',
    )
    expect(a.parseNotification(textBody('outgoingMessageReceived', '10000000'))).toBeNull()
    expect(a.qrPageUrl(creds)).toMatch(/\/v3$/)
    expect(a.supportsPassword2fa).toBe(true)
    expect(a.supportsPhoneCodeAuth).toBe(false)
    expect(a.checkRecipient).toBeUndefined()
  })
})

describe('WhatsApp adapter', () => {
  const a = getAdapter('whatsapp')
  afterEach(() => vi.unstubAllGlobals())

  it('chatId, исходящие, QR, logout', () => {
    expect(a.resolveChatId('+79990000000')).toBe('79990000000@c.us')
    expect(
      a.parseNotification(textBody('outgoingMessageReceived', '79990000000@c.us'))?.direction,
    ).toBe('outgoing')
    expect(a.qrPageUrl(creds)).toBe('https://qr.green-api.com/waInstance1101000001/tok')
    expect(a.qrNeedsLogout('You need to make log out')).toBe(true)
    expect(a.supportsPassword2fa).toBe(false)
  })

  it('checkRecipient → CheckWhatsapp, lid как алиас', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ existsWhatsapp: true, chatId: '155508384256027@lid' }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const res = await a.checkRecipient!(creds, '79990000000@c.us')
    expect(res).toEqual({ exists: true, aliases: ['155508384256027@lid'] })
    expect(String(fetchMock.mock.calls[0][0])).toContain('/waInstance1101000001/checkWhatsapp/tok')
  })

  it('loadHistory → GetChatHistory, старые сообщения первыми', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            type: 'incoming',
            idMessage: 'n',
            timestamp: 2,
            typeMessage: 'textMessage',
            textMessage: 'ответ',
          },
          {
            type: 'outgoing',
            idMessage: 'o',
            timestamp: 1,
            typeMessage: 'extendedTextMessage',
            extendedTextMessage: { text: 'вопрос' },
          },
          { type: 'incoming', idMessage: 'img', timestamp: 0, typeMessage: 'imageMessage' },
        ]),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const res = await a.loadHistory!(creds, '79990000000@c.us')
    expect(res.map((m) => [m.direction, m.text])).toEqual([
      ['outgoing', 'вопрос'],
      ['incoming', 'ответ'],
    ])
    expect(String(fetchMock.mock.calls[0][0])).toContain('/waInstance1101000001/getChatHistory/tok')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      chatId: '79990000000@c.us',
      count: 50,
    })
  })

  it('checkRecipient: группа без запроса', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await a.checkRecipient!(creds, '1-2@g.us')).toEqual({ exists: true, aliases: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('Telegram adapter', () => {
  const a = getAdapter('telegram')
  it('chatId, уведомления, QR, вход по коду', () => {
    expect(a.resolveChatId('10000000')).toBe('10000000')
    expect(a.resolveChatId('+79990000000')).toBe('79990000000@c.us')
    expect(a.parseNotification(textBody('incomingMessageReceived', '10000000'))?.text).toBe('hi')
    expect(a.qrPageUrl(creds)).toMatch(/\/telegram$/)
    expect(a.supportsPassword2fa).toBe(true)
    expect(a.supportsPhoneCodeAuth).toBe(true)
  })
})
