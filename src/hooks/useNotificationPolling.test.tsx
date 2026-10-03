import { act, StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '../test/dom'
import type { ParsedChatMessage } from '../api/types'
import { useNotificationPolling } from './useNotificationPolling'

const creds = {
  idInstance: '1101000001',
  apiTokenInstance: 'tok',
  apiUrl: 'https://api.green-api.com',
  messenger: 'whatsapp' as const,
}

const notif = (receiptId: number, idMessage: string, text: string) => ({
  receiptId,
  body: {
    typeWebhook: 'incomingMessageReceived',
    idMessage,
    timestamp: 1,
    senderData: { chatId: '79990000000@c.us', senderName: 'A' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
  },
})

function Poller({ onMessage }: { onMessage: (m: ParsedChatMessage) => void }) {
  // новый объект credentials на каждый рендер — как профиль из состояния App
  useNotificationPolling({ credentials: { ...creds }, enabled: true, onMessage, onError: () => {} })
  return null
}

afterEach(() => vi.unstubAllGlobals())

describe('useNotificationPolling', () => {
  it('StrictMode (двойной запуск эффекта): опрос не останавливается после первого уведомления', async () => {
    const queue = [notif(1, 'id1', 'первое'), notif(2, 'id2', 'второе')]
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        const id = Number(String(url).split('/').pop())
        const i = queue.findIndex((n) => n.receiptId === id)
        if (i >= 0) queue.splice(i, 1)
        return new Response('{"result":true}', { status: 200 })
      }
      await new Promise((r) => setTimeout(r, 5))
      return new Response(queue[0] ? JSON.stringify(queue[0]) : '', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const got: string[] = []
    const m = await mount(
      <StrictMode>
        <Poller onMessage={(msg) => got.push(msg.text)} />
      </StrictMode>,
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })
    m.unmount()
    expect([...new Set(got)]).toEqual(['первое', 'второе'])
    expect(queue).toHaveLength(0)
  })
})
