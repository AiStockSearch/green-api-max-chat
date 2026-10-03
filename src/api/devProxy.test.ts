import { afterEach, describe, expect, it, vi } from 'vitest'

describe('resolveDevProxyBase', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('в prod без флага возвращает исходный URL', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_GREEN_API_SAME_ORIGIN_PROXY', '')
    const { resolveDevProxyBase } = await import('./devProxy')
    expect(resolveDevProxyBase('https://7107.api.greenapi.com')).toBe(
      'https://7107.api.greenapi.com',
    )
  })

  it('в prod с VITE_GREEN_API_SAME_ORIGIN_PROXY строит same-origin прокси', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_GREEN_API_SAME_ORIGIN_PROXY', 'true')
    vi.stubGlobal('window', {
      location: { origin: 'http://127.0.0.1:8080', hostname: '127.0.0.1', port: '8080' },
    })
    const { resolveDevProxyFetchUrl } = await import('./devProxy')
    expect(
      resolveDevProxyFetchUrl(
        'https://api.green-api.com/partner/getInstances/token',
      ),
    ).toBe('http://127.0.0.1:8080/green-api-proxy/api.green-api.com/partner/getInstances/token')
  })

  it('в dev строит same-origin прокси', async () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('MODE', 'development')
    vi.stubGlobal('window', {
      location: { origin: 'http://127.0.0.1:43123', hostname: '127.0.0.1', port: '43123' },
    })
    const { resolveDevProxyFetchUrl } = await import('./devProxy')
    expect(
      resolveDevProxyFetchUrl(
        'https://7107.api.greenapi.com/waInstance1/getStateInstance/token',
      ),
    ).toBe(
      'http://127.0.0.1:43123/green-api-proxy/7107/waInstance1/getStateInstance/token',
    )
  })
})
