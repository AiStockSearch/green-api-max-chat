/// <reference types="cypress" />

describe('Демо-маршруты (без live Partner token)', () => {
  it('register screen', () => {
    cy.visit('/?demo=register')
    cy.get('[data-ui="register-screen"]').should('be.visible')
    cy.contains('console.green-api.com').should('have.attr', 'href').and('include', 'console.green-api.com')
  })

  it('partner instances demo', () => {
    cy.visit('/?demo=partner')
    cy.get('[data-ui="partner-instances"]').should('be.visible')
    cy.contains('MAX — демо инстанс').should('be.visible')
  })

  it('instance QR demo', () => {
    cy.visit('/?demo=instance-qr')
    cy.get('[data-ui="instance-auth"]').should('be.visible')
  })
})
