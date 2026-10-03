import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeProfile } from '../../api/profilesStore'
import { click, flush, mount, q, type Mounted } from '../../test/dom'
import { InstancesDashboard } from './InstancesDashboard'

const wa = makeProfile(
  {
    idInstance: '1101000001',
    apiTokenInstance: 't',
    apiUrl: 'https://api.green-api.com',
    messenger: 'whatsapp',
  },
  { label: 'Продажи', now: 1 },
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

function setup(over: Partial<Parameters<typeof InstancesDashboard>[0]> = {}) {
  const props = {
    profiles: [wa, tg],
    states: { [wa.id]: 'authorized', [tg.id]: 'notAuthorized' },
    onRefresh: vi.fn(),
    onOpen: vi.fn(),
    onOpenAll: vi.fn(),
    onAuthorize: vi.fn(),
    onLogoutInstance: vi.fn(async () => true),
    onRemove: vi.fn(),
    onAdd: vi.fn(),
    ...over,
  }
  return { props, view: mount(<InstancesDashboard {...props} />) }
}

let mounted: Mounted | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('InstancesDashboard', () => {
  it('карточки: бейдж мессенджера, статус, кнопки по состоянию', async () => {
    const { view } = setup()
    mounted = await view
    const card = q(mounted.container, `instance-card-${wa.id}`)!
    const tgCard = q(mounted.container, `instance-card-${tg.id}`)!
    expect(card.textContent).toContain('Продажи')
    expect(card.textContent).toContain('Авторизован')
    expect(q(card, 'messenger-badge-whatsapp')).not.toBeNull()
    expect(q(card, 'instance-logout')).not.toBeNull()
    expect(tgCard.textContent).toContain('Неавторизован')
    expect(q(tgCard, 'instance-logout')).toBeNull()
    expect(q(tgCard, 'instance-authorize')).not.toBeNull()
  })

  it('«Выйти из инстанса»: сначала подтверждение, потом Logout и предложение QR', async () => {
    const { props, view } = setup()
    mounted = await view
    await click(q(q(mounted.container, `instance-card-${wa.id}`)!, 'instance-logout'))
    expect(props.onLogoutInstance).not.toHaveBeenCalled()
    const dialog = q(mounted.container, 'confirm-logout')!
    expect(dialog.textContent).toContain('Logout')
    await click(q(dialog, 'confirm-dialog-ok'))
    await flush()
    expect(props.onLogoutInstance).toHaveBeenCalledWith(wa.id)
    expect(q(mounted.container, 'confirm-logout')).toBeNull()
    const notice = q(mounted.container, 'logout-notice')!
    expect(notice.textContent).toContain('авторизуйтесь по QR')
    await click(notice.querySelector('button'))
    expect(props.onAuthorize).toHaveBeenCalledWith(wa.id)
  })

  it('Logout с isLogout=false — ошибка в модалке, модалка остаётся', async () => {
    const { view } = setup({ onLogoutInstance: vi.fn(async () => false) })
    mounted = await view
    await click(q(q(mounted.container, `instance-card-${wa.id}`)!, 'instance-logout'))
    await click(q(mounted.container, 'confirm-dialog-ok'))
    await flush()
    expect(q(mounted.container, 'confirm-logout')!.textContent).toContain('isLogout=false')
    expect(q(mounted.container, 'logout-notice')).toBeNull()
  })

  it('«Убрать из приложения»: подтверждение → onRemove, Logout не вызывается; отмена ничего не делает', async () => {
    const { props, view } = setup()
    mounted = await view
    const card = () => q(mounted!.container, `instance-card-${tg.id}`)!
    await click(q(card(), 'instance-remove'))
    const dialog = mounted.container.querySelector('[role="alertdialog"]')!
    await click([...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Отмена'))
    expect(props.onRemove).not.toHaveBeenCalled()
    await click(q(card(), 'instance-remove'))
    await click(q(mounted.container, 'confirm-dialog-ok'))
    expect(props.onRemove).toHaveBeenCalledWith(tg.id)
    expect(props.onLogoutInstance).not.toHaveBeenCalled()
  })

  it('«Добавить инстанс» с выбором мессенджера', async () => {
    const { props, view } = setup()
    mounted = await view
    await click(q(mounted.container, 'instance-add-telegram'))
    expect(props.onAdd).toHaveBeenCalledWith('telegram')
    await click(q(mounted.container, 'instances-open-all'))
    expect(props.onOpenAll).toHaveBeenCalled()
  })
})
