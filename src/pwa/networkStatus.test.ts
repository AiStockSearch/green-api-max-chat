import { describe, expect, it, vi } from 'vitest'
import { createNetworkStatus } from './networkStatus'

function setup(online = true) {
  let fail = false
  const timers: Array<() => void> = []
  const fetch = vi.fn(async () => {
    if (fail) throw new TypeError('Failed to fetch')
    return {}
  })
  const ns = createNetworkStatus({
    fetch,
    isBrowserOnline: () => online,
    probeUrl: () => '/sw.js?probe=1',
    setTimeout: (fn) => {
      timers.push(fn)
      return timers.length
    },
    clearTimeout: vi.fn(),
  })
  return { ns, fetch, timers, setFail: (v: boolean) => (fail = v) }
}

describe('networkStatus', () => {
  it('изначально по navigator.onLine', () => {
    expect(setup(true).ns.isOffline()).toBe(false)
    expect(setup(false).ns.isOffline()).toBe(true)
  })

  it('сетевая ошибка → проба HEAD без кэша; неудача → офлайн и повтор', async () => {
    const { ns, fetch, timers, setFail } = setup()
    const l = vi.fn()
    ns.subscribe(l)
    setFail(true)
    expect(await ns.probe()).toBe(false)
    expect(fetch).toHaveBeenCalledWith('/sw.js?probe=1', { method: 'HEAD', cache: 'no-store' })
    expect(ns.isOffline()).toBe(true)
    expect(l).toHaveBeenCalledTimes(1)
    expect(timers).toHaveLength(1)
    setFail(false)
    timers[0]()
    await vi.waitFor(() => expect(ns.isOffline()).toBe(false))
    expect(l).toHaveBeenCalledTimes(2)
  })

  it('события offline/online', async () => {
    const { ns } = setup()
    ns.setBrowserOnline(false)
    expect(ns.isOffline()).toBe(true)
    ns.setBrowserOnline(true)
    await vi.waitFor(() => expect(ns.isOffline()).toBe(false))
  })

  it('параллельные пробы объединяются', async () => {
    const { ns, fetch } = setup()
    await Promise.all([ns.probe(), ns.probe(), ns.probe()])
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
