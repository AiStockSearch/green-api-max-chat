import { afterEach, describe, expect, it, vi } from 'vitest'
import { click, mount, q, type Mounted } from '../test/dom'
import { PwaLayerView } from './PwaLayer'

let mounted: Mounted | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
})

const base = {
  online: true,
  needRefresh: false,
  onUpdate: vi.fn(),
  onDismissRefresh: vi.fn(),
  offlineReady: false,
  onDismissOfflineReady: vi.fn(),
  canInstall: false,
  onInstall: vi.fn(),
  onDismissInstall: vi.fn(),
}

describe('PwaLayerView', () => {
  it('онлайн и без событий — ничего не показывает', async () => {
    mounted = await mount(<PwaLayerView {...base} />)
    expect(mounted.container.textContent).toBe('')
  })

  it('офлайн — баннер «Нет сети»', async () => {
    mounted = await mount(<PwaLayerView {...base} online={false} />)
    expect(q(mounted.container, 'offline-banner')!.textContent).toContain('Нет сети')
  })

  it('«Доступна новая версия — Обновить»', async () => {
    const onUpdate = vi.fn()
    mounted = await mount(<PwaLayerView {...base} needRefresh onUpdate={onUpdate} canInstall />)
    expect(q(mounted.container, 'pwa-update')!.textContent).toContain('Доступна новая версия')
    expect(q(mounted.container, 'pwa-install')).toBeNull()
    await click(q(mounted.container, 'pwa-update-apply'))
    expect(onUpdate).toHaveBeenCalled()
  })

  it('предложение установки', async () => {
    const onInstall = vi.fn()
    mounted = await mount(<PwaLayerView {...base} canInstall onInstall={onInstall} />)
    await click(q(mounted.container, 'pwa-install-apply'))
    expect(onInstall).toHaveBeenCalled()
  })
})
