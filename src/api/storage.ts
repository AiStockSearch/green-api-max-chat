import { STORAGE_KEYS } from './constants'
import { clearAuth, loadAuth, saveAuth, type PersistedAuth } from './credentialsStore'
import type { GreenApiCredentials } from './types'

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
  const loaded = loadAuth()
  if (loaded?.auth.mode === 'instance') {
    return loaded.auth.credentials
  }
  return null
}

export function saveCredentials(
  credentials: GreenApiCredentials,
  remember = false,
): void {
  const auth: PersistedAuth = { mode: 'instance', credentials }
  saveAuth(auth, remember)
}

export function clearCredentials(): void {
  clearAuth()
}

export function loadChats(): import('./types').Chat[] {
  return readJson(STORAGE_KEYS.chats, [])
}

export function saveChats(chats: import('./types').Chat[]): void {
  writeJson(STORAGE_KEYS.chats, chats)
}

export function loadMessages(): import('./types').StoredMessage[] {
  return readJson(STORAGE_KEYS.messages, [])
}

export function saveMessages(messages: import('./types').StoredMessage[]): void {
  writeJson(STORAGE_KEYS.messages, messages)
}

export function clearAllAppData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
  clearAuth()
}
