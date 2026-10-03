// Проверка PWA в headless Chrome (Playwright + CDP):
//   манифест и installability (Page.getInstallabilityErrors), регистрация SW и контроль страницы,
//   содержимое Cache Storage (нет GREEN-API / токенов), офлайн-запуск app shell + баннер «Нет сети».
// Использование: node scripts/verify-pwa.mjs <url приложения> [папка для скриншотов] [chrome]
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const appUrl = process.argv[2]
const shotsDir = process.argv[3] || ''
const executablePath = process.argv[4] || process.env.CHROME_PATH || undefined
if (!appUrl) {
  console.error('usage: node scripts/verify-pwa.mjs <url> [shotsDir] [chrome]')
  process.exit(2)
}
const results = []
const check = (name, ok, details = '') => {
  results.push({ name, ok, details })
  console.log(`${ok ? '✓' : '✗'} ${name}${details ? ` — ${details}` : ''}`)
}

// Постоянный профиль: в инкогнито Chrome не считает приложение устанавливаемым
const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'pwa-')), {
  executablePath,
  args: ['--no-sandbox'],
  viewport: { width: 1280, height: 800 },
})
const page = context.pages()[0] ?? (await context.newPage())
const cdp = await context.newCDPSession(page)

await page.goto(appUrl, { waitUntil: 'load' })
await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
await page.reload({ waitUntil: 'load' })
const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller))
check('Service Worker зарегистрирован и контролирует страницу', controlled)
const swInfo = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration()
  return { scope: reg?.scope, script: reg?.active?.scriptURL }
})
check('SW scope', Boolean(swInfo.scope), `${swInfo.scope} (${swInfo.script})`)

const manifest = await cdp.send('Page.getAppManifest')
const parsed = JSON.parse(manifest.data || '{}')
check('Манифест загружен без ошибок', manifest.errors.length === 0, manifest.url)
check(
  'Манифест: name / short_name / lang / display',
  parsed.name === 'GREEN-API Chat' && Boolean(parsed.short_name) && parsed.lang === 'ru' && parsed.display === 'standalone',
  `${parsed.name} · ${parsed.short_name} · ${parsed.lang} · ${parsed.display}`,
)
const icons = parsed.icons || []
check(
  'Иконки 192, 512 и maskable',
  icons.some((i) => i.sizes === '192x192') && icons.some((i) => i.sizes === '512x512') && icons.some((i) => i.purpose === 'maskable'),
)
const inst = await cdp.send('Page.getInstallabilityErrors')
check(
  'Installability: нет ошибок (Chrome готов предложить установку)',
  inst.installabilityErrors.length === 0,
  inst.installabilityErrors.map((e) => e.errorId).join(', '),
)
const head = await page.evaluate(() => ({
  apple: Boolean(document.querySelector('link[rel="apple-touch-icon"]')),
  appleCapable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content'),
  theme: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
}))
check('iOS: apple-touch-icon и apple-mobile-web-app-capable', head.apple && head.appleCapable === 'yes')
check('theme-color', head.theme === '#0077ff', head.theme)

// Запрос «к GREEN-API» через same-origin прокси: SW не должен его перехватывать и кэшировать
const proxyUrl = new URL('green-api-proxy/7107/waInstance1101000001/getStateInstance/YOUR_API_TOKEN', swInfo.scope).href
await page.evaluate((u) => fetch(u).catch(() => null), proxyUrl)
const cached = await page.evaluate(async () => {
  const out = []
  for (const key of await caches.keys()) {
    const cache = await caches.open(key)
    for (const req of await cache.keys()) out.push(`${key} ${req.url}`)
  }
  return out
})
const bad = cached.filter((u) => /green-api-proxy|green-?api\.com|waInstance|token/i.test(u))
check('Cache Storage: нет запросов GREEN-API и токенов', bad.length === 0, `${cached.length} записей; плохих: ${bad.length}`)
check('Cache Storage: app shell в precache', cached.some((u) => /index\.html$/.test(u)) && cached.some((u) => /assets\/.*\.js$/.test(u)))

await context.setOffline(true)
await page.reload({ waitUntil: 'load' }).catch(() => null)
await page.waitForTimeout(800)
console.log('  navigator.onLine =', await page.evaluate(() => navigator.onLine))
const offlineOk = await page.evaluate(() => ({
  root: (document.getElementById('root')?.childElementCount ?? 0) > 0,
  banner: Boolean(document.querySelector('[data-cy="offline-banner"]')),
}))
check('Офлайн: app shell загружается из кэша', offlineOk.root)
check('Офлайн: баннер «Нет сети»', offlineOk.banner)
if (shotsDir) await page.screenshot({ path: `${shotsDir}/pwa-offline.png` })
await context.setOffline(false)

await context.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} проверок пройдено`)
process.exit(failed.length ? 1 : 0)
