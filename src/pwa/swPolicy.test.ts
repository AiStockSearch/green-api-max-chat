import { describe, expect, it } from 'vitest'
import { precacheEntries } from './precache'
import { isCacheableResponse, offlineFallbackPath, strategyFor } from './swPolicy'

const ORIGIN = 'https://aistocksearch.github.io'
const SCOPE = '/green-api-max-chat/'
const PRE = new Set([
  `${ORIGIN}${SCOPE}index.html`,
  `${ORIGIN}${SCOPE}assets/main-abc.js`,
  `${ORIGIN}${SCOPE}manifest.webmanifest`,
])
const get = (url: string, mode = 'cors') =>
  strategyFor({ url, method: 'GET', mode }, ORIGIN, SCOPE, PRE)

describe('SW policy: GREEN-API никогда не кэшируется', () => {
  it.each([
    'https://7107.api.greenapi.com/waInstance1101000001/getStateInstance/YOUR_API_TOKEN',
    'https://api.green-api.com/waInstance1101000001/receiveNotification/YOUR_API_TOKEN?receiveTimeout=5',
    'https://api.greenapi.com/partner/getInstances/gac.token',
    `${ORIGIN}${SCOPE}green-api-proxy/7107/waInstance1/sendMessage/YOUR_API_TOKEN`,
    `${ORIGIN}/green-api-proxy/api.green-api.com/waInstance1/qr/YOUR_API_TOKEN`,
    `${ORIGIN}${SCOPE}waInstance1101000001/getSettings/YOUR_API_TOKEN`,
  ])('network-only: %s', (url) => {
    expect(get(url)).toBe('network-only')
    expect(get(url, 'navigate')).toBe('network-only')
  })

  it('не-GET всегда сеть', () => {
    expect(
      strategyFor({ url: `${ORIGIN}${SCOPE}index.html`, method: 'POST' }, ORIGIN, SCOPE, PRE),
    ).toBe('network-only')
  })

  it('app shell из precache, навигация — network-first', () => {
    expect(get(`${ORIGIN}${SCOPE}assets/main-abc.js`)).toBe('precache')
    expect(get(`${ORIGIN}${SCOPE}assets/main-abc.js?v=1`)).toBe('precache')
    expect(get(`${ORIGIN}${SCOPE}?demo=active`, 'navigate')).toBe('navigation')
    expect(get(`${ORIGIN}${SCOPE}guide.html`, 'navigate')).toBe('navigation')
  })

  it('прочее same-origin, вне scope и чужие хосты — сеть; Google Fonts — font', () => {
    expect(get(`${ORIGIN}${SCOPE}screenshots/01-login.png`)).toBe('network-only')
    expect(get(`${ORIGIN}/other-app/index.html`, 'navigate')).toBe('network-only')
    expect(get('https://example.com/x.js')).toBe('network-only')
    expect(get('https://fonts.gstatic.com/s/inter/v1.woff2')).toBe('font')
    expect(get('https://fonts.googleapis.com/css2?family=Inter')).toBe('font')
    expect(get('chrome-extension://abc/x.js')).toBe('network-only')
    expect(get('not a url')).toBe('network-only')
  })
})

describe('isCacheableResponse', () => {
  it('отклоняет ответы GREEN-API, прокси и URL с токеном', () => {
    expect(isCacheableResponse('https://api.green-api.com/x', 200, 'cors')).toBe(false)
    expect(isCacheableResponse(`${ORIGIN}/green-api-proxy/7107/x`, 200, 'basic')).toBe(false)
    expect(isCacheableResponse(`${ORIGIN}/waInstance1/getStateInstance/t`, 200, 'basic')).toBe(
      false,
    )
    expect(isCacheableResponse('https://fonts.gstatic.com/a.woff2?token=1', 200, 'cors')).toBe(
      false,
    )
  })
  it('только успешные ответы', () => {
    expect(isCacheableResponse('https://fonts.gstatic.com/a.woff2', 200, 'cors')).toBe(true)
    expect(isCacheableResponse('https://fonts.gstatic.com/a.woff2', 0, 'opaque')).toBe(true)
    expect(isCacheableResponse('https://fonts.gstatic.com/a.woff2', 404, 'cors')).toBe(false)
    expect(isCacheableResponse('::', 200, 'cors')).toBe(false)
  })
})

describe('offlineFallbackPath / precacheEntries', () => {
  it('SPA-маршрут → index.html, отдельная .html-страница — сама', () => {
    expect(offlineFallbackPath(SCOPE, SCOPE)).toBe(`${SCOPE}index.html`)
    expect(offlineFallbackPath(`${SCOPE}index.html`, SCOPE)).toBe(`${SCOPE}index.html`)
    expect(offlineFallbackPath(`${SCOPE}guide.html`, SCOPE)).toBe(`${SCOPE}guide.html`)
  })
  it('precache: без sw.js, .map, dot-файлов и посторонних .html', () => {
    expect(
      precacheEntries(
        ['index.html', 'assets/main-1.js', 'assets/main-1.js.map', 'sw.js'],
        ['manifest.webmanifest', 'icons/pwa-192.png', '.nojekyll', 'guide.html', 'icons\\a.png'],
      ),
    ).toEqual([
      'assets/main-1.js',
      'icons/a.png',
      'icons/pwa-192.png',
      'index.html',
      'manifest.webmanifest',
    ])
  })
})
