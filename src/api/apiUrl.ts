import { DEFAULT_API_URL } from './constants'

export function normalizeApiUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) {
    return DEFAULT_API_URL
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}
