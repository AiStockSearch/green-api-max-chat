import { reportNetworkFailure } from '../pwa/networkStatus'
import { DEFAULT_API_URL } from './constants'
import { resolveDevProxyFetchUrl } from './devProxy'
import { normalizeApiUrl } from './greenApi'
import { messengerFromTypeInstance } from './messenger'
import { GreenApiError } from './types'

export interface PartnerCredentials {
  partnerToken: string
  partnerApiUrl: string
}

export interface PartnerInstanceRecord {
  idInstance: number
  name: string
  typeInstance: string
  apiTokenInstance: string
  deleted: boolean
  tariff?: string
  isExpired?: boolean
}

export interface CreateInstancePayload {
  name?: string
  webhookUrl?: string
  incomingWebhook?: string
  stateWebhook?: string
}

export interface CreateInstanceResponse {
  idInstance: number
  apiTokenInstance: string
  apiUrl: string
  mediaUrl?: string
  typeInstance: string
}

/** Документация: {{partnerApiUrl}}/partner/{method}/{{partnerToken}} */
export function partnerMethodUrl(
  partner: PartnerCredentials,
  method: string,
): string {
  const base = normalizeApiUrl(partner.partnerApiUrl || DEFAULT_API_URL)
  return `${base}/partner/${method}/${encodeURIComponent(partner.partnerToken)}`
}

export function partnerGetInstancesUrl(partner: PartnerCredentials): string {
  return partnerMethodUrl(partner, 'getInstances')
}

export function partnerCreateInstanceUrl(partner: PartnerCredentials): string {
  return partnerMethodUrl(partner, 'createInstance')
}

export function partnerDeleteInstanceAccountUrl(partner: PartnerCredentials): string {
  return partnerMethodUrl(partner, 'deleteInstanceAccount')
}

function parsePartnerError(data: unknown): never {
  if (typeof data === 'object' && data !== null && 'code' in data) {
    const row = data as { code?: number; description?: string }
    throw new GreenApiError(
      row.description ?? 'Ошибка Partner API',
      row.code,
    )
  }
  throw new GreenApiError('Неожиданный ответ Partner API')
}

async function partnerRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const fetchUrl = resolveDevProxyFetchUrl(url)
  let response: Response
  try {
    response = await fetch(fetchUrl, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    reportNetworkFailure()
    throw new GreenApiError(
      'Сетевая ошибка / CORS: не удалось вызвать Partner API из браузера.',
    )
  }

  const text = await response.text()
  if (!text) {
    throw new GreenApiError('Пустой ответ Partner API', response.status)
  }

  let data: unknown
  try {
    data = JSON.parse(text) as unknown
  } catch {
    throw new GreenApiError('Не удалось разобрать ответ Partner API', response.status)
  }

  if (typeof data === 'object' && data !== null && 'code' in data) {
    parsePartnerError(data)
  }

  if (!response.ok) {
    throw new GreenApiError(`Partner API (${response.status})`, response.status, text)
  }

  return data as T
}

export async function getInstances(
  partner: PartnerCredentials,
): Promise<PartnerInstanceRecord[]> {
  const url = partnerGetInstancesUrl(partner)
  const data = await partnerRequest<PartnerInstanceRecord[]>(url, { method: 'GET' })
  return Array.isArray(data) ? data : []
}

export async function createInstance(
  partner: PartnerCredentials,
  payload: CreateInstancePayload,
): Promise<CreateInstanceResponse> {
  const url = partnerCreateInstanceUrl(partner)
  const data = await partnerRequest<CreateInstanceResponse>(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!data?.idInstance || !data.apiTokenInstance) {
    throw new GreenApiError('createInstance: неполный ответ')
  }
  return data
}

export async function deleteInstanceAccount(
  partner: PartnerCredentials,
  idInstance: number,
): Promise<boolean> {
  const url = partnerDeleteInstanceAccountUrl(partner)
  const data = await partnerRequest<{ deleteInstanceAccount?: boolean }>(url, {
    method: 'POST',
    body: JSON.stringify({ idInstance }),
  })
  return Boolean(data.deleteInstanceAccount)
}

export function instanceCredentialsFromCreate(
  created: CreateInstanceResponse,
): import('./types').GreenApiCredentials {
  return {
    idInstance: String(created.idInstance),
    apiTokenInstance: created.apiTokenInstance,
    apiUrl: normalizeApiUrl(created.apiUrl),
    messenger: messengerFromTypeInstance(created.typeInstance),
  }
}

export function instanceCredentialsFromPartnerRow(
  row: PartnerInstanceRecord,
  partnerApiUrl: string,
): import('./types').GreenApiCredentials {
  return {
    idInstance: String(row.idInstance),
    apiTokenInstance: row.apiTokenInstance,
    apiUrl: normalizeApiUrl(partnerApiUrl),
    messenger: messengerFromTypeInstance(row.typeInstance),
  }
}
