import { test, expect } from '@playwright/test'

/**
 * Onboarding Wizard E2E Tests
 * 
 * Tests all critical functionality:
 * - Multi-step navigation
 * - State persistence (localStorage)
 * - Deep-linking via URL parameters
 * - Accessibility and focus management
 * - Keyboard navigation
 * - Progress tracking
 */

test.describe('Onboarding Wizard - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding-demo')
    // Clear any saved progress
    await page.evaluate(() => localStorage.clear())
  })

  test('should open wizard when clicking Start button', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Verify dialog is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Verify first step is shown
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()
    await expect(page.locator('text=Welcome to Meridians!')).toBeVisible()
  })

  test('should navigate forward through all steps', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Step 1
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()
    await expect(page.locator('text=Welcome to Meridians!')).toBeVisible()
    
    // Step 2
    await page.click('text=Next')
    await expect(page.locator('text=Step 2 of 5')).toBeVisible()
    await expect(page.locator('text=Create Your Profile')).toBeVisible()
    
    // Step 3
    await page.click('text=Next')
    await expect(page.locator('text=Step 3 of 5')).toBeVisible()
    await expect(page.locator('text=Customize Your Experience')).toBeVisible()
    
    // Step 4
    await page.click('text=Next')
    await expect(page.locator('text=Step 4 of 5')).toBeVisible()
    await expect(page.locator('text=Stay Connected')).toBeVisible()
    
    // Step 5
    await page.click('text=Next')
    await expect(page.locator('text=Step 5 of 5')).toBeVisible()
    await expect(page.locator('text=You\'re All Set!')).toBeVisible()
  })

  test('should navigate backward through steps', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Go to step 3
    await page.click('text=Next')
    await page.click('text=Next')
    await expect(page.locator('text=Step 3 of 5')).toBeVisible()
    
    // Go back to step 2
    await page.click('text=Back')
    await expect(page.locator('text=Step 2 of 5')).toBeVisible()
    
    // Go back to step 1
    await page.click('text=Back')
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()
  })

  test('should disable Back button on first step', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    const backButton = page.locator('button:has-text("Back")')
    await expect(backButton).toBeDisabled()
  })

  test('should show Complete button on last step', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Navigate to last step
    for (let i = 0; i < 4; i++) {
      await page.click('text=Next')
    }
    
    // Verify Complete button is shown
    await expect(page.locator('button:has-text("Complete")')).toBeVisible()
    await expect(page.locator('button:has-text("Next")')).not.toBeVisible()
  })

  test('should close wizard when clicking Complete', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Navigate to last step
    for (let i = 0; i < 4; i++) {
      await page.click('text=Next')
    }
    
    // Click Complete
    await page.click('button:has-text("Complete")')
    
    // Verify dialog is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })
})

test.describe('Onboarding Wizard - State Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding-demo')
    await page.evaluate(() => localStorage.clear())
  })

  test('should save progress to localStorage', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Navigate to step 3
    await page.click('text=Next')
    await page.click('text=Next')
    
    // Check localStorage
    const savedStep = await page.evaluate(() => 
      localStorage.getItem('onboarding-wizard-demo-wizard')
    )
    
    expect(savedStep).toBe('2') // Step 3 is index 2
  })

  test('should restore progress from localStorage after reload', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Navigate to step 3
    await page.click('text=Next')
    await page.click('text=Next')
    await expect(page.locator('text=Step 3 of 5')).toBeVisible()
    
    // Close wizard
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    
    // Reload page
    await page.reload()
    
    // Reopen wizard
    await page.click('text=Start Onboarding')
    
    // Should resume at step 3
    await expect(page.locator('text=Step 3 of 5')).toBeVisible()
    await expect(page.locator('text=Customize Your Experience')).toBeVisible()
  })

  test('should clear progress after completion', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Navigate to last step and complete
    for (let i = 0; i < 4; i++) {
      await page.click('text=Next')
    }
    await page.click('button:has-text("Complete")')
    
    // Check localStorage is cleared
    const savedStep = await page.evaluate(() => 
      localStorage.getItem('onboarding-wizard-demo-wizard')
    )
    
    expect(savedStep).toBeNull()
  })

  test('should start from beginning after completion', async ({ page }) => {
    // Complete wizard once
    await page.click('text=Start Onboarding')
    for (let i = 0; i < 4; i++) {
      await page.click('text=Next')
    }
    await page.click('button:has-text("Complete")')
    
    // Start again
    await page.click('text=Start Onboarding')
    
    // Should start at step 1
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()
    await expect(page.locator('text=Welcome to Meridians!')).toBeVisible()
  })
})

test.describe('Onboarding Wizard - Deep Linking', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
  })

  test('should open at specific step via URL parameter', async ({ page }) => {
    // Navigate with query parameter
    await page.goto('/onboarding-demo?onboarding=profile')
    
    // Click to open wizard
    await page.click('text=Start Onboarding')
    
    // Should open at step 2 (profile)
    await expect(page.locator('text=Step 2 of 5')).toBeVisible()
    await expect(page.locator('text=Create Your Profile')).toBeVisible()
  })

  test('should support deep linking to any step', async ({ page }) => {
    const steps = [
      { param: 'welcome', stepNum: 1, title: 'Welcome to Meridians!' },
      { param: 'profile', stepNum: 2, title: 'Create Your Profile' },
      { param: 'preferences', stepNum: 3, title: 'Customize Your Experience' },
      { param: 'notifications', stepNum: 4, title: 'Stay Connected' },
      { param: 'complete', stepNum: 5, title: 'You\'re All Set!' },
    ]

    for (const step of steps) {
      await page.goto(`/onboarding-demo?onboarding=${step.param}`)
      await page.click('text=Start Onboarding')
      
      await expect(page.locator(`text=Step ${step.stepNum} of 5`)).toBeVisible()
      await expect(page.locator(`text=${step.title}`)).toBeVisible()
      
      // Close for next iteration
      await page.keyboard.press('Escape')
    }
  })

  test('should update URL when navigating steps', async ({ page }) => {
    await page.goto('/onboarding-demo')
    await page.click('text=Start Onboarding')
    
    // Navigate to step 2
    await page.click('text=Next')
    
    // Check URL is updated
    await expect(page).toHaveURL(/onboarding=profile/)
  })

  test('should clear URL parameter when closing wizard', async ({ page }) => {
    await page.goto('/onboarding-demo?onboarding=profile')
    await page.click('text=Start Onboarding')
    
    // Close wizard
    await page.keyboard.press('Escape')
    
    // URL parameter should be cleared
    await expect(page).not.toHaveURL(/onboarding=/)
  })

  test('should use URL parameter over localStorage', async ({ page }) => {
    // Set localStorage to step 1
    await page.goto('/onboarding-demo')
    await page.evaluate(() => {
      localStorage.setItem('onboarding-wizard-demo-wizard', '1')
    })
    
    // Navigate with URL parameter to step 3
    await page.goto('/onboarding-demo?onboarding=preferences')
    await page.click('text=Start Onboarding')
    
    // Should show step 3 (URL takes priority)
    await expect(page.locator('text=Step 3 of 5')).toBeVisible()
  })
})

test.describe('Onboarding Wizard - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding-demo')
  })

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    const dialog = page.locator('[role="dialog"]')
    
    // Verify dialog role
    await expect(dialog).toBeVisible()
    
    // Verify aria-labelledby
    await expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-wizard-title')
    
    // Verify aria-describedby
    await expect(dialog).toHaveAttribute('aria-describedby', 'onboarding-wizard-description')
  })

  test('should have progress bar with ARIA attributes', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    const progressBar = page.locator('[role="progressbar"]')
    
    await expect(progressBar).toBeVisible()
    await expect(progressBar).toHaveAttribute('aria-valuenow', '1')
    await expect(progressBar).toHaveAttribute('aria-valuemin', '1')
    await expect(progressBar).toHaveAttribute('aria-valuemax', '5')
  })

  test('should update progress bar on step change', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    const progressBar = page.locator('[role="progressbar"]')
    
    // Step 1
    await expect(progressBar).toHaveAttribute('aria-valuenow', '1')
    
    // Step 2
    await page.click('text=Next')
    await expect(progressBar).toHaveAttribute('aria-valuenow', '2')
    
    // Step 3
    await page.click('text=Next')
    await expect(progressBar).toHaveAttribute('aria-valuenow', '3')
  })

  test('should have accessible button labels', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Back button
    const backButton = page.locator('button[aria-label="Go to previous step"]')
    await expect(backButton).toBeVisible()
    
    // Next button
    const nextButton = page.locator('button[aria-label="Go to next step"]')
    await expect(nextButton).toBeVisible()
  })

  test('should have live region for announcements', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    const liveRegion = page.locator('[role="status"][aria-live="polite"]')
    await expect(liveRegion).toBeInTheDocument()
  })

  test('should restore focus to trigger button on close', async ({ page }) => {
    const triggerButton = page.locator('button:has-text("Start Onboarding")')
    
    // Open wizard
    await triggerButton.click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Close wizard
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    
    // Focus should return to trigger
    await expect(triggerButton).toBeFocused()
  })
})

test.describe('Onboarding Wizard - Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding-demo')
  })

  test('should close wizard with Escape key', async ({ page }) => {
    await page.click('text=Start Onboarding')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('should navigate with arrow keys', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Initially on step 1
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()
    
    // Right arrow to step 2
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('text=Step 2 of 5')).toBeVisible()
    
    // Right arrow to step 3
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('text=Step 3 of 5')).toBeVisible()
    
    // Left arrow to step 2
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('text=Step 2 of 5')).toBeVisible()
  })

  test('should not navigate with arrows when focused on input', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Navigate to profile step (has inputs)
    await page.click('text=Next')
    await expect(page.locator('text=Step 2 of 5')).toBeVisible()
    
    // Focus name input
    const nameInput = page.locator('input[id="name"]')
    await nameInput.focus()
    
    // Arrow keys should not navigate
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('text=Step 2 of 5')).toBeVisible() // Still on step 2
  })

  test('should navigate through interactive elements with Tab', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Tab through elements
    await page.keyboard.press('Tab') // Close button
    await page.keyboard.press('Tab') // Back button
    await page.keyboard.press('Tab') // Next button
    
    // Next button should be focused
    const nextButton = page.locator('button:has-text("Next")')
    await expect(nextButton).toBeFocused()
  })
})

test.describe('Onboarding Wizard - Progress Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding-demo')
  })

  test('should show correct step counter', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Step 1
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()
    
    // Step 2
    await page.click('text=Next')
    await expect(page.locator('text=Step 2 of 5')).toBeVisible()
    
    // Step 3
    await page.click('text=Next')
    await expect(page.locator('text=Step 3 of 5')).toBeVisible()
  })

  test('should show progress bar filling up', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    const progressBar = page.locator('[role="progressbar"] > div')
    
    // Step 1: 20% progress
    const width1 = await progressBar.evaluate((el) => 
      window.getComputedStyle(el).width
    )
    
    // Step 3: 60% progress
    await page.click('text=Next')
    await page.click('text=Next')
    
    const width3 = await progressBar.evaluate((el) => 
      window.getComputedStyle(el).width
    )
    
    // Width should increase
    expect(parseFloat(width3)).toBeGreaterThan(parseFloat(width1))
  })

  test('should show step indicators', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Should have 5 step indicator dots
    const dots = page.locator('[class*="rounded-full"]').filter({ 
      hasText: '' 
    })
    
    // Count visible dots (5 steps)
    const dotCount = await page.locator('div.w-2.h-2.rounded-full').count()
    expect(dotCount).toBe(5)
  })
})

test.describe('Onboarding Wizard - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding-demo')
    await page.evaluate(() => localStorage.clear())
  })

  test('should handle invalid step ID in URL', async ({ page }) => {
    await page.goto('/onboarding-demo?onboarding=invalid-step-id')
    await page.click('text=Start Onboarding')
    
    // Should fallback to step 1
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()
  })

  test('should handle multiple rapid clicks on Next', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Rapidly click Next multiple times
    await page.click('text=Next')
    await page.click('text=Next')
    await page.click('text=Next')
    
    // Should be at step 4 (not skip ahead)
    await expect(page.locator('text=Step 4 of 5')).toBeVisible()
  })

  test('should handle localStorage errors gracefully', async ({ page }) => {
    // Simulate localStorage failure
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available')
        },
      })
    })
    
    await page.goto('/onboarding-demo')
    await page.click('text=Start Onboarding')
    
    // Should still work, starting from step 1
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()
  })
})

test.describe('Onboarding Wizard - Completion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding-demo')
  })

  test('should trigger onComplete callback', async ({ page }) => {
    await page.click('text=Start Onboarding')
    
    // Navigate to last step
    for (let i = 0; i < 4; i++) {
      await page.click('text=Next')
    }
    
    // Click Complete
    await page.click('button:has-text("Complete")')
    
    // Check completion counter is incremented
    await expect(page.locator('text=Onboarding completed 1 time')).toBeVisible()
  })

  test('should allow completing wizard multiple times', async ({ page }) => {
    // Complete first time
    await page.click('text=Start Onboarding')
    for (let i = 0; i < 4; i++) {
      await page.click('text=Next')
    }
    await page.click('button:has-text("Complete")')
    
    // Complete second time
    await page.click('text=Start Onboarding')
    for (let i = 0; i < 4; i++) {
      await page.click('text=Next')
    }
    await page.click('button:has-text("Complete")')
    
    // Check completion counter
    await expect(page.locator('text=Onboarding completed 2 times')).toBeVisible()
  })
})
