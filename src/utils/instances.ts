import type { Chat, InstanceProfile, StoredMessage } from '../api/types'

export type InstanceFilter = 'all' | string

export interface StateBadge {
  label: string
  tone: 'ok' | 'warn' | 'error' | 'unknown'
}

/** Бейдж состояния как в консоли GREEN-API. */
export function instanceStateBadge(state: string | null | undefined): StateBadge {
  switch (state) {
    case 'authorized':
      return { label: 'Авторизован', tone: 'ok' }
    case 'notAuthorized':
      return { label: 'Неавторизован', tone: 'warn' }
    case 'pendingPassword':
      return { label: 'Ждёт пароль 2FA', tone: 'warn' }
    case 'starting':
      return { label: 'Запускается', tone: 'warn' }
    case 'blocked':
      return { label: 'Заблокирован', tone: 'error' }
    case 'suspended':
      return { label: 'Приостановлен', tone: 'error' }
    case 'error':
      return { label: 'Ошибка проверки', tone: 'error' }
    case undefined:
    case null:
      return { label: 'Проверка…', tone: 'unknown' }
    default:
      return { label: state, tone: 'unknown' }
  }
}

/** Чат принадлежит инстансу; чаты без instanceId (старые) относятся к единственному профилю. */
export function chatBelongsTo(
  chat: Chat,
  instanceId: string,
  profiles: InstanceProfile[],
): boolean {
  if (chat.instanceId) {
    return chat.instanceId === instanceId
  }
  return profiles.length === 1 && profiles[0].id === instanceId
}

/** Чаты для фильтра: 'all' — все известные инстансы (единый список), иначе — один инстанс. */
export function visibleChats(
  chats: Chat[],
  filter: InstanceFilter,
  profiles: InstanceProfile[],
): Chat[] {
  if (filter === 'all') {
    const ids = new Set(profiles.map((p) => p.id))
    return chats.filter((c) => !c.instanceId || ids.has(c.instanceId))
  }
  return chats.filter((c) => chatBelongsTo(c, filter, profiles))
}

export function profileForChat(
  chat: Chat | null | undefined,
  profiles: InstanceProfile[],
): InstanceProfile | null {
  if (!chat) {
    return null
  }
  if (chat.instanceId) {
    return profiles.find((p) => p.id === chat.instanceId) ?? null
  }
  return profiles.length === 1 ? profiles[0] : null
}

export function authorizedProfiles(
  profiles: InstanceProfile[],
  states: Record<string, string | null | undefined>,
): InstanceProfile[] {
  return profiles.filter((p) => states[p.id] === 'authorized')
}

/** «Убрать из приложения»: профиль и его локальные чаты/сообщения удаляются, API не вызывается. */
export function removeInstanceLocally(
  data: { profiles: InstanceProfile[]; chats: Chat[]; messages: StoredMessage[] },
  id: string,
): { profiles: InstanceProfile[]; chats: Chat[]; messages: StoredMessage[] } {
  const profiles = data.profiles.filter((p) => p.id !== id)
  const chats = data.chats.filter((c) => c.instanceId !== id)
  const messages = data.messages.filter((m) => m.instanceId !== id)
  return { profiles, chats, messages }
}
