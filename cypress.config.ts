import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:43128',
    viewportWidth: 1280,
    viewportHeight: 900,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 20000,
    requestTimeout: 20000,
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    setupNodeEvents(_on, config) {
      // GREEN_API_MESSENGER=max|whatsapp переопределяет messenger из cypress.env.json
      const messenger = process.env.GREEN_API_MESSENGER
      if (messenger) {
        config.env = { ...config.env, messenger }
      }
      return config
    },
  },
})
