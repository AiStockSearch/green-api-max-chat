import { chatIdsMatch } from '../api/notifications'
import type { Chat, StoredMessage } from '../api/types'

/** Сообщение принадлежит инстансу (старые сообщения без instanceId подходят любому). */
export function sameInstance(a: string | undefined, b: string | undefined): boolean {
  return !a || !b || a === b
}

export function getChatMessages(
  messages: StoredMessage[],
  chatId: string,
  instanceId?: string,
): StoredMessage[] {
  return messages
    .filter((m) => chatIdsMatch(m.chatId, chatId) && sameInstance(m.instanceId, instanceId))
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function getLastMessage(
  messages: StoredMessage[],
  chatId: string,
  instanceId?: string,
): StoredMessage | undefined {
  const list = getChatMessages(messages, chatId, instanceId)
  return list[list.length - 1]
}

export function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatChatListTime(ts: number): string {
  const now = new Date()
  const d = new Date(ts)
  const sameDay =
    now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth() &&
    now.getDate() === d.getDate()
  if (sameDay) {
    return formatMessageTime(ts)
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (
    yesterday.getFullYear() === d.getFullYear() &&
    yesterday.getMonth() === d.getMonth() &&
    yesterday.getDate() === d.getDate()
  ) {
    return 'Вчера'
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function formatDateDivider(ts: number): string {
  const now = new Date()
  const d = new Date(ts)
  const sameDay =
    now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth() &&
    now.getDate() === d.getDate()
  if (sameDay) {
    return 'Сегодня'
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (
    yesterday.getFullYear() === d.getFullYear() &&
    yesterday.getMonth() === d.getMonth() &&
    yesterday.getDate() === d.getDate()
  ) {
    return 'Вчера'
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function groupMessagesByDay(messages: StoredMessage[]): { label: string; items: StoredMessage[] }[] {
  const groups: { label: string; items: StoredMessage[] }[] = []
  for (const msg of messages) {
    const label = formatDateDivider(msg.timestamp)
    const last = groups[groups.length - 1]
    if (last?.label === label) {
      last.items.push(msg)
    } else {
      groups.push({ label, items: [msg] })
    }
  }
  return groups
}

export function getUnreadCount(
  messages: StoredMessage[],
  chat: Chat,
  selectedChatId: string | null,
  lastSeenByChat: Record<string, number>,
): number {
  if (chat.id === selectedChatId) {
    return 0
  }
  const seenAt = lastSeenByChat[chat.id] ?? 0
  return messages.filter(
    (m) =>
      chatIdsMatch(m.chatId, chat.chatId) &&
      sameInstance(m.instanceId, chat.instanceId) &&
      m.direction === 'incoming' &&
      m.timestamp > seenAt,
  ).length
}

export function chatPreviewText(msg: StoredMessage | undefined): string {
  if (!msg) {
    return 'Нет сообщений'
  }
  const prefix = msg.direction === 'outgoing' ? 'Вы: ' : ''
  return `${prefix}${msg.text}`.slice(0, 80)
}

export function avatarLabel(title: string): string {
  const t = title.trim()
  if (t.startsWith('+')) {
    return t.replace(/\D/g, '').slice(-2) || '+7'
  }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return t.slice(0, 2).toUpperCase()
}
