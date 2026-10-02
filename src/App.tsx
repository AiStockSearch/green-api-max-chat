import { useCallback, useMemo, useState } from 'react'
import type { Chat, GreenApiCredentials, StoredMessage } from './api/types'
import {
  clearAllAppData,
  clearCredentials,
  loadChats,
  loadCredentials,
  loadMessages,
  saveChats,
  saveCredentials,
  saveMessages,
} from './api/storage'
import { ChatLayout } from './components/ChatLayout'
import { LoginScreen } from './components/LoginScreen'
import {
  DEMO_CHATS,
  DEMO_CREDENTIALS,
  DEMO_MESSAGES,
  getDemoVariant,
  isDemoMode,
} from './demo/demoMode'

function App() {
  const demoVariant = useMemo(() => getDemoVariant(), [])

  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(() => {
    if (demoVariant) {
      return DEMO_CREDENTIALS
    }
    return loadCredentials()
  })
  const [chats, setChats] = useState<Chat[]>(() => {
    if (demoVariant === 'active') {
      return DEMO_CHATS
    }
    return loadChats()
  })
  const [messages, setMessages] = useState<StoredMessage[]>(() => {
    if (demoVariant === 'active') {
      return DEMO_MESSAGES
    }
    return loadMessages()
  })
  const [pollError, setPollError] = useState<string | null>(null)

  const handleLogin = useCallback((creds: GreenApiCredentials) => {
    saveCredentials(creds)
    setCredentials(creds)
    setPollError(null)
  }, [])

  const handleLogout = useCallback(() => {
    if (isDemoMode()) {
      window.location.search = ''
      return
    }
    clearCredentials()
    setCredentials(null)
    setPollError(null)
  }, [])

  const handleChatsChange = useCallback(
    (next: Chat[]) => {
      if (!isDemoMode()) {
        saveChats(next)
      }
      setChats(next)
    },
    [],
  )

  const handleMessagesChange = useCallback(
    (next: StoredMessage[] | ((prev: StoredMessage[]) => StoredMessage[])) => {
      setMessages((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        if (!isDemoMode()) {
          saveMessages(resolved)
        }
        return resolved
      })
    },
    [],
  )

  const handleClearAll = useCallback(() => {
    if (!window.confirm('Удалить все чаты и сообщения из localStorage?')) {
      return
    }
    clearAllAppData()
    setChats([])
    setMessages([])
    setCredentials(null)
  }, [])

  if (!credentials) {
    return (
      <>
        <LoginScreen onSuccess={handleLogin} />
        <button
          type="button"
          style={{
            position: 'fixed',
            bottom: 8,
            right: 8,
            opacity: 0.35,
            fontSize: 10,
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
          }}
          onClick={handleClearAll}
        >
          сброс данных
        </button>
      </>
    )
  }

  return (
    <ChatLayout
      credentials={credentials}
      chats={chats}
      messages={messages}
      onLogout={handleLogout}
      onChatsChange={handleChatsChange}
      onMessagesChange={handleMessagesChange}
      pollError={pollError}
      onPollError={setPollError}
      initialModalOpen={demoVariant === 'modal'}
      defaultSelectedChatId={demoVariant === 'active' ? DEMO_CHATS[0]?.id : undefined}
    />
  )
}

export default App
