import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { canRetryMessage, classifyPollError } from '../api/errorMapping'
import { chatTitleFromInput, resolveChatId } from '../api/chatId'
import { getStateInstance, sendMessage } from '../api/greenApi'
import {
  isInstanceAuthorized,
  isInstanceUnauthorized,
  parseStateInstance,
} from '../api/instanceState'
import { chatIdsMatch } from '../api/notifications'
import type {
  Chat,
  GreenApiCredentials,
  ParsedIncomingTextMessage,
  StoredMessage,
} from '../api/types'
import { GreenApiError } from '../api/types'
import { getDemoVariant, isDemoMode } from '../demo/demoMode'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useNotificationPolling } from '../hooks/useNotificationPolling'
import { usePollRetryCountdown } from '../hooks/usePollRetryCountdown'
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
import { ChatListSkeleton, MessagesSkeleton, SyncBanner } from './ChatSkeletons'
import { Icon } from './Icon'
import { InstanceUnauthorizedPanel } from './InstanceUnauthorizedPanel'
import { LogoutConfirmModal } from './LogoutConfirmModal'
import { NetworkErrorBanner } from './NetworkErrorBanner'
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
  const demoVariant = getDemoVariant()
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
  const [instanceState, setInstanceState] = useState<string | null>(() => {
    if (demoVariant === 'unauthorized') {
      return 'notAuthorized'
    }
    if (isDemoMode() && demoVariant !== 'loading') {
      return 'authorized'
    }
    return null
  })
  const [instanceBlocked, setInstanceBlocked] = useState(
    () => demoVariant === 'unauthorized',
  )
  const [syncLoading, setSyncLoading] = useState(() => {
    if (demoVariant === 'loading') {
      return true
    }
    if (demoVariant === 'unauthorized' || isDemoMode()) {
      return false
    }
    return true
  })
  const [checkingState, setCheckingState] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(() => getDemoVariant() === 'logout')
  const [mobileShowChat, setMobileShowChat] = useState(
    () => getDemoVariant() === 'mobile-chat' || Boolean(defaultSelectedChatId),
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const pollRetrySec = usePollRetryCountdown(Boolean(pollError))

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null

  const showUnauthorized =
    demoVariant === 'unauthorized' || (instanceBlocked && demoVariant !== 'loading')

  const showSyncLoading = demoVariant === 'loading' || (syncLoading && !showUnauthorized)

  const effectivePollError =
    demoVariant === 'network'
      ? 'CORS preflight request blocked (TypeError: Failed to fetch)'
      : pollError

  const pollKind = effectivePollError ? classifyPollError(effectivePollError) : null

  const showMobileChatPane =
    isMobile &&
    (demoVariant === 'mobile-chat' || (mobileShowChat && Boolean(selectedChat)))

  const shellClass = [
    styles.shell,
    isMobile && !showMobileChatPane ? styles.mobileListView : '',
    isMobile && showMobileChatPane ? styles.mobileChatView : '',
  ]
    .filter(Boolean)
    .join(' ')

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

  const refreshInstanceState = useCallback(async () => {
    if (demoVariant === 'unauthorized') {
      setInstanceBlocked(true)
      setInstanceState('notAuthorized')
      setSyncLoading(false)
      return
    }
    if (isDemoMode()) {
      setInstanceBlocked(false)
      setInstanceState('authorized')
      setSyncLoading(false)
      return
    }
    setCheckingState(true)
    try {
      const raw = await getStateInstance(credentials)
      const state = parseStateInstance(raw)
      setInstanceState(state)
      setInstanceBlocked(isInstanceUnauthorized(state) && !isInstanceAuthorized(state))
    } catch {
      setInstanceBlocked(false)
    } finally {
      setCheckingState(false)
      setSyncLoading(false)
    }
  }, [credentials, demoVariant])

  useEffect(() => {
    if (demoVariant === 'loading') {
      const t = window.setTimeout(() => setSyncLoading(false), 2500)
      return () => window.clearTimeout(t)
    }
    if (isDemoMode()) {
      return undefined
    }
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setCheckingState(true)
      }
    })
    getStateInstance(credentials)
      .then((raw) => {
        if (cancelled) {
          return
        }
        const state = parseStateInstance(raw)
        setInstanceState(state)
        setInstanceBlocked(isInstanceUnauthorized(state) && !isInstanceAuthorized(state))
      })
      .catch(() => {
        if (!cancelled) {
          setInstanceBlocked(false)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingState(false)
          setSyncLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [credentials, demoVariant])

  const selectChat = (chatId: string) => {
    setSelectedChatId(chatId)
    setLastSeenByChat((prev) => ({ ...prev, [chatId]: Date.now() }))
    if (isMobile) {
      setMobileShowChat(true)
    }
  }

  const sendText = async (text: string, localId: string) => {
    if (!selectedChat) {
      return
    }
    onMessagesChange((prev) =>
      prev.map((m) =>
        m.id === localId
          ? { ...m, status: 'sending' as const, error: undefined, text }
          : m,
      ),
    )
    setSending(true)
    setSendError(null)
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

  const retryMessage = (msg: StoredMessage) => {
    if (!canRetryMessage(msg) || isDemoMode()) {
      return
    }
    void sendText(msg.text, msg.id)
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
    enabled: !isDemoMode() && !instanceBlocked && !showSyncLoading,
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
    await sendText(text, localId)
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

  if (showUnauthorized) {
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
                  <span className={styles.onlineDot} style={{ background: '#fa8c16' }} />
                  Не авторизован
                </div>
              </div>
            </div>
          </div>
        </aside>
        <main className={styles.main}>
          <InstanceUnauthorizedPanel
            credentials={credentials}
            stateLabel={instanceState}
            checking={checkingState}
            onRecheck={() => void refreshInstanceState()}
            onChangeInstance={() => setLogoutOpen(true)}
          />
        </main>
        <LogoutConfirmModal
          open={logoutOpen}
          idInstance={credentials.idInstance}
          onCancel={() => setLogoutOpen(false)}
          onConfirm={() => {
            setLogoutOpen(false)
            onLogout()
          }}
        />
      </div>
    )
  }

  return (
    <div className={shellClass}>
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
              onClick={() => setLogoutOpen(true)}
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

        {showSyncLoading ? (
          <ul className={styles.chatList}>
            <ChatListSkeleton count={6} />
          </ul>
        ) : filteredChats.length === 0 ? (
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
            {pollKind && (
              <NetworkErrorBanner
                kind={pollKind}
                retryInSec={pollRetrySec}
                onRetryNow={() => onPollError(null)}
              />
            )}
            {showSyncLoading && <SyncBanner />}
            <header className={styles.chatHeader}>
              <div className={styles.chatHeaderUser}>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.mobileBack}`}
                  aria-label="Назад к списку"
                  onClick={() => setMobileShowChat(false)}
                >
                  <Icon name="arrow_back" size="sm" />
                </button>
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
              {showSyncLoading ? (
                <MessagesSkeleton />
              ) : chatMessages.length === 0 ? (
                <p className={styles.emptyText}>Нет сообщений. Напишите первым.</p>
              ) : null}
              {!showSyncLoading &&
                messageGroups.map((group) => (
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
                          className={`${styles.bubble} ${outgoing ? styles.bubbleOut : styles.bubbleIn} ${m.status === 'failed' ? styles.bubbleFailed : ''}`}
                        >
                          <p>{m.text}</p>
                          <div
                            className={`${styles.bubbleMeta} ${outgoing ? styles.bubbleMetaOut : ''}`}
                          >
                            <span>
                              {formatMessageTime(m.timestamp)}
                              {m.status === 'sending' && ' · отправляется'}
                            </span>
                            {outgoing && m.status === 'sending' && (
                              <Icon name="schedule" size="sm" />
                            )}
                            {outgoing && m.status === 'sent' && (
                              <Icon name="done_all" filled size="sm" className={styles.ticks} />
                            )}
                          </div>
                          {m.status === 'failed' && (
                            <div className={styles.failRow}>
                              <span>Не отправлено</span>
                              <button
                                type="button"
                                className={styles.retryLink}
                                onClick={() => retryMessage(m)}
                              >
                                Повторить
                              </button>
                            </div>
                          )}
                          {m.error && m.status === 'failed' && (
                            <p className={styles.failDetail}>{m.error}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {(sendError || pollKind === 'network' || pollKind === 'cors') && (
              <p className={styles.composerError}>
                {sendError ??
                  'Ошибка сети: NetworkError / CORS preflight failed'}
              </p>
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
                  placeholder={
                    pollKind === 'network' || pollKind === 'cors'
                      ? 'Сообщение… (будет отправлено при восстановлении связи)'
                      : 'Сообщение...'
                  }
                  rows={1}
                  disabled={sending || showSyncLoading}
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
      <LogoutConfirmModal
        open={logoutOpen}
        idInstance={credentials.idInstance}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false)
          onLogout()
        }}
      />
    </div>
  )
}
