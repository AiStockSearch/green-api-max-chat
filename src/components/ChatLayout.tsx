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
import { isDemoMode } from '../demo/demoMode'
import { useNotificationPolling } from '../hooks/useNotificationPolling'
import {
  avatarLabel,
  chatPreviewText,
  formatChatListTime,
  formatMessageTime,
  getChatMessages,
  getLastMessage,
  getUnreadCount,
  groupMessagesByDay,
} from '../utils/chatUi'
import { Icon } from './Icon'
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
  initialModalOpen?: boolean
  defaultSelectedChatId?: string
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
  initialModalOpen = false,
  defaultSelectedChatId,
}: Props) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    () => defaultSelectedChatId ?? chats[0]?.id ?? null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [newChatOpen, setNewChatOpen] = useState(initialModalOpen)
  const [newChatInput, setNewChatInput] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [lastSeenByChat, setLastSeenByChat] = useState<Record<string, number>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      return chats
    }
    return chats.filter(
      (c) => c.title.toLowerCase().includes(q) || c.chatId.toLowerCase().includes(q),
    )
  }, [chats, searchQuery])

  const chatMessages = useMemo(
    () => (selectedChat ? getChatMessages(messages, selectedChat.chatId) : []),
    [messages, selectedChat],
  )

  const messageGroups = useMemo(() => groupMessagesByDay(chatMessages), [chatMessages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages.length, selectedChatId, scrollToBottom])

  const selectChat = (chatId: string) => {
    setSelectedChatId(chatId)
    setLastSeenByChat((prev) => ({ ...prev, [chatId]: Date.now() }))
  }

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
    enabled: !isDemoMode(),
    onMessage: handleIncoming,
    onError: (err) => onPollError(err),
  })

  const closeNewChat = () => {
    setNewChatOpen(false)
    setCreateError(null)
    setNewChatInput('')
  }

  const handleCreateChat = (e: FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    try {
      const chatId = resolveChatId(newChatInput)
      const duplicate = chats.find((c) => chatIdsMatch(c.chatId, chatId))
      if (duplicate) {
        selectChat(duplicate.id)
        closeNewChat()
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
      selectChat(chat.id)
      closeNewChat()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Ошибка создания чата')
    }
  }

  const handleSend = async () => {
    if (!selectedChat || !draft.trim() || sending) {
      return
    }
    if (isDemoMode()) {
      const text = draft.trim()
      setDraft('')
      onMessagesChange((prev) => [
        ...prev,
        {
          id: newId(),
          chatId: selectedChat.chatId,
          text,
          timestamp: Date.now(),
          direction: 'outgoing',
          status: 'sent',
        },
      ])
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setNewChatOpen(true)
      }
      if (e.key === 'Escape') {
        setNewChatOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <div className={styles.brandBlock}>
            <div className={styles.logoGradient}>
              <Icon name="chat" filled />
            </div>
            <div>
              <div className={styles.brandTitle}>GREEN-API MAX</div>
              <div className={styles.onlineRow}>
                <span className={styles.onlineDot} />
                В сети
              </div>
            </div>
          </div>
          <div className={styles.headActions}>
            <button type="button" className={styles.iconBtn} title="Обновить статус">
              <Icon name="sync" size="sm" />
            </button>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              title="Выйти"
              onClick={onLogout}
            >
              <Icon name="logout" size="sm" />
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <Icon name="search" size="sm" />
            </span>
            <input
              className={styles.searchInput}
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="button" className={styles.newChatBtn} onClick={() => setNewChatOpen(true)}>
            <Icon name="add_comment" size="sm" />
            Новый чат
          </button>
          <div className={styles.tabs} role="tablist" aria-label="Фильтр чатов">
            <button type="button" className={`${styles.tab} ${styles.tabActive}`}>
              Все чаты
            </button>
            <button type="button" className={styles.tab} disabled title="Скоро">
              Непрочитанные
            </button>
            <button type="button" className={styles.tab} disabled title="Скоро">
              Группы
            </button>
          </div>
        </div>

        <div className={styles.sectionHead}>
          <span>Чаты</span>
          <span className={styles.dialogCount}>{chats.length} диалогов</span>
        </div>

        {filteredChats.length === 0 ? (
          <div className={styles.sidebarEmpty}>
            <div className={styles.sidebarEmptyIcon}>
              <Icon name="forum" size="lg" />
            </div>
            <h4>Здесь пока нет чатов</h4>
            <p>Начните общение с помощью кнопки «Новый чат» выше</p>
          </div>
        ) : (
          <ul className={styles.chatList}>
            {filteredChats.map((chat, index) => {
              const last = getLastMessage(messages, chat.chatId)
              const unread = getUnreadCount(messages, chat, selectedChatId, lastSeenByChat)
              const isActive = chat.id === selectedChatId
              return (
                <li key={chat.id}>
                  <button
                    type="button"
                    className={`${styles.chatItem} ${isActive ? styles.chatItemActive : ''}`}
                    onClick={() => selectChat(chat.id)}
                  >
                    <div
                      className={`${styles.avatar} ${index % 2 === 1 ? styles.avatarAlt : ''}`}
                    >
                      {avatarLabel(chat.title)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.chatRowTop}>
                        <span className={styles.chatName}>{chat.title}</span>
                        <span
                          className={`${styles.chatTime} ${isActive ? styles.chatTimeActive : ''}`}
                        >
                          {last ? formatChatListTime(last.timestamp) : ''}
                        </span>
                      </div>
                      <div className={styles.chatPreviewRow}>
                        <span className={styles.chatPreview}>{chatPreviewText(last)}</span>
                        {unread > 0 && <span className={styles.unread}>{unread}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className={styles.sidebarFooter}>
          <div className={styles.instanceBlock}>
            <div className={styles.instanceIcon}>
              <Icon name="dns" size="sm" />
            </div>
            <div>
              <div className={styles.instanceTitle}>
                Инстанс активен
                <span className={styles.onlineDot} />
              </div>
              <div className={styles.instanceId}>id: {credentials.idInstance}</div>
            </div>
          </div>
          <button type="button" className={styles.iconBtn} title="Настройки">
            <Icon name="settings" size="sm" />
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainDecor} aria-hidden>
          <div className={styles.decorGlow} />
          <div className={styles.decorRing} style={{ width: 420, height: 420 }} />
          <div className={styles.decorRing} style={{ width: 560, height: 560 }} />
        </div>

        {!selectedChat ? (
          <div className={styles.emptyCard} data-ui="empty-state">
            <div className={styles.emptyIconWrap}>
              <div className={styles.emptyIcon}>
                <Icon name="mark_chat_unread" filled size="lg" />
              </div>
              <div className={styles.emptyBolt}>
                <Icon name="bolt" size="sm" />
              </div>
            </div>
            <h2 className={styles.emptyTitle}>Выберите чат или создайте новый</h2>
            <p className={styles.emptyText}>
              Отправляйте сообщения и получайте ответы через надёжный шлюз GREEN-API для
              мессенджера MAX.
            </p>
            <button type="button" className={styles.emptyCta} onClick={() => setNewChatOpen(true)}>
              <Icon name="add" size="sm" />
              Начать новый диалог
            </button>
            <p className={styles.emptyHint}>
              Быстрый поиск: <kbd>Ctrl</kbd> + <kbd>K</kbd>
            </p>
            <div className={styles.emptySecure}>
              <Icon name="lock" size="sm" />
              Сквозное шифрование и безопасность данных
            </div>
          </div>
        ) : (
          <div className={styles.activePane} data-ui="active-chat">
            {pollError && <div className={styles.pollBanner}>Опрос уведомлений: {pollError}</div>}
            <header className={styles.chatHeader}>
              <div className={styles.chatHeaderUser}>
                <div className={styles.headerAvatar}>{avatarLabel(selectedChat.title)}</div>
                <div>
                  <h2 className={styles.chatHeaderName}>{selectedChat.title}</h2>
                  <p className={styles.chatHeaderMeta}>MAX · GREEN-API • В сети</p>
                </div>
              </div>
              <div className={styles.headerActions}>
                <button type="button" className={styles.iconBtn} title="Поиск в чате">
                  <Icon name="search" size="sm" />
                </button>
                <button type="button" className={styles.iconBtn} title="Прикрепить файл">
                  <Icon name="attach_file" size="sm" />
                </button>
                <button type="button" className={styles.iconBtn} title="Меню">
                  <Icon name="more_vert" size="sm" />
                </button>
              </div>
            </header>

            <div className={styles.messages}>
              {chatMessages.length === 0 && (
                <p className={styles.emptyText}>Нет сообщений. Напишите первым.</p>
              )}
              {messageGroups.map((group) => (
                <div key={group.label}>
                  <div className={styles.dateDivider}>
                    <span>{group.label}</span>
                  </div>
                  {group.items.map((m) => {
                    const outgoing = m.direction === 'outgoing'
                    return (
                      <div
                        key={m.id}
                        className={`${styles.bubbleRow} ${outgoing ? styles.bubbleRowOut : ''}`}
                      >
                        {!outgoing && (
                          <div className={styles.miniAvatar}>{avatarLabel(selectedChat.title)}</div>
                        )}
                        <div
                          className={`${styles.bubble} ${outgoing ? styles.bubbleOut : styles.bubbleIn}`}
                        >
                          <p>{m.text}</p>
                          <div
                            className={`${styles.bubbleMeta} ${outgoing ? styles.bubbleMetaOut : ''}`}
                          >
                            <span>
                              {formatMessageTime(m.timestamp)}
                              {m.status === 'sending' && ' · …'}
                              {m.status === 'failed' && ' · ошибка'}
                            </span>
                            {outgoing && m.status !== 'failed' && (
                              <Icon name="done_all" filled size="sm" className={styles.ticks} />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {sendError && (
              <div className={styles.sendErrorWrap}>
                <p className={styles.emptyText} style={{ color: 'var(--color-error)' }}>
                  {sendError}
                </p>
              </div>
            )}

            <div className={styles.composer} data-ui="active-chat-composer">
              <button type="button" className={styles.iconBtn} title="Прикрепить">
                <Icon name="attach_file" size="sm" />
              </button>
              <button type="button" className={styles.iconBtn} title="Эмодзи">
                <Icon name="mood" size="sm" />
              </button>
              <div className={styles.composerInputWrap}>
                <textarea
                  className={styles.composerInput}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Сообщение..."
                  rows={1}
                  disabled={sending}
                  aria-label="Текст сообщения"
                />
              </div>
              <button type="button" className={styles.iconBtn} title="Голосовое сообщение">
                <Icon name="mic" size="sm" />
              </button>
              <button
                type="button"
                className={styles.sendBtn}
                title="Отправить"
                disabled={sending || !draft.trim()}
                onClick={() => void handleSend()}
              >
                <Icon name="send" size="sm" />
              </button>
            </div>
          </div>
        )}

        {!selectedChat && (
          <div className={styles.statusBar}>
            <span className={styles.onlineDot} />
            HTTP API · опрос уведомлений активен
          </div>
        )}
      </main>

      <NewChatPanel
        open={newChatOpen}
        value={newChatInput}
        onChange={setNewChatInput}
        onSubmit={handleCreateChat}
        onClose={closeNewChat}
        error={createError}
      />
    </div>
  )
}
