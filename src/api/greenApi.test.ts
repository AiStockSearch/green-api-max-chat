import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deleteNotification,
  normalizeApiUrl,
  receiveNotification,
  sendMessage,
} from './greenApi'
import type { GreenApiCredentials } from './types'
import { GreenApiError } from './types'

const creds: GreenApiCredentials = {
  idInstance: '3100000001',
  apiTokenInstance: 'test-token',
  apiUrl: 'https://api.green-api.com',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('normalizeApiUrl', () => {
  it('добавляет https при отсутствии схемы', () => {
    expect(normalizeApiUrl('api.green-api.com')).toBe('https://api.green-api.com')
  })
})

describe('sendMessage', () => {
  it('отправляет POST с chatId и message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ idMessage: '1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await sendMessage(creds, '10000000', 'Hi')
    expect(res.idMessage).toBe('1')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.green-api.com/waInstance3100000001/sendMessage/test-token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ chatId: '10000000', message: 'Hi' }),
      }),
    )
  })

  it('бросает GreenApiError при 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '',
      }),
    )
    await expect(sendMessage(creds, '1', 'x')).rejects.toBeInstanceOf(GreenApiError)
  })
})

describe('receiveNotification', () => {
  it('возвращает null при пустом ответе', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '',
      }),
    )
    await expect(receiveNotification(creds)).resolves.toBeNull()
  })

  it('парсит уведомление', async () => {
    const payload = {
      receiptId: 42,
      body: { typeWebhook: 'incomingMessageReceived' },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(payload),
      }),
    )
    const res = await receiveNotification(creds, 5)
    expect(res?.receiptId).toBe(42)
  })
})

describe('deleteNotification', () => {
  it('вызывает DELETE с receiptId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const ok = await deleteNotification(creds, 99)
    expect(ok).toBe(true)
    expect(fetchMock.mock.calls[0][0]).toContain('/deleteNotification/test-token/99')
  })
})
