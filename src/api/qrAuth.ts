import type { GreenApiCredentials } from './types'

export type QrResponseType = 'qrCode' | 'error' | 'alreadyLogged' | 'already_registered' | string

export interface QrApiResponse {
  type: QrResponseType
  message: string
}

/** Страница QR из документации: https://qr.green-api.com/waInstance{id}/{token}/v3 */
export function buildQrPageUrl(credentials: GreenApiCredentials): string {
  const id = credentials.idInstance
  const token = credentials.apiTokenInstance
  return `https://qr.green-api.com/waInstance${id}/${token}/v3`
}

export function qrDataUrlFromMessage(message: string): string | null {
  if (!message || message.startsWith('data:')) {
    return message.startsWith('data:') ? message : null
  }
  return `data:image/png;base64,${message}`
}

export function parseQrResponse(data: unknown): QrApiResponse | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }
  const row = data as { type?: string; message?: string }
  if (typeof row.type !== 'string') {
    return null
  }
  return {
    type: row.type,
    message: typeof row.message === 'string' ? row.message : '',
  }
}

export function isQrAlreadyAuthorized(type: QrResponseType): boolean {
  return type === 'alreadyLogged' || type === 'already_registered'
}
