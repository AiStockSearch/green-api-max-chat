/// <reference types="cypress" />

describe('Вход инстанса → авторизация (MAX | WhatsApp по GREEN_API_MESSENGER)', () => {
  beforeEach(() => {
    cy.clearAllSessionStorage()
    cy.clearAllLocalStorage()
  })

  it('логин с ключами из cypress.env и переход на QR / чат', () => {
    cy.loginInstance({ remember: false })

    cy.getInstanceCredentials().then(({ idInstance }) => {
      cy.get('body', { timeout: 25000 }).should(($body) => {
        const text = $body.text()
        const onAuth = $body.find('[data-ui="instance-auth"]').length > 0
        const onChat = $body.find('[data-ui="active-chat"]').length > 0
        const onUnauthorized = text.includes('Инстанс не авторизован')
        expect(onAuth || onChat || onUnauthorized, 'экран после входа').to.eq(true)
      })

      cy.get('body').then(($body) => {
        if ($body.find('[data-ui="instance-auth"]').length) {
          cy.contains('idInstance').should('contain', idInstance)
          cy.get('[data-ui="instance-auth"]').within(() => {
            cy.contains(/QR|qr\.green-api|Авторизация инстанса/i).should('be.visible')
            cy.get('[data-cy="qr-image"], [data-cy="qr-placeholder"]').should('exist')
          })
          return
        }
        if ($body.find('[data-ui="active-chat"]').length) {
          cy.get('[data-ui="active-chat"]').should('be.visible')
          return
        }
        cy.contains('Проверить снова').should('be.visible')
      })
    })
  })

  it('сохраняет idInstance на экране авторизации', () => {
    cy.loginInstance()
    cy.get('[data-ui="instance-auth"]', { timeout: 20000 }).should('be.visible')
    cy.getInstanceCredentials().then(({ idInstance }) => {
      cy.get('[data-ui="instance-auth"]').should('contain', idInstance)
    })
  })
})
