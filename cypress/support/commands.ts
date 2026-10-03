export type MessengerEnv = 'max' | 'whatsapp'

export interface InstanceCredentialsEnv {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
  /** cypress.env `messenger` или GREEN_API_MESSENGER (max|whatsapp), по умолчанию max */
  messenger: MessengerEnv
}

export function parseMessengerEnv(raw: unknown): MessengerEnv {
  return String(raw ?? '').trim().toLowerCase() === 'whatsapp' ? 'whatsapp' : 'max'
}

declare global {
  namespace Cypress {
    interface Chainable {
      getInstanceCredentials(): Chainable<InstanceCredentialsEnv>
      loginInstance(options?: { remember?: boolean }): Chainable<void>
      getStateInstanceViaProxy(): Chainable<{ stateInstance?: string }>
    }
  }
}

const CREDENTIAL_KEYS = ['idInstance', 'apiTokenInstance', 'apiUrl', 'messenger'] as const

function readInstanceCredentials(): Cypress.Chainable<InstanceCredentialsEnv> {
  return cy.env([...CREDENTIAL_KEYS]).then((env) => {
    const idInstance = env.idInstance
    const apiTokenInstance = env.apiTokenInstance
    const apiUrl = env.apiUrl
    expect(idInstance, 'cypress.env idInstance').to.be.a('string').and.not.be.empty
    expect(apiTokenInstance, 'cypress.env apiTokenInstance').to.be.a('string').and.not.be.empty
    expect(apiUrl, 'cypress.env apiUrl').to.be.a('string').and.not.be.empty
    return {
      idInstance: String(idInstance),
      apiTokenInstance: String(apiTokenInstance),
      apiUrl: String(apiUrl),
      messenger: parseMessengerEnv(env.messenger),
    }
  })
}

Cypress.Commands.add('getInstanceCredentials', () => readInstanceCredentials())

Cypress.Commands.add('getStateInstanceViaProxy', () => {
  return readInstanceCredentials().then(({ idInstance, apiTokenInstance, apiUrl }) => {
    const base = String(apiUrl).replace(/\/+$/, '')
    const url = `${base}/waInstance${idInstance}/getStateInstance/${apiTokenInstance}`
    return cy.request({ method: 'GET', url, failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(200)
      return res.body as { stateInstance?: string }
    })
  })
})

Cypress.Commands.add('loginInstance', (options = {}) => {
  const remember = options.remember ?? false
  readInstanceCredentials().then(({ idInstance, apiTokenInstance, apiUrl, messenger }) => {
    cy.visit('/')
    cy.get('[data-ui="login-screen"]').should('be.visible')
    cy.get('[data-cy="mode-instance"]').click()
    cy.get(`[data-cy="messenger-${messenger}"]`).click()
    cy.get('#idInstance').clear().type(idInstance)
    cy.get('#apiTokenInstance').clear().type(apiTokenInstance, { log: false })
    cy.get('#apiUrl').clear().type(String(apiUrl), { delay: 0 })
    if (remember) {
      cy.get('[data-cy="remember-instance"]').check()
    } else {
      cy.get('[data-cy="remember-instance"]').uncheck()
    }
    cy.get('[data-cy="submit-instance"]').click()
  })
})

export {}
