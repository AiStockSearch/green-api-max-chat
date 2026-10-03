import { describe, expect, it } from 'vitest'
import { makeProfile } from '../api/profilesStore'
import type { Chat, StoredMessage } from '../api/types'
import {
  authorizedProfiles,
  chatBelongsTo,
  instanceStateBadge,
  profileForChat,
  removeInstanceLocally,
  visibleChats,
} from './instances'

const wa = makeProfile(
  {
    idInstance: '1101000001',
    apiTokenInstance: 't',
    apiUrl: 'https://api.green-api.com',
    messenger: 'whatsapp',
  },
  { now: 1 },
)
const tg = makeProfile(
  {
    idInstance: '4100000001',
    apiTokenInstance: 't',
    apiUrl: 'https://api.green-api.com',
    messenger: 'telegram',
  },
  { now: 2 },
)
const chats: Chat[] = [
  { id: '1', chatId: 'a@c.us', title: 'A', createdAt: 0, instanceId: wa.id },
  { id: '2', chatId: '123', title: 'B', createdAt: 0, instanceId: tg.id },
  { id: '3', chatId: 'z', title: 'Orphan', createdAt: 0, instanceId: 'max:9' },
]

describe('instances utils', () => {
  it('instanceStateBadge', () => {
    expect(instanceStateBadge('authorized')).toMatchObject({ label: 'Авторизован', tone: 'ok' })
    expect(instanceStateBadge('notAuthorized')).toMatchObject({
      label: 'Неавторизован',
      tone: 'warn',
    })
    expect(instanceStateBadge('error').tone).toBe('error')
    expect(instanceStateBadge(undefined).tone).toBe('unknown')
  })

  it('visibleChats: «Все» — единый список известных инстансов; фильтр — один инстанс', () => {
    expect(visibleChats(chats, 'all', [wa, tg]).map((c) => c.id)).toEqual(['1', '2'])
    expect(visibleChats(chats, tg.id, [wa, tg]).map((c) => c.id)).toEqual(['2'])
  })

  it('чат без instanceId принадлежит единственному профилю', () => {
    const legacy: Chat = { id: 'l', chatId: 'x', title: 'x', createdAt: 0 }
    expect(chatBelongsTo(legacy, wa.id, [wa])).toBe(true)
    expect(chatBelongsTo(legacy, wa.id, [wa, tg])).toBe(false)
    expect(profileForChat(legacy, [wa])?.id).toBe(wa.id)
    expect(profileForChat(chats[1], [wa, tg])?.id).toBe(tg.id)
    expect(profileForChat(null, [wa])).toBeNull()
  })

  it('authorizedProfiles', () => {
    expect(
      authorizedProfiles([wa, tg], { [wa.id]: 'authorized', [tg.id]: 'notAuthorized' }),
    ).toEqual([wa])
  })

  it('removeInstanceLocally удаляет профиль, его чаты и сообщения, остальное не трогает', () => {
    const messages: StoredMessage[] = [
      {
        id: 'm1',
        chatId: 'a@c.us',
        text: '1',
        timestamp: 1,
        direction: 'incoming',
        instanceId: wa.id,
      },
      {
        id: 'm2',
        chatId: '123',
        text: '2',
        timestamp: 1,
        direction: 'incoming',
        instanceId: tg.id,
      },
    ]
    const out = removeInstanceLocally({ profiles: [wa, tg], chats, messages }, tg.id)
    expect(out.profiles).toEqual([wa])
    expect(out.chats.map((c) => c.id)).toEqual(['1', '3'])
    expect(out.messages.map((m) => m.id)).toEqual(['m1'])
  })
})
