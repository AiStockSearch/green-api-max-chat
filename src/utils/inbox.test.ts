import { describe, expect, it } from 'vitest'
import type { Chat, ParsedChatMessage, StoredMessage } from '../api/types'
import { applyIncomingMessage, findChatForIncoming } from './inbox'

const WA = 'whatsapp:1101000001'
const TG = 'telegram:4100000001'

function chat(p: Partial<Chat> & Pick<Chat, 'chatId'>): Chat {
  return { id: p.chatId, title: p.chatId, createdAt: 0, ...p }
}

function msg(p: Partial<ParsedChatMessage> & Pick<ParsedChatMessage, 'chatId'>): ParsedChatMessage {
  return { text: 'hi', direction: 'incoming', timestamp: 1000, ...p } as ParsedChatMessage
}

describe('inbox: входящие по инстансам', () => {
  it('находит чат по chatId только в своём инстансе', () => {
    const chats = [
      chat({ id: 'w', chatId: '79990000000@c.us', instanceId: WA }),
      chat({ id: 't', chatId: '79990000000@c.us', instanceId: TG }),
    ]
    expect(findChatForIncoming(chats, TG, { chatId: '79990000000@c.us' })?.chat.id).toBe('t')
    expect(findChatForIncoming(chats, 'max:1', { chatId: '79990000000@c.us' })).toBeNull()
  })

  it('находит по алиасу @lid', () => {
    const chats = [chat({ chatId: '79990000000@c.us', aliases: ['1219@lid'], instanceId: WA })]
    expect(findChatForIncoming(chats, WA, { chatId: '1219@lid' })?.viaPhone).toBe(false)
  })

  it('Telegram: chatId-число сопоставляется с чатом по номеру (senderPhone) и добавляется алиас', () => {
    const state = {
      chats: [chat({ id: 'c', chatId: '79990000000@c.us', instanceId: TG })],
      messages: [],
    }
    const next = applyIncomingMessage(
      state,
      TG,
      msg({ chatId: '555000111', senderPhone: '79990000000', idMessage: 'm1' }),
    )
    expect(next.chats).toHaveLength(1)
    expect(next.chats[0].aliases).toEqual(['555000111'])
    expect(next.messages[0].chatId).toBe('79990000000@c.us')
    expect(next.messages[0].instanceId).toBe(TG)
  })

  it('создаёт новый чат с instanceId и именем отправителя', () => {
    const next = applyIncomingMessage(
      { chats: [], messages: [] },
      WA,
      msg({ chatId: '79991112233@c.us', senderName: 'Иван', idMessage: 'x' }),
      () => 42,
    )
    expect(next.chats[0]).toMatchObject({
      chatId: '79991112233@c.us',
      title: 'Иван',
      instanceId: WA,
      createdAt: 42,
    })
    expect(next.messages[0]).toMatchObject({ text: 'hi', direction: 'incoming', instanceId: WA })
  })

  it('дедуп по idMessage в рамках инстанса; тот же idMessage другого инстанса не теряется', () => {
    const existing: StoredMessage = {
      id: '1',
      chatId: 'a@c.us',
      text: 'hi',
      timestamp: 1,
      direction: 'incoming',
      idMessage: 'dup',
      instanceId: WA,
    }
    const state = { chats: [chat({ chatId: 'a@c.us', instanceId: WA })], messages: [existing] }
    expect(applyIncomingMessage(state, WA, msg({ chatId: 'a@c.us', idMessage: 'dup' }))).toBe(state)
    const other = applyIncomingMessage(state, TG, msg({ chatId: 'a@c.us', idMessage: 'dup' }))
    expect(other.messages).toHaveLength(2)
    expect(other.chats).toHaveLength(2)
  })
})
