import { normalizePhone } from '../api/chatId'
import { chatIdsMatch } from '../api/notifications'
import type { Chat, ParsedChatMessage, StoredMessage } from '../api/types'
import { chatMatchesId } from '../api/whatsapp'

export interface InboxState {
  chats: Chat[]
  messages: StoredMessage[]
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Чат инстанса по chatId, алиасам (@lid) или номеру отправителя (Telegram senderPhoneNumber). */
export function findChatForIncoming(
  chats: Chat[],
  instanceId: string,
  incoming: Pick<ParsedChatMessage, 'chatId' | 'senderPhone'>,
): { chat: Chat; viaPhone: boolean } | null {
  const own = chats.filter((c) => !c.instanceId || c.instanceId === instanceId)
  const direct = own.find((c) => chatMatchesId(c, incoming.chatId, chatIdsMatch))
  if (direct) {
    return { chat: direct, viaPhone: false }
  }
  if (incoming.senderPhone) {
    const byPhone = own.find(
      (c) => c.chatId.endsWith('@c.us') && normalizePhone(c.chatId) === incoming.senderPhone,
    )
    if (byPhone) {
      return { chat: byPhone, viaPhone: true }
    }
  }
  return null
}

/**
 * Применяет сообщение из очереди уведомлений инстанса к локальному состоянию:
 * дедуп по idMessage, привязка к существующему чату (или создание нового), алиас по номеру.
 */
export function applyIncomingMessage(
  state: InboxState,
  instanceId: string,
  incoming: ParsedChatMessage,
  now: () => number = Date.now,
): InboxState {
  if (
    incoming.idMessage &&
    state.messages.some(
      (m) => m.idMessage === incoming.idMessage && (!m.instanceId || m.instanceId === instanceId),
    )
  ) {
    return state
  }
  let chats = state.chats
  const found = findChatForIncoming(chats, instanceId, incoming)
  let target: Chat
  if (found) {
    target = found.chat
    if (found.viaPhone) {
      chats = chats.map((c) =>
        c.id === target.id ? { ...c, aliases: [...(c.aliases ?? []), incoming.chatId] } : c,
      )
    }
  } else {
    target = {
      id: newId(),
      chatId: incoming.chatId,
      title: incoming.senderName ?? incoming.chatId,
      instanceId,
      createdAt: now(),
    }
    chats = [target, ...chats]
  }
  const message: StoredMessage = {
    id: newId(),
    chatId: target.chatId,
    text: incoming.text,
    timestamp: incoming.timestamp ?? now(),
    direction: incoming.direction,
    idMessage: incoming.idMessage,
    instanceId,
    ...(incoming.direction === 'outgoing' ? { status: 'sent' as const } : {}),
  }
  return { chats, messages: [...state.messages, message] }
}
