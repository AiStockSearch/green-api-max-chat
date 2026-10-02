import { STORAGE_KEYS } from './constants'
import type { Chat, GreenApiCredentials, StoredMessage } from './types'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return fallback
    }
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadCredentials(): GreenApiCredentials | null {
  return readJson<GreenApiCredentials | null>(STORAGE_KEYS.credentials, null)
}

export function saveCredentials(credentials: GreenApiCredentials): void {
  writeJson(STORAGE_KEYS.credentials, credentials)
}

export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEYS.credentials)
}

export function loadChats(): Chat[] {
  return readJson<Chat[]>(STORAGE_KEYS.chats, [])
}

export function saveChats(chats: Chat[]): void {
  writeJson(STORAGE_KEYS.chats, chats)
}

export function loadMessages(): StoredMessage[] {
  return readJson<StoredMessage[]>(STORAGE_KEYS.messages, [])
}

export function saveMessages(messages: StoredMessage[]): void {
  writeJson(STORAGE_KEYS.messages, messages)
}

export function clearAllAppData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
}
