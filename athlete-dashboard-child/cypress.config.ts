import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://aiworkoutgenerator-local.local',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: true,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    pageLoadTimeout: 30000,
    defaultCommandTimeout: 10000
  },
}) 
