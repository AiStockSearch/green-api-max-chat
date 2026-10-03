#!/usr/bin/env node
/**
 * PWA-скриншоты для гайда (27, 29, 30) по собранному dist/ — демо-режимы, без реальных ключей.
 *   npm run build && node scripts/capture-pwa-screenshots.mjs
 * Кадр 28 (окно установленного приложения) снимается вручную: chrome --app=<url>/?demo=active.
 */
import http from 'node:http'
import { mkdtempSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dist = path.join(root, 'dist')
const outDir = path.join(root, 'docs', 'screenshots')
const port = 43126
const base = `http://127.0.0.1:${port}`
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}
let swSuffix = ''

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, base)
  let file = path.join(dist, decodeURIComponent(url.pathname))
  if (!file.startsWith(dist)) return res.writeHead(403).end()
  let body
  try {
    body = await readFile(url.pathname === '/' ? path.join(dist, 'index.html') : file)
  } catch {
    file = path.join(dist, 'index.html')
    body = await readFile(file)
  }
  if (url.pathname === '/sw.js' && swSuffix) body = Buffer.concat([body, Buffer.from(swSuffix)])
  const ext = url.pathname === '/' ? '.html' : path.extname(file)
  res.writeHead(200, {
    'Content-Type': types[ext] ?? 'application/octet-stream',
    'Cache-Control': url.pathname.startsWith('/assets/') ? 'max-age=31536000' : 'no-cache',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
})
await new Promise((r) => server.listen(port, '127.0.0.1', r))

const context = await chromium.launchPersistentContext(
  mkdtempSync(path.join(tmpdir(), 'pwa-shots-')),
  {
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox'],
    viewport: { width: 1280, height: 800 },
    locale: 'ru-RU',
  },
)
const page = context.pages()[0] ?? (await context.newPage())
const shot = (name) => page.screenshot({ path: path.join(outDir, name) })
const dismiss = async (sel, label) => {
  const t = page.locator(sel)
  if (await t.isVisible().catch(() => false)) await t.getByRole('button', { name: label }).click()
}

try {
  // 27 — предложение установки на экране инстансов
  await page.goto(`${base}/?demo=dashboard`, { waitUntil: 'load' })
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload({ waitUntil: 'load' })
  await page.locator('[data-cy="pwa-install"]').waitFor({ timeout: 20000 })
  await dismiss('[data-cy="pwa-offline-ready"]', 'OK')
  await page.waitForTimeout(500)
  await shot('27-pwa-install-prompt.png')
  console.log('✓ 27-pwa-install-prompt.png')

  // 29 — офлайн: app shell из кеша + «Нет сети»
  await page.goto(`${base}/?demo=active`, { waitUntil: 'load' })
  await context.setOffline(true)
  await page.reload({ waitUntil: 'load' })
  await page.locator('[data-cy="offline-banner"]').waitFor({ timeout: 15000 })
  await dismiss('[data-cy="pwa-install"]', 'Не сейчас')
  await dismiss('[data-cy="pwa-offline-ready"]', 'OK')
  await page.waitForTimeout(500)
  await shot('29-pwa-offline.png')
  console.log('✓ 29-pwa-offline.png')
  await context.setOffline(false)

  // 30 — новая версия sw.js → «Доступна новая версия»
  await page.goto(`${base}/?demo=dashboard`, { waitUntil: 'load' })
  swSuffix = `\n// update ${Date.now()}\n`
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.update()))
  await page.locator('[data-cy="pwa-update"]').waitFor({ timeout: 20000 })
  await dismiss('[data-cy="pwa-install"]', 'Не сейчас')
  await dismiss('[data-cy="pwa-offline-ready"]', 'OK')
  await page.waitForTimeout(500)
  await shot('30-pwa-update.png')
  console.log('✓ 30-pwa-update.png')
} finally {
  await context.close()
  server.close()
}
