import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { makeProfile } from '../api/profilesStore'
import { ChatLayout } from './ChatLayout'
import { LoginScreen } from './LoginScreen'

const base = { apiTokenInstance: 'YOUR_API_TOKEN', apiUrl: 'https://api.green-api.com' }
const wa = makeProfile({ ...base, idInstance: '1101000001', messenger: 'whatsapp' }, { now: 1 })
const tg = makeProfile({ ...base, idInstance: '1101000002', messenger: 'telegram' }, { now: 1 })

function brand(filter: string) {
  const html = renderToStaticMarkup(
    <ChatLayout
      profiles={[wa, tg]}
      states={{ [wa.id]: 'authorized', [tg.id]: 'authorized' }}
      filter={filter}
      onFilterChange={() => {}}
      onRefreshState={() => {}}
      onOpenDashboard={() => {}}
      onLogoutInstance={async () => true}
      chats={[]}
      messages={[]}
      onChatsChange={() => {}}
      onMessagesChange={() => {}}
      pollError={null}
      onPollError={() => {}}
    />,
  )
  return /data-cy="chat-brand-title"[^>]*>([^<]*)</.exec(html)?.[1]
}

describe('ChatLayout sidebar header', () => {
  it('shows the messenger of the selected instance', () => {
    expect(brand(wa.id)).toBe('WhatsApp')
    expect(brand(tg.id)).toBe('Telegram')
  })

  it('shows «Все чаты» without a messenger name in the unified view', () => {
    expect(brand('all')).toBe('Все чаты')
  })
})

describe('LoginScreen subtitle', () => {
  const render = (initialMode: 'instance' | 'partner') =>
    renderToStaticMarkup(
      <LoginScreen
        initialMode={initialMode}
        onInstanceSuccess={() => {}}
        onPartnerSuccess={() => {}}
        onGoRegister={() => {}}
      />,
    )

  it('instance tab mentions instance keys', () => {
    expect(render('instance')).toContain('Ключи инстанса — в')
  })

  it('partner tab mentions Partner API', () => {
    const html = render('partner')
    expect(html).toContain('Partner API — ключ в')
    expect(html).not.toContain('Ключи инстанса — в')
  })
})
