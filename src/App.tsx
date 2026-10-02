import { useCallback, useState } from 'react'
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

function App() {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(() =>
    loadCredentials(),
  )
  const [chats, setChats] = useState<Chat[]>(() => loadChats())
  const [messages, setMessages] = useState<StoredMessage[]>(() => loadMessages())
  const [pollError, setPollError] = useState<string | null>(null)

  const handleLogin = useCallback((creds: GreenApiCredentials) => {
    saveCredentials(creds)
    setCredentials(creds)
    setPollError(null)
  }, [])

  const handleLogout = useCallback(() => {
    clearCredentials()
    setCredentials(null)
    setPollError(null)
  }, [])

  const handleChatsChange = useCallback((next: Chat[]) => {
    saveChats(next)
    setChats(next)
  }, [])

  const handleMessagesChange = useCallback(
    (next: StoredMessage[] | ((prev: StoredMessage[]) => StoredMessage[])) => {
      setMessages((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        saveMessages(resolved)
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
    />
  )
}

export default App
