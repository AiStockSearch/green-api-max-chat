import { beforeEach, describe, expect, it } from 'vitest'
import { saveAuth, loadAuth } from './credentialsStore'
import {
  assignLegacyInstance,
  clearProfiles,
  loadProfiles,
  makeProfile,
  profileId,
  removeProfile,
  saveProfiles,
  upsertProfile,
} from './profilesStore'
import type { Chat } from './types'

const KEY = 'green-api-max-chat:profiles'
const wa = {
  idInstance: '1101000001',
  apiTokenInstance: 'YOUR_API_TOKEN',
  apiUrl: 'https://api.green-api.com',
  messenger: 'whatsapp' as const,
}
const tg = { ...wa, idInstance: '4100000001', messenger: 'telegram' as const }

describe('profilesStore', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('profileId = messenger:idInstance; один id в разных мессенджерах — разные профили', () => {
    expect(profileId(wa)).toBe('whatsapp:1101000001')
    expect(profileId({ ...wa, messenger: 'max' })).toBe('max:1101000001')
    expect(profileId({ idInstance: '1' })).toBe('max:1')
  })

  it('makeProfile: label по умолчанию — idInstance, обрезка пробелов', () => {
    expect(makeProfile(wa, { now: 5 }).label).toBe('1101000001')
    expect(makeProfile(wa, { label: '  Продажи ', now: 5 }).label).toBe('Продажи')
    expect(makeProfile(wa, { now: 5 }).createdAt).toBe(5)
  })

  it('«Запомнить» → localStorage, иначе sessionStorage', () => {
    const a = makeProfile(wa, { remember: true, now: 1 })
    const b = makeProfile(tg, { remember: false, now: 2 })
    saveProfiles([a, b])
    expect(JSON.parse(localStorage.getItem(KEY)!)).toHaveLength(1)
    expect(JSON.parse(sessionStorage.getItem(KEY)!)[0].id).toBe('telegram:4100000001')
    const loaded = loadProfiles()
    expect(loaded.map((p) => p.id)).toEqual([a.id, b.id])
    expect(loaded.map((p) => p.remember)).toEqual([true, false])
  })

  it('пустой список удаляет ключи; clearProfiles чистит оба хранилища', () => {
    saveProfiles([makeProfile(wa, { remember: true })])
    saveProfiles([])
    expect(localStorage.getItem(KEY)).toBeNull()
    saveProfiles([makeProfile(wa, { remember: true }), makeProfile(tg)])
    clearProfiles()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(sessionStorage.getItem(KEY)).toBeNull()
  })

  it('миграция старой одиночной сессии инстанса в профиль', () => {
    saveAuth({ mode: 'instance', credentials: wa }, true)
    const loaded = loadProfiles()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('whatsapp:1101000001')
    expect(loaded[0].remember).toBe(true)
    expect(loadAuth()).toBeNull()
    expect(loadProfiles()).toHaveLength(1)
  })

  it('битый JSON не ломает загрузку', () => {
    localStorage.setItem(KEY, '{oops')
    expect(loadProfiles()).toEqual([])
  })

  it('upsert обновляет существующий (createdAt сохраняется), remove удаляет', () => {
    const a = makeProfile(wa, { now: 1 })
    let list = upsertProfile([], a)
    list = upsertProfile(list, makeProfile(wa, { label: 'Новое', now: 99 }))
    expect(list).toHaveLength(1)
    expect(list[0].label).toBe('Новое')
    expect(list[0].createdAt).toBe(1)
    list = upsertProfile(list, makeProfile(tg))
    expect(removeProfile(list, a.id).map((p) => p.id)).toEqual(['telegram:4100000001'])
  })

  it('assignLegacyInstance привязывает только элементы без instanceId', () => {
    const chats: Chat[] = [
      { id: '1', chatId: 'a', title: 'a', createdAt: 0 },
      { id: '2', chatId: 'b', title: 'b', createdAt: 0, instanceId: 'telegram:1' },
    ]
    const out = assignLegacyInstance(chats, 'max:7')
    expect(out.map((c) => c.instanceId)).toEqual(['max:7', 'telegram:1'])
    expect(assignLegacyInstance(chats, undefined)).toBe(chats)
  })
})
