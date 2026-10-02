import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LoginScreen } from './LoginScreen'

describe('LoginScreen autocomplete', () => {
  it('instance form: username + current-password', () => {
    const html = renderToStaticMarkup(
      <LoginScreen
        onInstanceSuccess={() => {}}
        onPartnerSuccess={() => {}}
        onGoRegister={() => {}}
      />,
    )
    expect(html).toMatch(/autocomplete="username"/i)
    expect(html).toMatch(/autocomplete="current-password"/i)
    expect(html).toContain('name="username"')
    expect(html).toContain('name="password"')
  })
})
