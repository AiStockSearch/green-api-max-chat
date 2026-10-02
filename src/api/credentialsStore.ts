import { STORAGE_KEYS } from './constants'
import type { GreenApiCredentials } from './types'
import type { PartnerCredentials } from './partnerApi'

const AUTH_SESSION_KEY = 'green-api-max-chat:auth-session'

export type PersistedAuth =
  | {
      mode: 'instance'
      credentials: GreenApiCredentials
    }
  | {
      mode: 'partner'
      partner: PartnerCredentials
    }

export interface LoadedAuth {
  auth: PersistedAuth
  remember: boolean
}

function readAuth(storage: Storage): PersistedAuth | null {
  try {
    const raw = storage.getItem(AUTH_SESSION_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as PersistedAuth
  } catch {
    return null
  }
}

/** Миграция старого ключа localStorage credentials. */
function migrateLegacyCredentials(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.credentials)
    if (!raw) {
      return null
    }
    const credentials = JSON.parse(raw) as GreenApiCredentials
    if (!credentials?.idInstance) {
      return null
    }
    const auth: PersistedAuth = { mode: 'instance', credentials }
    saveAuth(auth, true)
    localStorage.removeItem(STORAGE_KEYS.credentials)
    return auth
  } catch {
    return null
  }
}

export function loadAuth(): LoadedAuth | null {
  const fromLocal = readAuth(localStorage)
  if (fromLocal) {
    return { auth: fromLocal, remember: true }
  }
  const fromSession = readAuth(sessionStorage)
  if (fromSession) {
    return { auth: fromSession, remember: false }
  }
  const legacy = migrateLegacyCredentials()
  if (legacy) {
    return { auth: legacy, remember: true }
  }
  return null
}

export function saveAuth(auth: PersistedAuth, remember: boolean): void {
  const payload = JSON.stringify(auth)
  if (remember) {
    localStorage.setItem(AUTH_SESSION_KEY, payload)
    sessionStorage.removeItem(AUTH_SESSION_KEY)
  } else {
    sessionStorage.setItem(AUTH_SESSION_KEY, payload)
    localStorage.removeItem(AUTH_SESSION_KEY)
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_SESSION_KEY)
  sessionStorage.removeItem(AUTH_SESSION_KEY)
  localStorage.removeItem(STORAGE_KEYS.credentials)
}

export function credentialsFromAuth(auth: PersistedAuth): GreenApiCredentials | null {
  if (auth.mode === 'instance') {
    return auth.credentials
  }
  return null
}

export async function offerPasswordManagerSave(opts: {
  username: string
  password: string
  name?: string
}): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }
  const PasswordCredentialCtor = (
    window as Window & { PasswordCredential?: typeof PasswordCredential }
  ).PasswordCredential
  if (!PasswordCredentialCtor || !navigator.credentials?.store) {
    return
  }
  try {
    const cred = new PasswordCredentialCtor({
      id: opts.username,
      password: opts.password,
      name: opts.name ?? 'GREEN-API MAX',
    })
    await navigator.credentials.store(cred)
  } catch {
    /* менеджер паролей необязателен */
  }
}
