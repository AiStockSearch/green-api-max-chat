import type { InstanceCredentialsEnv } from './commands'
import { instanceApiUrl, parseIncomingText, parseOutgoingMessageStatus } from './greenApi'

declare global {
  namespace Cypress {
    interface Chainable {
      apiSendMessage(chatId: string, message: string): Chainable<{ idMessage: string }>
      apiReceiveNotification(receiveTimeout?: number): Chainable<{
        receiptId: number
        body: unknown
      } | null>
      apiDeleteNotification(receiptId: number): Chainable<void>
      apiDrainQueue(max?: number): Chainable<number>
      apiPollAndDeleteAll(rounds?: number): Chainable<number>
      requireAuthorizedInstance(): Chainable<void>
      loginToChatLayout(): Chainable<void>
      openLiveChat(chatId: string): Chainable<void>
      waitForIncomingMessage(
        text: string,
        options?: { timeoutMs?: number },
      ): Chainable<boolean>
      apiWaitForOutgoingMessageStatus(
        idMessage: string,
        options?: { timeoutMs?: number },
      ): Chainable<{ status?: string }>
    }
  }
}

function withCreds<T>(
  fn: (creds: InstanceCredentialsEnv) => Cypress.Chainable<T>,
): Cypress.Chainable<T> {
  return cy.getInstanceCredentials().then((creds) => fn(creds))
}

Cypress.Commands.add('apiSendMessage', (chatId: string, message: string) => {
  return withCreds((creds) => {
    const url = instanceApiUrl(creds, 'sendMessage')
    return cy
      .request({
        method: 'POST',
        url,
        body: { chatId, message },
        failOnStatusCode: false,
      })
      .then((res) => {
        expect(res.status, 'SendMessage HTTP').to.eq(200)
        expect(res.body?.idMessage, 'idMessage').to.be.a('string').and.not.be.empty
        return { idMessage: String(res.body.idMessage) }
      })
  })
})

Cypress.Commands.add('apiReceiveNotification', (receiveTimeout = 5) => {
  return withCreds((creds) => {
    const url = `${instanceApiUrl(creds, 'receiveNotification')}?receiveTimeout=${receiveTimeout}`
    return cy.request({ method: 'GET', url, failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(200)
      if (!res.body || res.body.receiptId == null) {
        return null
      }
      return { receiptId: Number(res.body.receiptId), body: res.body.body }
    })
  })
})

Cypress.Commands.add('apiDeleteNotification', (receiptId: number) => {
  return withCreds((creds) => {
    const url = `${instanceApiUrl(creds, 'deleteNotification')}/${receiptId}`
    return cy.request({ method: 'DELETE', url, failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(200)
    })
  })
})

Cypress.Commands.add('apiDrainQueue', (max = 25) => {
  let deleted = 0
  const step = (): Cypress.Chainable<number> => {
    if (deleted >= max) {
      return cy.wrap(deleted)
    }
    return cy.apiReceiveNotification(1).then((note) => {
      if (!note) {
        return cy.wrap(deleted)
      }
      deleted += 1
      return cy.apiDeleteNotification(note.receiptId).then(() => step())
    })
  }
  return step()
})

Cypress.Commands.add('apiPollAndDeleteAll', (rounds = 4) => {
  let total = 0
  const round = (left: number): Cypress.Chainable<number> => {
    if (left <= 0) {
      return cy.wrap(total)
    }
    return cy.apiReceiveNotification(5).then((note) => {
      if (!note) {
        return cy.wrap(total)
      }
      total += 1
      return cy.apiDeleteNotification(note.receiptId).then(() => round(left - 1))
    })
  }
  return round(rounds)
})

Cypress.Commands.add('requireAuthorizedInstance', () => {
  return cy.getStateInstanceViaProxy().then((body) => {
    expect(body.stateInstance, 'stateInstance для live-чата').to.eq('authorized')
  })
})

Cypress.Commands.add('loginToChatLayout', () => {
  cy.loginInstance({ remember: false })
  cy.get('[data-ui="chat-shell"]', { timeout: 30000 }).should('be.visible')
})

Cypress.Commands.add('openLiveChat', (chatId: string) => {
  // @g.us (группа WhatsApp) вводим как есть, иначе — только цифры номера / ID MAX
  const dial = String(chatId).includes('@g.us') ? '' : String(chatId).replace(/\D/g, '')
  cy.get('body').then(($body) => {
    if ($body.find('[data-ui="active-chat"]').length > 0) {
      return
    }
    cy.contains('button', 'Новый чат').click()
    cy.get('[data-ui="new-chat-panel"]').should('be.visible')
    cy.get('#new-chat-phone').clear().type(dial || String(chatId))
    cy.get('[data-cy="new-chat-submit"]').click()
    cy.get('[data-ui="new-chat-panel"]').should('not.exist')
    cy.get('[data-ui="active-chat"]', { timeout: 15000 }).should('be.visible')
  })
})

Cypress.Commands.add('waitForIncomingMessage', (text: string, options = {}) => {
  const timeoutMs = options.timeoutMs ?? 90000
  const started = Date.now()

  const poll = (): Cypress.Chainable<boolean> => {
    if (Date.now() - started > timeoutMs) {
      return cy.wrap(false)
    }
    return cy.apiReceiveNotification(5).then((note) => {
      if (!note) {
        return cy.wait(2000).then(() => poll())
      }
      const incoming = parseIncomingText(note.body)
      cy.apiDeleteNotification(note.receiptId)
      if (incoming?.text.includes(text)) {
        return cy.wrap(true)
      }
      return cy.wait(1500).then(() => poll())
    })
  }

  return poll()
})

Cypress.Commands.add('apiWaitForOutgoingMessageStatus', (idMessage, options = {}) => {
  const timeoutMs = options.timeoutMs ?? 90000
  const started = Date.now()

  const poll = (): Cypress.Chainable<{ status?: string }> => {
    if (Date.now() - started > timeoutMs) {
      throw new Error(
        `ReceiveNotification: не дождались outgoingMessageStatus для idMessage=${idMessage}`,
      )
    }
    return cy.apiReceiveNotification(5).then((note) => {
      if (!note) {
        return cy.wait(1500).then(() => poll())
      }
      const outgoing = parseOutgoingMessageStatus(note.body)
      if (outgoing?.idMessage === idMessage) {
        return cy.apiDeleteNotification(note.receiptId).then(() => ({ status: outgoing.status }))
      }
      return cy.apiDeleteNotification(note.receiptId).then(() => poll())
    })
  }

  return poll()
})

export {}
