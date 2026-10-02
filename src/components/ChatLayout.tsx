import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { chatTitleFromInput, resolveChatId } from '../api/chatId'
import { sendMessage } from '../api/greenApi'
import { chatIdsMatch } from '../api/notifications'
import type {
  Chat,
  GreenApiCredentials,
  ParsedIncomingTextMessage,
  StoredMessage,
} from '../api/types'
import { GreenApiError } from '../api/types'
import { useNotificationPolling } from '../hooks/useNotificationPolling'
import ui from '../styles/ui.module.css'
import styles from './ChatLayout.module.css'
import { NewChatPanel } from './NewChatPanel'

interface Props {
  credentials: GreenApiCredentials
  chats: Chat[]
  messages: StoredMessage[]
  onLogout: () => void
  onChatsChange: (chats: Chat[]) => void
  onMessagesChange: (updater: StoredMessage[] | ((prev: StoredMessage[]) => StoredMessage[])) => void
  pollError: string | null
  onPollError: (error: string | null) => void
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ChatLayout({
  credentials,
  chats,
  messages,
  onLogout,
  onChatsChange,
  onMessagesChange,
  pollError,
  onPollError,
}: Props) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    () => chats[0]?.id ?? null,
  )
  const [newChatInput, setNewChatInput] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null

  const chatMessages = useMemo(
    () =>
      selectedChat
        ? messages
            .filter((m) => chatIdsMatch(m.chatId, selectedChat.chatId))
            .sort((a, b) => a.timestamp - b.timestamp)
        : [],
    [messages, selectedChat],
  )

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages.length, selectedChatId, scrollToBottom])

  const handleIncoming = useCallback(
    (incoming: ParsedIncomingTextMessage) => {
      onPollError(null)
      onMessagesChange((prev) => {
        if (
          incoming.idMessage &&
          prev.some((m) => m.idMessage === incoming.idMessage)
        ) {
          return prev
        }
        return [
          ...prev,
          {
            id: newId(),
            chatId: incoming.chatId,
            text: incoming.text,
            timestamp: incoming.timestamp ?? Date.now(),
            direction: 'incoming',
            idMessage: incoming.idMessage,
          },
        ]
      })

      const hasChat = chats.some((c) => chatIdsMatch(c.chatId, incoming.chatId))
      if (!hasChat) {
        const chat: Chat = {
          id: newId(),
          chatId: incoming.chatId,
          title: incoming.senderName ?? incoming.chatId,
          createdAt: Date.now(),
        }
        onChatsChange([chat, ...chats])
      }
    },
    [chats, onChatsChange, onMessagesChange, onPollError],
  )

  useNotificationPolling({
    credentials,
    enabled: true,
    onMessage: handleIncoming,
    onError: (err) => onPollError(err),
  })

  const handleCreateChat = (e: FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    try {
      const chatId = resolveChatId(newChatInput)
      const duplicate = chats.find((c) => chatIdsMatch(c.chatId, chatId))
      if (duplicate) {
        setSelectedChatId(duplicate.id)
        setNewChatInput('')
        return
      }
      const chat: Chat = {
        id: newId(),
        chatId,
        title: chatTitleFromInput(newChatInput, chatId),
        phone: newChatInput.trim(),
        createdAt: Date.now(),
      }
      onChatsChange([chat, ...chats])
      setSelectedChatId(chat.id)
      setNewChatInput('')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Ошибка создания чата')
    }
  }

  const handleSend = async () => {
    if (!selectedChat || !draft.trim() || sending) {
      return
    }
    setSendError(null)
    const text = draft.trim()
    setDraft('')
    const localId = newId()
    const optimistic: StoredMessage = {
      id: localId,
      chatId: selectedChat.chatId,
      text,
      timestamp: Date.now(),
      direction: 'outgoing',
      status: 'sending',
    }
    onMessagesChange((prev) => [...prev, optimistic])
    setSending(true)
    try {
      const res = await sendMessage(credentials, selectedChat.chatId, text)
      onMessagesChange((prev) =>
        prev.map((m) =>
          m.id === localId
            ? { ...m, status: 'sent' as const, idMessage: res.idMessage }
            : m,
        ),
      )
    } catch (err) {
      const errText =
        err instanceof GreenApiError
          ? [err.message, err.details].filter(Boolean).join(': ')
          : err instanceof Error
            ? err.message
            : 'Ошибка отправки'
      setSendError(errText)
      onMessagesChange((prev) =>
        prev.map((m) =>
          m.id === localId ? { ...m, status: 'failed' as const, error: errText } : m,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHead}>
          <div>
            <strong>Чаты</strong>
            <span className={styles.instance}>#{credentials.idInstance}</span>
          </div>
          <button type="button" className={ui.secondaryButton} onClick={onLogout}>
            Выйти
          </button>
        </header>

        <NewChatPanel
          value={newChatInput}
          onChange={setNewChatInput}
          onSubmit={handleCreateChat}
          error={createError}
          variant="inline"
        />

        <ul className={styles.chatList}>
          {chats.length === 0 && (
            <li className={styles.emptyHint}>
              Пока нет чатов. Укажите номер получателя и нажите «+».
            </li>
          )}
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                className={
                  chat.id === selectedChatId ? `${styles.chatItem} ${styles.active}` : styles.chatItem
                }
                onClick={() => setSelectedChatId(chat.id)}
              >
                <span className={styles.avatar}>{chat.title.slice(-2)}</span>
                <span className={styles.chatMeta}>
                  <span className={styles.chatTitle}>{chat.title}</span>
                  <span className={styles.chatId}>{chat.chatId}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className={styles.main}>
        {!selectedChat ? (
          <div className={styles.placeholder} data-ui="empty-state">
            <div className={styles.placeholderIcon} aria-hidden>
              💬
            </div>
            <p>Выберите чат слева или создайте новый по номеру телефона</p>
          </div>
        ) : (
          <div data-ui="active-chat">
            <header className={styles.mainHead}>
              <div>
                <h2>{selectedChat.title}</h2>
                <span>{selectedChat.chatId}</span>
              </div>
              {pollError && <span className={styles.pollWarn}>Опрос: {pollError}</span>}
            </header>

            <div className={styles.messages}>
              {chatMessages.length === 0 && (
                <p className={styles.emptyMessages}>Нет сообщений. Напишите первым.</p>
              )}
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.direction === 'outgoing'
                      ? `${styles.bubbleRow} ${styles.out}`
                      : `${styles.bubbleRow} ${styles.in}`
                  }
                >
                  <div className={styles.bubble}>
                    <p>{m.text}</p>
                    <footer>
                      {new Date(m.timestamp).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {m.status === 'sending' && ' · отправка…'}
                      {m.status === 'failed' && ' · ошибка'}
                    </footer>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {sendError && <div className={ui.errorBanner}>{sendError}</div>}

            <div className={styles.composer} data-ui="active-chat-composer">
              <textarea
                className={ui.textInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Введите сообщение…"
                rows={1}
                disabled={sending}
                aria-label="Текст сообщения"
              />
              <button type="button" onClick={() => void handleSend()} disabled={sending || !draft.trim()}>
                {sending ? '…' : '➤'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
