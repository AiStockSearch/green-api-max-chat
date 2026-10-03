#!/usr/bin/env node
/**
 * Скриншоты для docs/guide.html и README — только демо-режимы (?demo=…),
 * никаких реальных ключей. Сервис-воркер заблокирован, чтобы PWA-тосты
 * не попадали в кадр (PWA-кадры 27–30 снимает scripts/capture-pwa-screenshots.mjs).
 *
 *   npm run build && node scripts/capture-screenshots.mjs
 *   BASE=http://127.0.0.1:5173 node scripts/capture-screenshots.mjs   # против dev-сервера
 */
import http from 'node:http'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'docs', 'screenshots')
const port = 43124
const base = process.env.BASE ?? `http://127.0.0.1:${port}`
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null

const DESKTOP = { viewport: { width: 1280, height: 860 } }
const MOBILE = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
}

const tg = '[data-cy="instance-card-telegram:4100000001"]'

/** @type {{file: string, ctx: 'desktop'|'mobile', url: string, steps?: (page: import('playwright').Page) => Promise<void>, fullPage?: boolean}[]} */
const shots = [
  // 3. Добавление инстанса
  { file: '01-login.png', ctx: 'desktop', url: '/' },
  {
    file: '02-add-instance.png',
    ctx: 'desktop',
    url: '/?demo=dashboard',
    steps: async (p) => {
      await p.locator('[data-cy="instance-add-whatsapp"]').click()
      await p.locator('[data-cy="form-instance"]').waitFor()
    },
  },
  { file: '03-add-instance-mobile.png', ctx: 'mobile', url: '/', fullPage: true },
  {
    file: '04-partner-tab.png',
    ctx: 'desktop',
    url: '/',
    steps: async (p) => {
      await p.locator('[data-cy="account-mode-switcher"] button').nth(1).click()
    },
  },
  { file: '05-register.png', ctx: 'desktop', url: '/?demo=register' },
  { file: '06-partner-instances.png', ctx: 'desktop', url: '/?demo=partner' },
  { file: '07-create-instance.png', ctx: 'desktop', url: '/?demo=create-instance' },
  // 4. Дашборд
  { file: '08-instances-dashboard.png', ctx: 'desktop', url: '/?demo=dashboard' },
  {
    file: '09-instances-dashboard-mobile.png',
    ctx: 'mobile',
    url: '/?demo=dashboard',
    fullPage: true,
  },
  // 5. Авторизация
  { file: '10-instance-qr-auth.png', ctx: 'desktop', url: '/?demo=instance-qr' },
  {
    file: '11-telegram-code-auth.png',
    ctx: 'desktop',
    url: '/?demo=dashboard',
    steps: async (p) => {
      await p
        .locator(`${tg} [data-cy="instance-authorize"], [data-cy="instance-authorize"]`)
        .first()
        .click()
      await p.locator('[data-cy="tg-code-toggle"]').click()
    },
  },
  // 6. Чаты
  {
    file: '12-all-chats.png',
    ctx: 'desktop',
    url: '/?demo=dashboard',
    steps: async (p) => {
      await p.locator('[data-cy="instances-open-all"]').click()
      await p.locator('[data-cy="instance-switcher"]').waitFor()
    },
  },
  {
    file: '13-chat-filter.png',
    ctx: 'desktop',
    url: '/?demo=dashboard',
    steps: async (p) => {
      await p.locator('[data-cy="instances-open-all"]').click()
      await p.locator('[data-cy="instance-filter-whatsapp:7107000001"]').click()
      await p.getByText('+7 912 345-67-89').first().click()
    },
  },
  {
    file: '14-new-chat-modal.png',
    ctx: 'desktop',
    url: '/?demo=dashboard',
    steps: async (p) => {
      await p.locator('[data-cy="instances-open-all"]').click()
      await p.getByRole('button', { name: 'Новый чат' }).click()
      await p.locator('[data-cy="new-chat-instance"]').waitFor()
    },
  },
  { file: '15-active-chat.png', ctx: 'desktop', url: '/?demo=active' },
  { file: '16-empty-state.png', ctx: 'desktop', url: '/?demo=empty' },
  { file: '17-mobile-chat-list.png', ctx: 'mobile', url: '/?demo=mobile-list' },
  { file: '18-mobile-active-chat.png', ctx: 'mobile', url: '/?demo=mobile-chat' },
  // 7. Выйти / Убрать
  {
    file: '19-instance-logout-confirm.png',
    ctx: 'desktop',
    url: '/?demo=dashboard',
    steps: async (p) => {
      await p.locator('[data-cy="instance-logout"]').first().click()
      await p.locator('[data-cy="confirm-dialog-ok"]').waitFor()
    },
  },
  { file: '20-chat-logout-confirm.png', ctx: 'desktop', url: '/?demo=logout' },
  {
    file: '21-after-logout.png',
    ctx: 'desktop',
    url: '/?demo=dashboard',
    steps: async (p) => {
      await p.locator('[data-cy="instance-logout"]').first().click()
      await p.locator('[data-cy="confirm-dialog-ok"]').click()
      await p.locator('[data-cy="logout-notice"]').waitFor()
    },
  },
  {
    file: '22-remove-confirm.png',
    ctx: 'desktop',
    url: '/?demo=dashboard',
    steps: async (p) => {
      await p.locator('[data-cy="instance-remove"]').first().click()
      await p.locator('[data-cy="confirm-dialog-ok"]').waitFor()
    },
  },
  // 10. Ошибки
  { file: '23-instance-unauthorized.png', ctx: 'desktop', url: '/?demo=unauthorized' },
  { file: '24-network-error.png', ctx: 'desktop', url: '/?demo=network' },
  { file: '25-loading.png', ctx: 'desktop', url: '/?demo=loading', waitMs: 300 },
  {
    file: '26-login-error.png',
    ctx: 'desktop',
    url: '/?demo=error',
    steps: async (p) => {
      await p.evaluate(() => {
        document.activeElement instanceof HTMLElement && document.activeElement.blur()
        window.scrollTo(0, 0)
      })
    },
  },
]

function waitForServer(url, timeoutMs = 45000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume()
          resolve()
        })
        .on('error', () => {
          if (Date.now() - started > timeoutMs) {
            reject(new Error('Preview server did not start'))
            return
          }
          setTimeout(tick, 400)
        })
    }
    tick()
  })
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const preview = process.env.BASE
    ? null
    : spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
        cwd: root,
        stdio: 'ignore',
        shell: true,
      })

  try {
    await waitForServer(base)
    const browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH,
      args: ['--no-sandbox'],
    })
    const contexts = {
      desktop: await browser.newContext({ ...DESKTOP, serviceWorkers: 'block', locale: 'ru-RU' }),
      mobile: await browser.newContext({ ...MOBILE, serviceWorkers: 'block', locale: 'ru-RU' }),
    }
    for (const shot of shots) {
      if (only && !only.has(shot.file)) continue
      const page = await contexts[shot.ctx].newPage()
      await page.goto(base + shot.url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      if (shot.steps) {
        await shot.steps(page)
      }
      await page.waitForTimeout(shot.waitMs ?? 700)
      await page.screenshot({
        path: path.join(outDir, shot.file),
        fullPage: shot.fullPage ?? false,
      })
      await page.close()
      console.log('✓', shot.file)
    }
    await browser.close()
    console.log('Screenshots saved to docs/screenshots/')
  } finally {
    preview?.kill('SIGTERM')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
