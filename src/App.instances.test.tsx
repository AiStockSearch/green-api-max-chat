import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeProfile, saveProfiles } from './api/profilesStore'
import { click, flush, mount, q, type Mounted } from './test/dom'

const api = vi.hoisted(() => ({
  states: {} as Record<string, string>,
  logout: vi.fn(async () => true),
}))

vi.mock('./api/greenApi', async (orig) => {
  const real = await orig<typeof import('./api/greenApi')>()
  return {
    ...real,
    getStateInstance: vi.fn(async (c: { idInstance: string }) => ({
      stateInstance: api.states[c.idInstance] ?? 'authorized',
    })),
    logoutInstance: api.logout,
    getQrCode: vi.fn(async () => ({ type: 'alreadyLogged', message: '' })),
  }
})

vi.mock('./hooks/useNotificationPolling', () => ({ useNotificationPolling: () => undefined }))

import App from './App'

const wa = makeProfile(
  {
    idInstance: '1101000001',
    apiTokenInstance: 'YOUR_API_TOKEN',
    apiUrl: 'https://api.green-api.com',
    messenger: 'whatsapp',
  },
  { label: 'WA', remember: true, now: 1 },
)
const tg = makeProfile(
  {
    idInstance: '4100000001',
    apiTokenInstance: 'YOUR_API_TOKEN',
    apiUrl: 'https://api.green-api.com',
    messenger: 'telegram',
  },
  { label: 'TG', remember: true, now: 2 },
)

let mounted: Mounted | null = null
let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  api.states = {}
  api.logout.mockClear()
  fetchSpy = vi.fn(async () => new Response('{}'))
  vi.stubGlobal('fetch', fetchSpy)
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }))
  Element.prototype.scrollIntoView = () => {}
  saveProfiles([wa, tg])
  localStorage.setItem(
    'green-api-max-chat:chats',
    JSON.stringify([
      { id: 'c1', chatId: '79990000000@c.us', title: 'WA chat', createdAt: 0, instanceId: wa.id },
      { id: 'c2', chatId: '123456', title: 'TG chat', createdAt: 0, instanceId: tg.id },
    ]),
  )
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  vi.unstubAllGlobals()
})

describe('App: несколько инстансов', () => {
  it('стартует с дашборда и показывает статусы всех инстансов', async () => {
    api.states = { '4100000001': 'notAuthorized' }
    mounted = await mount(<App />)
    await flush()
    const c = mounted.container
    expect(c.querySelector('[data-ui="instances-dashboard"]')).not.toBeNull()
    expect(q(c, `instance-card-${wa.id}`)!.textContent).toContain('Авторизован')
    expect(q(c, `instance-card-${tg.id}`)!.textContent).toContain('Неавторизован')
  })

  it('«Выйти из инстанса» → Logout, статус notAuthorized, предлагается QR-авторизация', async () => {
    mounted = await mount(<App />)
    await flush()
    const c = mounted.container
    const card = () => q(c, `instance-card-${wa.id}`)!
    await click(q(card(), 'instance-logout'))
    api.states = { '1101000001': 'notAuthorized' }
    await click(q(c, 'confirm-dialog-ok'))
    await flush()
    expect(api.logout).toHaveBeenCalledTimes(1)
    expect(api.logout.mock.calls[0]).toEqual([
      expect.objectContaining({ idInstance: '1101000001' }),
    ])
    expect(card().textContent).toContain('Неавторизован')
    expect(q(card(), 'instance-logout')).toBeNull()
    // профиль остаётся
    expect(localStorage.getItem('green-api-max-chat:profiles')).toContain('1101000001')
    await click(q(c, 'logout-notice')!.querySelector('button'))
    expect(c.querySelector('[data-ui="instance-auth"]')).not.toBeNull()
  })

  it('«Убрать из приложения» — только локально: без запросов к API, чаты инстанса удалены', async () => {
    mounted = await mount(<App />)
    await flush()
    const c = mounted.container
    fetchSpy.mockClear()
    await click(q(q(c, `instance-card-${tg.id}`)!, 'instance-remove'))
    await click(q(c, 'confirm-dialog-ok'))
    await flush()
    expect(api.logout).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(q(c, `instance-card-${tg.id}`)).toBeNull()
    expect(localStorage.getItem('green-api-max-chat:profiles')).not.toContain('4100000001')
    const chats = JSON.parse(localStorage.getItem('green-api-max-chat:chats') ?? '[]')
    expect(chats.map((x: { id: string }) => x.id)).toEqual(['c1'])
  })

  it('«Все чаты» — единый список с бейджами мессенджеров; фильтр по инстансу', async () => {
    mounted = await mount(<App />)
    await flush()
    const c = mounted.container
    await click(q(c, 'instances-open-all'))
    expect(c.textContent).toContain('WA chat')
    expect(c.textContent).toContain('TG chat')
    expect(q(c, 'messenger-badge-telegram')).not.toBeNull()
    await click(q(c, `instance-filter-${tg.id}`))
    expect(c.textContent).not.toContain('WA chat')
    expect(c.textContent).toContain('TG chat')
  })

  it('«Добавить инстанс» открывает форму с выбранным мессенджером и кнопкой назад', async () => {
    mounted = await mount(<App />)
    await flush()
    const c = mounted.container
    await click(q(c, 'instance-add-telegram'))
    expect(q(c, 'form-instance')).not.toBeNull()
    expect(c.textContent).toContain('Добавить инстанс')
    expect(q(c, 'messenger-telegram')!.getAttribute('aria-checked')).toBe('true')
    expect(q(c, 'messenger-whatsapp')!.getAttribute('aria-checked')).toBe('false')
    expect(q(c, 'messenger-hint')!.textContent).toContain('код из Telegram')
    expect(q(c, 'submit-instance')!.textContent).toContain('Добавить')
    await click(q(c, 'login-cancel'))
    expect(c.querySelector('[data-ui="instances-dashboard"]')).not.toBeNull()
  })

  it('в чате инстанса: иконка выхода → модалка Logout → статус notAuthorized и экран авторизации', async () => {
    mounted = await mount(<App />)
    await flush()
    const c = mounted.container
    await click(q(q(c, `instance-card-${wa.id}`)!, 'instance-open'))
    expect(c.textContent).toContain('WA chat')
    expect(c.textContent).not.toContain('TG chat')
    await click(c.querySelector('[title="Выйти из инстанса (Logout)"]'))
    expect(api.logout).not.toHaveBeenCalled()
    expect(c.textContent).toContain('notAuthorized')
    api.states = { '1101000001': 'notAuthorized' }
    await click(q(c, 'logout-confirm'))
    await flush()
    expect(api.logout).toHaveBeenCalledTimes(1)
    expect(c.querySelector('[data-ui="instance-unauthorized"]')).not.toBeNull()
    await click(q(c, 'unauthorized-qr'))
    expect(c.querySelector('[data-ui="instance-auth"]')).not.toBeNull()
  })
})
