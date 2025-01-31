/// <reference types="cypress" />
import '@testing-library/cypress/add-commands'
import 'cypress-terminal-report/src/installLogsCollector'
import './profile-commands'

// Login before each test
beforeEach(() => {
  const username = Cypress.env('WP_USERNAME') || 'cypress_test_user'
  const password = Cypress.env('WP_PASSWORD') || 'TestUser123!'
  
  // Clear cookies and login
  cy.clearCookies()
  cy.loginToWordPress(username, password)
  
  // Visit the profile page and verify it loads
  cy.visit('/dashboard/?dashboard_feature=profile', {
    failOnStatusCode: false,
    timeout: 30000
  })
  
  // Log the current URL and page content for debugging
  cy.url().then(url => {
    cy.log(`Current URL: ${url}`)
  })
  
  // Wait for the dashboard content to load
  cy.get('.dashboard-content', { timeout: 30000 }).should('be.visible')
  cy.get('[aria-label="Physical Measurements"]', { timeout: 30000 }).should('be.visible')
})

// Custom command to login to WordPress
Cypress.Commands.add('loginToWordPress', (username: string, password: string) => {
  cy.log(`Attempting to log in as ${username}`)
  cy.visit('/wp-login.php')
  
  // Wait for the login form to be ready
  cy.get('#loginform').should('be.visible')
  
  // Fill in credentials
  cy.get('#user_login').should('be.visible').clear().type(username)
  cy.get('#user_pass').should('be.visible').clear().type(password)
  
  // Submit form and wait for response
  cy.get('#wp-submit').click()
  
  // Check for login errors
  cy.get('#login_error').should('not.exist').then(() => {
    cy.log('No login errors detected')
  })
  
  // Verify redirect to admin and wait for it to complete
  cy.url().should('include', '/wp-admin', { timeout: 30000 }).then((url) => {
    cy.log(`Redirected to: ${url}`)
  })
  
  // Wait for admin page to be ready
  cy.get('body').should('have.class', 'wp-admin')
})

// Add more detailed logging for debugging
Cypress.on('log:added', (log) => {
  if (log.displayName === 'xhr' || log.displayName === 'request') {
    console.log(`${log.displayName.toUpperCase()}: ${log.url}`)
    if (log.response) {
      console.log('Response:', log.response?.body)
    }
  }
})

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err) => {
  console.error('Uncaught exception:', err)
  return false
})

// Extend Cypress types
declare global {
  namespace Cypress {
    interface Chainable {
      loginToWordPress(username: string, password: string): void
    }
  }
} 
