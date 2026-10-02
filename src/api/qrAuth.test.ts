import { describe, expect, it } from 'vitest'
import { buildQrPageUrl, parseQrResponse, qrDataUrlFromMessage } from './qrAuth'

describe('qrAuth', () => {
  it('buildQrPageUrl по документации qr.green-api.com', () => {
    expect(
      buildQrPageUrl({
        idInstance: '1101',
        apiTokenInstance: 'abc',
        apiUrl: 'https://api.green-api.com',
      }),
    ).toBe('https://qr.green-api.com/waInstance1101/abc/v3')
  })

  it('parseQrResponse qrCode', () => {
    expect(parseQrResponse({ type: 'qrCode', message: 'base64data' })?.type).toBe('qrCode')
  })

  it('qrDataUrlFromMessage добавляет data prefix', () => {
    expect(qrDataUrlFromMessage('abc')).toBe('data:image/png;base64,abc')
  })
})
