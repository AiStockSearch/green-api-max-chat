import { afterEach, describe, expect, it, vi } from 'vitest'
import { click, mount, q, type Mounted } from '../../test/dom'
import { MessengerSwitcher } from './MessengerSwitcher'

let mounted: Mounted | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('MessengerSwitcher', () => {
  it('три карточки в порядке WhatsApp, Telegram, MAX; выбранная помечена aria-checked', async () => {
    const onChange = vi.fn()
    mounted = await mount(<MessengerSwitcher value="max" onChange={onChange} />)
    const radios = [...mounted.container.querySelectorAll('[role="radio"]')]
    expect(radios.map((r) => r.lastElementChild?.textContent)).toEqual(['WhatsApp', 'Telegram', 'MAX'])
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true'])
    expect(radios.every((r) => r.querySelector('svg'))).toBe(true)
    await click(q(mounted.container, 'messenger-whatsapp'))
    expect(onChange).toHaveBeenCalledWith('whatsapp')
  })
})
