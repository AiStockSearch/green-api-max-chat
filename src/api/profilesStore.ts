import { STORAGE_KEYS } from './constants'
import { clearAuth, loadAuth } from './credentialsStore'
import { getMessenger } from './messenger'
import type { Chat, GreenApiCredentials, InstanceProfile, StoredMessage } from './types'

const PROFILES_KEY = 'green-api-max-chat:profiles'

export function profileId(
  credentials: Pick<GreenApiCredentials, 'idInstance' | 'messenger'>,
): string {
  return `${getMessenger(credentials)}:${credentials.idInstance}`
}

export function makeProfile(
  credentials: GreenApiCredentials,
  opts: { label?: string; remember?: boolean; now?: number } = {},
): InstanceProfile {
  const messenger = getMessenger(credentials)
  return {
    ...credentials,
    messenger,
    id: profileId(credentials),
    label: opts.label?.trim() || `${credentials.idInstance}`,
    remember: Boolean(opts.remember),
    createdAt: opts.now ?? Date.now(),
  }
}

function read(storage: Storage): InstanceProfile[] {
  try {
    const raw = storage.getItem(PROFILES_KEY)
    const list = raw ? (JSON.parse(raw) as InstanceProfile[]) : []
    return Array.isArray(list) ? list.filter((p) => p && p.id && p.idInstance) : []
  } catch {
    return []
  }
}

function write(storage: Storage, list: InstanceProfile[]): void {
  if (list.length) {
    storage.setItem(PROFILES_KEY, JSON.stringify(list))
  } else {
    storage.removeItem(PROFILES_KEY)
  }
}

/**
 * Профили: «Запомнить» → localStorage, иначе sessionStorage (до закрытия вкладки).
 * Старая одиночная сессия инстанса мигрирует в профиль.
 */
export function loadProfiles(): InstanceProfile[] {
  const local = read(localStorage).map((p) => ({ ...p, remember: true }))
  const session = read(sessionStorage).map((p) => ({ ...p, remember: false }))
  const byId = new Map<string, InstanceProfile>()
  for (const p of [...local, ...session]) {
    byId.set(p.id, p)
  }
  if (byId.size === 0) {
    const legacy = loadAuth()
    if (legacy?.auth.mode === 'instance') {
      const migrated = makeProfile(legacy.auth.credentials, { remember: legacy.remember })
      saveProfiles([migrated])
      clearAuth()
      return [migrated]
    }
  }
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt)
}

export function saveProfiles(list: InstanceProfile[]): void {
  write(
    localStorage,
    list.filter((p) => p.remember),
  )
  write(
    sessionStorage,
    list.filter((p) => !p.remember),
  )
}

/** Добавить или обновить профиль (по id = messenger:idInstance). */
export function upsertProfile(
  list: InstanceProfile[],
  profile: InstanceProfile,
): InstanceProfile[] {
  const idx = list.findIndex((p) => p.id === profile.id)
  if (idx === -1) {
    return [...list, profile]
  }
  const next = [...list]
  next[idx] = { ...profile, createdAt: list[idx].createdAt }
  return next
}

export function removeProfile(list: InstanceProfile[], id: string): InstanceProfile[] {
  return list.filter((p) => p.id !== id)
}

/** Старые чаты/сообщения без instanceId привязываются к первому профилю. */
export function assignLegacyInstance<T extends Chat | StoredMessage>(
  items: T[],
  instanceId: string | undefined,
): T[] {
  if (!instanceId) {
    return items
  }
  return items.map((it) => (it.instanceId ? it : { ...it, instanceId }))
}

export function clearProfiles(): void {
  localStorage.removeItem(PROFILES_KEY)
  sessionStorage.removeItem(PROFILES_KEY)
}

export { STORAGE_KEYS }
