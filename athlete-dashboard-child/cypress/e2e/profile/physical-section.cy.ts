describe('Profile Physical Section', () => {
  describe('Section Visibility and Structure', () => {
    it('should display the physical section with all required fields', () => {
      cy.get('[aria-label="Physical Measurements"]').should('be.visible')
      cy.get('#height').should('exist')
      cy.get('#weight').should('exist')
      cy.get('#chest').should('exist')
      cy.get('#waist').should('exist')
      cy.get('#hips').should('exist')
    })

    it('should display unit toggle buttons', () => {
      cy.get('[aria-label="Select unit system"]').should('be.visible')
      cy.get('button').contains('Metric').should('exist')
      cy.get('button').contains('Imperial').should('exist')
    })
  })

  describe('Height Conversions', () => {
    it('should correctly convert height from metric to imperial', () => {
      // Set to metric and enter 180cm
      cy.get('button').contains('Metric').click()
      cy.get('#height').clear().type('180')
      
      // Switch to imperial and verify conversion
      cy.get('button').contains('Imperial').click()
      cy.get('#height-feet').should('have.value', '5')
      cy.get('#height-inches').should('have.value', '11')
    })

    it('should correctly convert height from imperial to metric', () => {
      // Set to imperial and enter 5'11"
      cy.get('button').contains('Imperial').click()
      cy.get('#height-feet').clear().type('5')
      cy.get('#height-inches').clear().type('11')
      
      // Switch to metric and verify conversion
      cy.get('button').contains('Metric').click()
      cy.get('#height').invoke('val').then((val) => {
        const heightValue = parseFloat(val as string)
        expect(heightValue).to.be.closeTo(1803.4, 1)
      })
    })

    it('should handle edge cases in height conversion', () => {
      // Test converting 6'0" to metric
      cy.get('button').contains('Imperial').click()
      cy.get('#height-feet').clear().type('6')
      cy.get('#height-inches').clear().type('0')
      
      cy.get('button').contains('Metric').click()
      cy.get('#height').invoke('val').then((val) => {
        const heightValue = parseFloat(val as string)
        expect(heightValue).to.be.closeTo(1828.8, 1)
      })
      
      // Convert back to imperial and verify
      cy.get('button').contains('Imperial').click()
      cy.get('#height-feet').should('have.value', '6')
      cy.get('#height-inches').should('have.value', '0')
    })
  })

  describe('Form Validation', () => {
    it('should not accept negative values', () => {
      cy.get('#height').clear().type('-180')
      cy.get('#weight').clear().type('-80')
      
      // Submit form
      cy.get('button').contains('Save Changes').click()
      
      // Check for validation errors (using min attribute)
      cy.get('#height').should('have.attr', 'min', '0')
      cy.get('#weight').should('have.attr', 'min', '0')
    })

    it('should require height and weight', () => {
      cy.get('#height').clear()
      cy.get('#weight').clear()
      
      // Submit form
      cy.get('button').contains('Save Changes').click()
      
      // Check for required attribute
      cy.get('#height').should('have.attr', 'required')
      cy.get('#weight').should('have.attr', 'required')
    })
  })

  describe('Unit Persistence', () => {
    it('should maintain unit preference after page reload', () => {
      // Set to imperial
      cy.get('button').contains('Imperial').click()
      
      // Save changes
      cy.get('button').contains('Save Changes').click()
      
      // Wait for save to complete
      cy.get('button').contains('Save Changes').should('not.be.disabled')
      
      // Reload page
      cy.reload()
      
      // Wait for page to load
      cy.get('[aria-label="Physical Measurements"]').should('be.visible')
      
      // Verify imperial is still selected
      cy.get('button[role="radio"]').contains('Imperial').should('have.attr', 'aria-checked', 'true')
    })
  })
}) 