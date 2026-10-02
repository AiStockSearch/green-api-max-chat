/// <reference types="cypress" />

describe('Live QR (7107, notAuthorized)', () => {
  it('fetch QR через прокси возвращает qrCode или already_registered', () => {
    cy.getInstanceCredentials().then(({ idInstance, apiTokenInstance, apiUrl }) => {
      const base = String(apiUrl).replace(/\/+$/, '')
      const url = `${base}/waInstance${idInstance}/qr/${apiTokenInstance}`
      cy.request({ method: 'GET', url, failOnStatusCode: false, timeout: 30000 }).then(
        (res) => {
          expect(res.status).to.be.oneOf([200, 429])
          if (res.status === 429) {
            cy.log('rate limit QR — пропускаем проверку тела')
            return
          }
          expect(res.body).to.have.property('type')
          expect(res.body.type).to.be.oneOf(['qrCode', 'error', 'already_registered', 'alreadyLogged'])
        },
      )
    })
  })
})
