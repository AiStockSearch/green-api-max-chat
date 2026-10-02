/// <reference types="cypress" />

describe('GREEN-API: ключи инстанса (7107)', () => {
  it('getStateInstance через dev-прокси возвращает stateInstance', () => {
    cy.getStateInstanceViaProxy().then((body) => {
      expect(body.stateInstance, 'stateInstance').to.be.a('string')
      cy.log(`stateInstance=${body.stateInstance}`)
    })
  })
})
