import { describe, expect, it, vi } from 'vitest'
import { applyUpdate, registerServiceWorker, swUrl, watchRegistration } from './registerSW'

class Emitter {
  private handlers: Record<string, Array<() => void>> = {}
  addEventListener(type: string, fn: () => void) {
    ;(this.handlers[type] ??= []).push(fn)
  }
  emit(type: string) {
    for (const fn of this.handlers[type] ?? []) fn()
  }
}

class FakeWorker extends Emitter {
  state = 'installing'
  postMessage = vi.fn()
}

class FakeReg extends Emitter {
  waiting: FakeWorker | null = null
  installing: FakeWorker | null = null
  update = vi.fn(async () => undefined)
}

function container(controller: unknown, reg = new FakeReg()) {
  const c = new Emitter() as Emitter & {
    controller: unknown
    register: ReturnType<typeof vi.fn>
  }
  c.controller = controller
  c.register = vi.fn(async () => reg)
  return c
}

describe('registerSW', () => {
  it('swUrl учитывает base (GitHub Pages и Docker)', () => {
    expect(swUrl('/green-api-max-chat/')).toEqual({
      url: '/green-api-max-chat/sw.js',
      scope: '/green-api-max-chat/',
    })
    expect(swUrl('/')).toEqual({ url: '/sw.js', scope: '/' })
    expect(swUrl('/app')).toEqual({ url: '/app/sw.js', scope: '/app/' })
  })

  it('регистрирует с updateViaCache: none и периодической проверкой', async () => {
    const reg = new FakeReg()
    const c = container(null, reg)
    let tick: (() => void) | null = null
    await registerServiceWorker(
      '/green-api-max-chat/',
      {
        container: c as unknown as ServiceWorkerContainer,
        reload: vi.fn(),
        updateIntervalMs: 1000,
        setInterval: (fn) => {
          tick = fn
          return 1
        },
      },
      { onNeedRefresh: vi.fn() },
    )
    expect(c.register).toHaveBeenCalledWith('/green-api-max-chat/sw.js', {
      scope: '/green-api-max-chat/',
      updateViaCache: 'none',
    })
    tick!()
    expect(reg.update).toHaveBeenCalled()
  })

  it('ошибка регистрации не роняет приложение', async () => {
    const c = container(null)
    c.register = vi.fn(async () => {
      throw new Error('insecure')
    })
    const onError = vi.fn()
    const reg = await registerServiceWorker(
      '/',
      { container: c as unknown as ServiceWorkerContainer, reload: vi.fn(), updateIntervalMs: 0 },
      { onNeedRefresh: vi.fn(), onError },
    )
    expect(reg).toBeNull()
    expect(onError).toHaveBeenCalled()
  })

  it('первая установка → offlineReady, а не «Обновить»', () => {
    const reg = new FakeReg()
    const c = container(null)
    const cb = { onNeedRefresh: vi.fn(), onOfflineReady: vi.fn() }
    watchRegistration(
      reg as unknown as ServiceWorkerRegistration,
      c as unknown as ServiceWorkerContainer,
      cb,
    )
    const w = new FakeWorker()
    reg.installing = w
    reg.emit('updatefound')
    w.state = 'installed'
    w.emit('statechange')
    expect(cb.onOfflineReady).toHaveBeenCalled()
    expect(cb.onNeedRefresh).not.toHaveBeenCalled()
  })

  it('новая версия при активном контроллере → onNeedRefresh; уже ждущая — сразу', () => {
    const reg = new FakeReg()
    const c = container({})
    const cb = { onNeedRefresh: vi.fn() }
    const w = new FakeWorker()
    reg.waiting = w
    watchRegistration(
      reg as unknown as ServiceWorkerRegistration,
      c as unknown as ServiceWorkerContainer,
      cb,
    )
    expect(cb.onNeedRefresh).toHaveBeenCalledWith(w)
    const w2 = new FakeWorker()
    reg.installing = w2
    reg.waiting = null
    reg.emit('updatefound')
    w2.state = 'installed'
    w2.emit('statechange')
    expect(cb.onNeedRefresh).toHaveBeenLastCalledWith(w2)
  })

  it('applyUpdate: SKIP_WAITING и одна перезагрузка после controllerchange', () => {
    const c = container({})
    const reload = vi.fn()
    const w = new FakeWorker()
    applyUpdate(w as unknown as ServiceWorker, {
      container: c as unknown as ServiceWorkerContainer,
      reload,
    })
    expect(w.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    c.emit('controllerchange')
    c.emit('controllerchange')
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
