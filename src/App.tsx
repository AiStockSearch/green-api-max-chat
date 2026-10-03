import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Chat,
  GreenApiCredentials,
  InstanceProfile,
  ParsedChatMessage,
  StoredMessage,
} from './api/types'
import { GreenApiError } from './api/types'
import { loadAuth, saveAuth, type PersistedAuth } from './api/credentialsStore'
import { getStateInstance, logoutInstance } from './api/greenApi'
import { adapterFor } from './api/messengers'
import { parseStateInstance } from './api/instanceState'
import type { Messenger } from './api/messenger'
import type { PartnerCredentials } from './api/partnerApi'
import {
  assignLegacyInstance,
  clearProfiles,
  loadProfiles,
  makeProfile,
  saveProfiles,
  upsertProfile,
} from './api/profilesStore'
import { clearAllAppData, loadChats, loadMessages, saveChats, saveMessages } from './api/storage'
import { InstanceAuthScreen } from './components/auth/InstanceAuthScreen'
import { PartnerInstancesScreen } from './components/auth/PartnerInstancesScreen'
import { RegisterScreen } from './components/auth/RegisterScreen'
import { ChatLayout } from './components/ChatLayout'
import { InstancePoller } from './components/instances/InstancePoller'
import { InstancesDashboard } from './components/instances/InstancesDashboard'
import { LoginScreen } from './components/LoginScreen'
import type { AccountMode } from './components/auth/AccountModeSwitcher'
import {
  DEMO_CHATS,
  DEMO_CREDENTIALS,
  DEMO_PARTNER,
  DEMO_PROFILES,
  demoMessagesForVariant,
  getDemoVariant,
} from './demo/demoMode'
import { applyIncomingMessage } from './utils/inbox'
import { authorizedProfiles, removeInstanceLocally, type InstanceFilter } from './utils/instances'

type Route = 'dashboard' | 'login' | 'register' | 'partner' | 'instance-auth' | 'chat'
type DemoVariant = ReturnType<typeof getDemoVariant>
type States = Record<string, string | null | undefined>

const NO_CHAT_DEMOS: DemoVariant[] = [
  'error',
  'register',
  'empty',
  'modal',
  'partner',
  'create-instance',
  'instance-qr',
]

function demoProfiles(variant: DemoVariant): InstanceProfile[] {
  if (
    !variant ||
    variant === 'error' ||
    variant === 'register' ||
    variant === 'partner' ||
    variant === 'create-instance'
  ) {
    return []
  }
  if (variant === 'dashboard') {
    return DEMO_PROFILES
  }
  return [makeProfile(DEMO_CREDENTIALS, { label: 'Демо инстанс', now: 0 })]
}

function demoStates(variant: DemoVariant, profiles: InstanceProfile[]): States {
  const out: States = {}
  for (const p of profiles) {
    if (variant === 'unauthorized' || variant === 'instance-qr') {
      out[p.id] = 'notAuthorized'
    } else if (variant === 'loading') {
      out[p.id] = undefined
    } else {
      out[p.id] = 'authorized'
    }
  }
  if (variant === 'dashboard' && profiles[2]) {
    out[profiles[2].id] = 'notAuthorized'
  }
  return out
}

function demoChats(variant: DemoVariant, profiles: InstanceProfile[]): Chat[] {
  if (!variant || NO_CHAT_DEMOS.includes(variant)) {
    return []
  }
  if (variant === 'dashboard') {
    return DEMO_CHATS.map((c, i) => ({ ...c, instanceId: profiles[i % 2]?.id }))
  }
  return assignLegacyInstance(DEMO_CHATS, profiles[0]?.id)
}

function demoMessages(variant: DemoVariant, chats: Chat[]): StoredMessage[] {
  if (!variant || NO_CHAT_DEMOS.includes(variant)) {
    return []
  }
  const byChat = new Map(chats.map((c) => [c.chatId, c.instanceId]))
  return demoMessagesForVariant(variant).map((m) => ({ ...m, instanceId: byChat.get(m.chatId) }))
}

function defaultChatIdForDemo(variant: DemoVariant): string | undefined {
  if (
    !variant ||
    NO_CHAT_DEMOS.includes(variant) ||
    variant === 'mobile-list' ||
    variant === 'dashboard'
  ) {
    return undefined
  }
  return DEMO_CHATS[0]?.id
}

function initialRoute(variant: DemoVariant, profiles: InstanceProfile[]): Route {
  if (variant === 'register') return 'register'
  if (variant === 'partner' || variant === 'create-instance') return 'partner'
  if (variant === 'instance-qr') return 'instance-auth'
  if (variant === 'error') return 'login'
  if (variant === 'dashboard') return 'dashboard'
  if (variant) return 'chat'
  const loaded = loadAuth()
  if (loaded?.auth.mode === 'partner') return 'partner'
  if (profiles.length === 1) return 'chat'
  if (profiles.length > 1) return 'dashboard'
  return 'login'
}

function App() {
  const demoVariant = useMemo(() => getDemoVariant(), [])
  const demo = demoVariant !== null

  const [profiles, setProfiles] = useState<InstanceProfile[]>(() =>
    demo ? demoProfiles(demoVariant) : loadProfiles(),
  )
  const [states, setStates] = useState<States>(() =>
    demo ? demoStates(demoVariant, profiles) : {},
  )
  const [route, setRoute] = useState<Route>(() => initialRoute(demoVariant, profiles))
  const [authProfileId, setAuthProfileId] = useState<string | null>(() =>
    demoVariant === 'instance-qr' ? (profiles[0]?.id ?? null) : null,
  )
  const [chatFilter, setChatFilter] = useState<InstanceFilter>(() =>
    profiles.length === 1 ? profiles[0].id : 'all',
  )
  const [addMessenger, setAddMessenger] = useState<Messenger | undefined>(undefined)
  const [partnerSession, setPartnerSession] = useState<PartnerCredentials | null>(() => {
    if (demoVariant === 'partner' || demoVariant === 'create-instance') return DEMO_PARTNER
    if (demo) return null
    const loaded = loadAuth()
    return loaded?.auth.mode === 'partner' ? loaded.auth.partner : null
  })

  const [chats, setChats] = useState<Chat[]>(() =>
    demo ? demoChats(demoVariant, profiles) : assignLegacyInstance(loadChats(), profiles[0]?.id),
  )
  const [messages, setMessages] = useState<StoredMessage[]>(() =>
    demo ? demoMessages(demoVariant, chats) : assignLegacyInstance(loadMessages(), profiles[0]?.id),
  )
  const [pollErrors, setPollErrors] = useState<Record<string, string | null>>(() =>
    demoVariant === 'network' && profiles[0]
      ? { [profiles[0].id]: 'CORS preflight request blocked (TypeError: Failed to fetch)' }
      : {},
  )

  // Новый экран — с начала страницы (иначе на мобильных остаётся прокрутка дашборда)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return
    window.scrollTo(0, 0)
  }, [route])

  const persistProfiles = useCallback(
    (next: InstanceProfile[]) => {
      if (!demo) saveProfiles(next)
      setProfiles(next)
    },
    [demo],
  )

  const refreshState = useCallback(
    async (id?: string) => {
      if (demo) {
        return
      }
      const targets = id ? profiles.filter((p) => p.id === id) : profiles
      await Promise.all(
        targets.map(async (p) => {
          try {
            const state = parseStateInstance(await getStateInstance(p))
            setStates((prev) => ({ ...prev, [p.id]: state }))
          } catch (err) {
            // 429 / сбой сети — временные: известный статус не сбрасываем, иначе поллер
            // инстанса размонтируется и входящие перестанут приходить. 401/403 → 'error'.
            const transient =
              err instanceof GreenApiError && (err.status === undefined || err.status === 429)
            setStates((prev) => ({
              ...prev,
              [p.id]: transient && prev[p.id] && prev[p.id] !== 'error' ? prev[p.id] : 'error',
            }))
          }
        }),
      )
    },
    [demo, profiles],
  )

  // Статусы всех инстансов при старте и при изменении списка профилей
  const profileKey = profiles.map((p) => p.id).join('|')
  useEffect(() => {
    if (demo) {
      if (demoVariant === 'loading') {
        const t = window.setTimeout(() => setStates(demoStates('active', profiles)), 2500)
        return () => window.clearTimeout(t)
      }
      return undefined
    }
    queueMicrotask(() => void refreshState())
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey, demo])

  const saveChatList = useCallback(
    (next: Chat[]) => {
      if (!demo) saveChats(next)
      setChats(next)
    },
    [demo],
  )

  const handleMessagesChange = useCallback(
    (next: StoredMessage[] | ((prev: StoredMessage[]) => StoredMessage[])) => {
      setMessages((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        if (!demo) saveMessages(resolved)
        return resolved
      })
    },
    [demo],
  )

  // Актуальные данные для обработчика входящих (несколько поллеров параллельно)
  const inboxRef = useRef({ chats, messages })
  useEffect(() => {
    inboxRef.current = { chats, messages }
  }, [chats, messages])

  const handleIncoming = useCallback(
    (instanceId: string, incoming: ParsedChatMessage) => {
      const prev = inboxRef.current
      const next = applyIncomingMessage(prev, instanceId, incoming)
      if (next === prev) return
      inboxRef.current = next
      if (next.chats !== prev.chats) saveChatList(next.chats)
      handleMessagesChange(next.messages)
    },
    [handleMessagesChange, saveChatList],
  )

  /** Открыт чат: история из API (WhatsApp GetChatHistory) с дедупом по idMessage. */
  const handleChatOpen = useCallback(
    async (chat: Chat) => {
      if (demo) return
      const profile =
        profiles.find((p) => p.id === chat.instanceId) ??
        (!chat.instanceId ? profiles[0] : undefined)
      const load = profile ? adapterFor(profile).loadHistory : undefined
      if (!profile || !load) return
      let history: ParsedChatMessage[]
      try {
        history = await load(profile, chat.chatId)
      } catch {
        return // история — дополнение; ошибки не мешают чату и опросу уведомлений
      }
      for (const m of history) handleIncoming(profile.id, { ...m, chatId: chat.chatId })
    },
    [demo, handleIncoming, profiles],
  )

  const handlePollError = useCallback((id: string, error: string | null) => {
    setPollErrors((prev) => (prev[id] === error ? prev : { ...prev, [id]: error }))
  }, [])

  const addProfile = useCallback(
    (creds: GreenApiCredentials, opts: { remember: boolean; label?: string }) => {
      const profile = makeProfile(creds, opts)
      persistProfiles(upsertProfile(profiles, profile))
      return profile
    },
    [persistProfiles, profiles],
  )

  const openAfterAdd = useCallback((profile: InstanceProfile, needsAuth: boolean) => {
    setStates((prev) => ({ ...prev, [profile.id]: needsAuth ? 'notAuthorized' : 'authorized' }))
    if (needsAuth) {
      setAuthProfileId(profile.id)
      setRoute('instance-auth')
    } else {
      setChatFilter(profile.id)
      setRoute('chat')
    }
  }, [])

  const handleInstanceSuccess = useCallback(
    (creds: GreenApiCredentials, remember: boolean, needsAuth: boolean, label?: string) => {
      openAfterAdd(addProfile(creds, { remember, label }), needsAuth)
    },
    [addProfile, openAfterAdd],
  )

  const handlePartnerSuccess = useCallback((partner: PartnerCredentials, remember: boolean) => {
    const auth: PersistedAuth = { mode: 'partner', partner }
    saveAuth(auth, remember)
    setPartnerSession(partner)
    setRoute('partner')
  }, [])

  const handleOpenFromPartner = useCallback(
    (creds: GreenApiCredentials, needsAuth: boolean) => {
      openAfterAdd(addProfile(creds, { remember: false }), needsAuth)
    },
    [addProfile, openAfterAdd],
  )

  /** «Выйти из инстанса»: GREEN-API Logout → notAuthorized (профиль остаётся, можно авторизовать по QR). */
  const handleLogoutInstance = useCallback(
    async (id: string): Promise<boolean> => {
      const profile = profiles.find((p) => p.id === id)
      if (!profile) return false
      if (demo) {
        setStates((prev) => ({ ...prev, [id]: 'notAuthorized' }))
        return true
      }
      const ok = await logoutInstance(profile)
      if (ok) {
        setStates((prev) => ({ ...prev, [id]: 'notAuthorized' }))
      }
      return ok
    },
    [demo, profiles],
  )

  /** «Убрать из приложения»: только локально, без вызова API. */
  const handleRemoveInstance = useCallback(
    (id: string) => {
      const next = removeInstanceLocally({ profiles, chats, messages }, id)
      persistProfiles(next.profiles)
      saveChatList(next.chats)
      handleMessagesChange(next.messages)
      setStates((prev) => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
      if (chatFilter === id) setChatFilter('all')
      if (next.profiles.length === 0) setRoute('login')
    },
    [chatFilter, chats, handleMessagesChange, messages, persistProfiles, profiles, saveChatList],
  )

  const handleClearAll = useCallback(() => {
    if (!window.confirm('Удалить все инстансы, чаты и сообщения из хранилища браузера?')) {
      return
    }
    clearAllAppData()
    clearProfiles()
    setProfiles([])
    setStates({})
    setChats([])
    setMessages([])
    setPartnerSession(null)
    setRoute('login')
  }, [])

  const goDashboard = useCallback(() => {
    setRoute(profiles.length ? 'dashboard' : 'login')
  }, [profiles.length])

  const startAdd = useCallback((messenger?: Messenger) => {
    setAddMessenger(messenger)
    setRoute('login')
  }, [])

  const loginInitialMode: AccountMode | undefined =
    demoVariant === 'partner' || demoVariant === 'create-instance' ? 'partner' : undefined

  const pollers =
    !demo && (route === 'chat' || route === 'dashboard')
      ? authorizedProfiles(profiles, states).map((p) => (
          <InstancePoller
            key={p.id}
            profile={p}
            onMessage={handleIncoming}
            onError={handlePollError}
          />
        ))
      : null

  if (route === 'register') {
    return <RegisterScreen onGoLogin={() => setRoute('login')} />
  }

  if (route === 'login') {
    return (
      <>
        <LoginScreen
          key={addMessenger ?? 'default'}
          onInstanceSuccess={handleInstanceSuccess}
          onPartnerSuccess={handlePartnerSuccess}
          onGoRegister={() => setRoute('register')}
          initialMode={loginInitialMode}
          initialMessenger={addMessenger}
          onCancel={profiles.length ? () => setRoute('dashboard') : undefined}
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
          goDashboard()
        }}
        demoCreateOpen={demoVariant === 'create-instance'}
      />
    )
  }

  const authProfile = profiles.find((p) => p.id === authProfileId)
  if (route === 'instance-auth' && authProfile) {
    return (
      <InstanceAuthScreen
        key={authProfile.id}
        credentials={authProfile}
        onAuthorized={() => {
          setStates((prev) => ({ ...prev, [authProfile.id]: 'authorized' }))
          setChatFilter(authProfile.id)
          setRoute('chat')
        }}
        onBack={() => {
          setAuthProfileId(null)
          if (partnerSession) setRoute('partner')
          else goDashboard()
        }}
      />
    )
  }

  if (route === 'dashboard' || (route !== 'chat' && profiles.length)) {
    return (
      <>
        {pollers}
        <InstancesDashboard
          profiles={profiles}
          states={states}
          onRefresh={() => void refreshState()}
          onOpen={(id) => {
            setChatFilter(id)
            setRoute('chat')
          }}
          onOpenAll={() => {
            setChatFilter('all')
            setRoute('chat')
          }}
          onAuthorize={(id) => {
            setAuthProfileId(id)
            setRoute('instance-auth')
          }}
          onLogoutInstance={handleLogoutInstance}
          onRemove={handleRemoveInstance}
          onAdd={startAdd}
        />
      </>
    )
  }

  if (!profiles.length) {
    return (
      <LoginScreen
        onInstanceSuccess={handleInstanceSuccess}
        onPartnerSuccess={handlePartnerSuccess}
        onGoRegister={() => setRoute('register')}
      />
    )
  }

  const pollErrorKey =
    chatFilter === 'all' ? Object.keys(pollErrors).find((k) => pollErrors[k]) : chatFilter
  const pollError = (pollErrorKey && pollErrors[pollErrorKey]) || null

  return (
    <>
      {pollers}
      <ChatLayout
        profiles={profiles}
        states={states}
        filter={chatFilter}
        onFilterChange={setChatFilter}
        onRefreshState={refreshState}
        onOpenDashboard={() => setRoute('dashboard')}
        onLogoutInstance={handleLogoutInstance}
        onAuthorizeInstance={(id) => {
          setAuthProfileId(id)
          setRoute('instance-auth')
        }}
        chats={chats}
        messages={messages}
        onChatsChange={saveChatList}
        onMessagesChange={handleMessagesChange}
        pollError={pollError}
        onPollError={(e) => {
          if (pollErrorKey) handlePollError(pollErrorKey, e)
        }}
        initialModalOpen={demoVariant === 'modal'}
        defaultSelectedChatId={defaultChatIdForDemo(demoVariant)}
        onChatOpen={handleChatOpen}
      />
    </>
  )
}

export default App
