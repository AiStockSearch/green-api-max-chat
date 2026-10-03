/// <reference types="cypress" />

/**
 * Live-цикл SendMessage + ReceiveNotification.
 * Требует: authorized инстанс, chatId в cypress.env.json.
 * Входящее в UI (опционально): во время прогона отправьте с MAX/WhatsApp на инстанс текст marker.
 * Мессенджер: cypress.env `messenger` или GREEN_API_MESSENGER (max|whatsapp).
 */
describe('Live: SendMessage + ReceiveNotification', () => {
  beforeEach(() => {
    cy.clearAllSessionStorage()
    cy.clearAllLocalStorage()
  })

  before(function () {
    cy.env(['chatId']).then((env) => {
      if (!env.chatId) {
        cy.log('Пропуск: задайте chatId в cypress.env.json (номер, chatId MAX или …@c.us)')
        this.skip()
      }
    })
    cy.getStateInstanceViaProxy().then((body) => {
      if (body.stateInstance !== 'authorized') {
        cy.log(
          `Пропуск: инстанс не authorized (сейчас ${body.stateInstance}). Авторизуйте инстанс по QR.`,
        )
        this.skip()
      }
    })
  })

  it('полный цикл: drain → API SendMessage → UI SendMessage → receive/delete → UI incoming', () => {
    const chatId = Cypress.env('chatId') as string
    const ts = Date.now()
    const apiText = `e2e-api-${ts}`
    const uiText = `e2e-ui-${ts}`
    const incomingMarker =
      (Cypress.env('incomingMarker') as string | undefined) || `e2e-in-${ts}`

    cy.apiDrainQueue()

    cy.apiSendMessage(chatId, apiText).then(({ idMessage }) => {
      cy.log(`SendMessage OK idMessage=${idMessage}`)
      cy.apiWaitForOutgoingMessageStatus(idMessage, { timeoutMs: 120000 }).then(({ status }) => {
        cy.log(`ReceiveNotification → outgoingMessageStatus: ${status ?? 'ok'}`)
      })
    })

    cy.apiPollAndDeleteAll(4)

    cy.loginToChatLayout()
    cy.openLiveChat(chatId)

    cy.get('[data-cy="composer-input"]').clear().type(uiText)
    cy.get('[data-cy="send-message"]').should('not.be.disabled').click()

    cy.get('[data-ui="active-chat"]', { timeout: 20000 }).should('contain', uiText)

    cy.apiPollAndDeleteAll(4)

    cy.getInstanceCredentials().then(({ messenger }) => {
      const label = messenger === 'whatsapp' ? 'WhatsApp' : 'MAX'
      cy.log(`Для проверки входящего в UI отправьте с ${label} на инстанс сообщение: ${incomingMarker}`)
    })

    cy.waitForIncomingMessage(incomingMarker, { timeoutMs: 120000 }).then((gotIncoming) => {
      if (Cypress.env('requireIncoming') === true) {
        expect(gotIncoming, 'incomingMessageReceived за timeout').to.eq(true)
      } else if (!gotIncoming) {
        cy.log('Входящее за окно не получено — UI-incoming пропущен (requireIncoming=false)')
        return
      }
      cy.get('[data-ui="active-chat"]', { timeout: 45000 }).should('contain', incomingMarker)
    })
  })
})
