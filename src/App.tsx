import { useCallback, useMemo, useState } from 'react'
import type { Chat, GreenApiCredentials, StoredMessage } from './api/types'
import { loadAuth, saveAuth, type PersistedAuth } from './api/credentialsStore'
import type { PartnerCredentials } from './api/partnerApi'
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
import { InstanceAuthScreen } from './components/auth/InstanceAuthScreen'
import { PartnerInstancesScreen } from './components/auth/PartnerInstancesScreen'
import { RegisterScreen } from './components/auth/RegisterScreen'
import { ChatLayout } from './components/ChatLayout'
import { LoginScreen } from './components/LoginScreen'
import type { AccountMode } from './components/auth/AccountModeSwitcher'
import {
  DEMO_CHATS,
  DEMO_CREDENTIALS,
  DEMO_PARTNER,
  demoMessagesForVariant,
  getDemoVariant,
  isDemoMode,
} from './demo/demoMode'

type AuthRoute = 'login' | 'register' | 'partner' | 'instance-auth' | 'chat'

function chatsForDemo(variant: ReturnType<typeof getDemoVariant>): Chat[] {
  if (!variant || variant === 'error' || variant === 'register') {
    return []
  }
  if (variant === 'empty' || variant === 'modal') {
    return []
  }
  if (variant === 'partner' || variant === 'create-instance' || variant === 'instance-qr') {
    return []
  }
  return DEMO_CHATS
}

function defaultChatIdForDemo(variant: ReturnType<typeof getDemoVariant>): string | undefined {
  if (!variant || variant === 'error' || variant === 'empty' || variant === 'modal') {
    return undefined
  }
  if (variant === 'mobile-list') {
    return undefined
  }
  if (variant === 'partner' || variant === 'create-instance' || variant === 'instance-qr' || variant === 'register') {
    return undefined
  }
  return DEMO_CHATS[0]?.id
}

function initialRoute(demoVariant: ReturnType<typeof getDemoVariant>): AuthRoute {
  if (demoVariant === 'register') {
    return 'register'
  }
  if (demoVariant === 'partner' || demoVariant === 'create-instance') {
    return 'partner'
  }
  if (demoVariant === 'instance-qr') {
    return 'instance-auth'
  }
  if (demoVariant && demoVariant !== 'error') {
    return 'chat'
  }
  const loaded = loadAuth()
  if (loaded?.auth.mode === 'partner') {
    return 'partner'
  }
  if (loadCredentials()) {
    return 'chat'
  }
  return 'login'
}

function App() {
  const demoVariant = useMemo(() => getDemoVariant(), [])

  const [route, setRoute] = useState<AuthRoute>(() => initialRoute(demoVariant))
  const [partnerSession, setPartnerSession] = useState<PartnerCredentials | null>(() => {
    if (demoVariant === 'partner' || demoVariant === 'create-instance') {
      return DEMO_PARTNER
    }
    const loaded = loadAuth()
    if (loaded?.auth.mode === 'partner') {
      return loaded.auth.partner
    }
    return null
  })
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(() => {
    if (
      demoVariant === 'error' ||
      demoVariant === 'register' ||
      demoVariant === 'partner' ||
      demoVariant === 'create-instance'
    ) {
      return null
    }
    if (demoVariant === 'instance-qr') {
      return DEMO_CREDENTIALS
    }
    if (demoVariant) {
      return DEMO_CREDENTIALS
    }
    return loadCredentials()
  })
  const [pendingAuth, setPendingAuth] = useState(
    () => demoVariant === 'instance-qr',
  )

  const [chats, setChats] = useState<Chat[]>(() => {
    if (demoVariant) {
      return chatsForDemo(demoVariant)
    }
    return loadChats()
  })
  const [messages, setMessages] = useState<StoredMessage[]>(() => {
    if (demoVariant && demoVariant !== 'error' && demoVariant !== 'register') {
      if (demoVariant === 'empty' || demoVariant === 'modal') {
        return []
      }
      if (demoVariant === 'partner' || demoVariant === 'create-instance' || demoVariant === 'instance-qr') {
        return []
      }
      return demoMessagesForVariant(demoVariant)
    }
    return loadMessages()
  })
  const [pollError, setPollError] = useState<string | null>(() =>
    demoVariant === 'network'
      ? 'CORS preflight request blocked (TypeError: Failed to fetch)'
      : null,
  )

  const enterChat = useCallback((creds: GreenApiCredentials, remember: boolean) => {
    saveCredentials(creds, remember)
    setCredentials(creds)
    setPendingAuth(false)
    setRoute('chat')
    setPollError(null)
  }, [])

  const handleInstanceSuccess = useCallback(
    (creds: GreenApiCredentials, remember: boolean, needsAuth: boolean) => {
      if (needsAuth) {
        setCredentials(creds)
        setPendingAuth(true)
        setRoute('instance-auth')
        if (remember) {
          saveCredentials(creds, true)
        } else {
          saveCredentials(creds, false)
        }
        return
      }
      enterChat(creds, remember)
    },
    [enterChat],
  )

  const handlePartnerSuccess = useCallback((partner: PartnerCredentials, remember: boolean) => {
    const auth: PersistedAuth = { mode: 'partner', partner }
    saveAuth(auth, remember)
    setPartnerSession(partner)
    setRoute('partner')
  }, [])

  const handleOpenFromPartner = useCallback(
    (creds: GreenApiCredentials, needsAuth: boolean) => {
      setCredentials(creds)
      saveCredentials(creds, false)
      if (needsAuth) {
        setPendingAuth(true)
        setRoute('instance-auth')
      } else {
        enterChat(creds, false)
      }
    },
    [enterChat],
  )

  const handleLogout = useCallback(() => {
    if (isDemoMode()) {
      window.location.search = ''
      return
    }
    clearCredentials()
    setCredentials(null)
    setPartnerSession(null)
    setPendingAuth(false)
    setRoute('login')
    setPollError(null)
  }, [])

  const handleChatsChange = useCallback((next: Chat[]) => {
    if (!isDemoMode()) {
      saveChats(next)
    }
    setChats(next)
  }, [])

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
    setPartnerSession(null)
    setRoute('login')
  }, [])

  const loginInitialMode: AccountMode | undefined =
    demoVariant === 'partner' || demoVariant === 'create-instance' ? 'partner' : undefined

  if (route === 'register') {
    return <RegisterScreen onGoLogin={() => setRoute('login')} />
  }

  if (route === 'login') {
    return (
      <>
        <LoginScreen
          onInstanceSuccess={handleInstanceSuccess}
          onPartnerSuccess={handlePartnerSuccess}
          onGoRegister={() => setRoute('register')}
          initialMode={loginInitialMode}
          demoShowErrors={demoVariant === 'error'}
        />
        <button type="button" className="reset-data-btn" onClick={handleClearAll}>
          сброс данных
        </button>
      </>
    )
  }

  if (route === 'partner' && partnerSession) {
    return (
      <PartnerInstancesScreen
        partner={partnerSession}
        onOpenInstance={handleOpenFromPartner}
        onBack={() => {
          setPartnerSession(null)
          setRoute('login')
        }}
        demoCreateOpen={demoVariant === 'create-instance'}
      />
    )
  }

  if (route === 'instance-auth' && credentials && pendingAuth) {
    return (
      <InstanceAuthScreen
        credentials={credentials}
        onAuthorized={() => enterChat(credentials, false)}
        onBack={() => {
          if (partnerSession) {
            setRoute('partner')
          } else {
            setRoute('login')
          }
          setPendingAuth(false)
        }}
      />
    )
  }

  if (!credentials) {
    return (
      <LoginScreen
        onInstanceSuccess={handleInstanceSuccess}
        onPartnerSuccess={handlePartnerSuccess}
        onGoRegister={() => setRoute('register')}
      />
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
      defaultSelectedChatId={defaultChatIdForDemo(demoVariant)}
    />
  )
}

export default App
