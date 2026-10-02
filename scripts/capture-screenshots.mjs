#!/usr/bin/env node
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
const base = `http://127.0.0.1:${port}`

const desktopShots = [
  { file: '01-login.png', url: `${base}/` },
  { file: '02-empty-state.png', url: `${base}/?demo=empty` },
  { file: '03-new-chat-modal.png', url: `${base}/?demo=modal` },
  { file: '04-active-chat.png', url: `${base}/?demo=active` },
  { file: '05-login-error.png', url: `${base}/?demo=error` },
  { file: '06-instance-unauthorized.png', url: `${base}/?demo=unauthorized` },
  { file: '07-network-error.png', url: `${base}/?demo=network` },
  { file: '08-loading.png', url: `${base}/?demo=loading` },
  { file: '09-logout-confirm.png', url: `${base}/?demo=logout` },
]

const mobileShots = [
  { file: '10-mobile-chat-list.png', url: `${base}/?demo=mobile-list` },
  { file: '11-mobile-active-chat.png', url: `${base}/?demo=mobile-chat` },
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

async function capture(page, shots) {
  for (const shot of shots) {
    await page.goto(shot.url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(shot.waitMs ?? 800)
    await page.screenshot({ path: path.join(outDir, shot.file) })
  }
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const preview = spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)],
    { cwd: root, stdio: 'ignore', shell: true },
  )

  try {
    await waitForServer(base)
    const browser = await chromium.launch()

    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await capture(desktop, desktopShots)
    await desktop.close()

    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    })
    await capture(mobile, mobileShots)
    await mobile.close()

    await browser.close()
    console.log('Screenshots saved to docs/screenshots/')
  } finally {
    preview.kill('SIGTERM')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
