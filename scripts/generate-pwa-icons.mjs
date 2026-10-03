// Генерация PNG-иконок PWA из public/icons/app-icon.svg (headless Chrome через Playwright).
// Запуск: node scripts/generate-pwa-icons.mjs [путь к chrome]
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const svg = readFileSync(new URL('../public/icons/app-icon.svg', import.meta.url), 'utf8')
const out = new URL('../public/icons/', import.meta.url).pathname
const executablePath = process.argv[2] || process.env.CHROME_PATH || undefined
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })

// purpose any: скруглённый квадрат на прозрачном фоне; maskable/apple: full-bleed
const variants = [
  { file: 'pwa-192.png', size: 192, rounded: true },
  { file: 'pwa-512.png', size: 512, rounded: true },
  { file: 'pwa-maskable-512.png', size: 512, rounded: false },
  { file: 'apple-touch-icon-180.png', size: 180, rounded: false },
  { file: 'favicon-32.png', size: 32, rounded: true },
]
for (const v of variants) {
  const page = await browser.newPage({ viewport: { width: v.size, height: v.size } })
  const radius = v.rounded ? Math.round(v.size * 0.22) : 0
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><div style="width:${v.size}px;height:${v.size}px;border-radius:${radius}px;overflow:hidden">${svg.replace('<svg ', `<svg width="${v.size}" height="${v.size}" `)}</div></body></html>`,
  )
  await page.screenshot({ path: out + v.file, omitBackground: true })
  await page.close()
}
await browser.close()
console.log('icons written to', out)
