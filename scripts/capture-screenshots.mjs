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

const shots = [
  { file: '01-login.png', url: `${base}/` },
  { file: '02-empty-state.png', url: `${base}/?demo=empty` },
  { file: '03-new-chat-modal.png', url: `${base}/?demo=modal` },
  { file: '04-active-chat.png', url: `${base}/?demo=active` },
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

  const preview = spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)],
    { cwd: root, stdio: 'ignore', shell: true },
  )

  try {
    await waitForServer(base)
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

    for (const shot of shots) {
      await page.goto(shot.url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(800)
      await page.screenshot({ path: path.join(outDir, shot.file) })
    }

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
