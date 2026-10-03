import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ReactElement } from 'react'

// React 19: разрешаем act() в jsdom
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

export interface Mounted {
  container: HTMLDivElement
  root: Root
  unmount: () => void
}

export async function mount(el: ReactElement): Promise<Mounted> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(el)
  })
  return {
    container,
    root,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

export async function click(el: Element | null | undefined): Promise<void> {
  if (!el) throw new Error('element not found')
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}

export async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

export function q(root: ParentNode, cy: string): HTMLElement | null {
  return root.querySelector(`[data-cy="${cy}"]`)
}
