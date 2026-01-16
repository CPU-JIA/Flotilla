/**
 * Branch Protection - E2E Tests
 *
 * ECP-D1: Design for Testability - End-to-end test coverage for branch protection
 * Tests rule creation, conditional logic, and deletion confirmation
 */

import { test, expect } from '@playwright/test'

// Mock branch protection data
const testRule = {
  branchPattern: 'main',
  requiredApprovals: 2,
}

const releaseRule = {
  branchPattern: 'release/*',
  requiredApprovals: 3,
}

test.describe('Branch Protection Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to branch protection settings page
    await page.goto('/projects/test-project/settings/branch-protection')
  })

  test.describe('Create Branch Protection Rule', () => {
    test('should create a basic protection rule successfully', async ({ page }) => {
      // Click create rule button
      await page.getByRole('button', { name: /create rule/i }).click()

      // Verify dialog opened
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('Create Branch Protection Rule')).toBeVisible()

      // Verify auto-focus on branch pattern field
      const branchPatternInput = page.getByLabel(/branch pattern/i)
      await expect(branchPatternInput).toBeFocused()

      // Fill branch pattern
      await branchPatternInput.fill(testRule.branchPattern)

      // Verify "Require pull request" is checked by default
      const requirePRCheckbox = page.getByLabel(/require pull request before merging/i)
      await expect(requirePRCheckbox).toBeChecked()

      // Change required approvals
      await page.getByLabel(/required approving reviews/i).click()
      await page.getByRole('option', { name: `${testRule.requiredApprovals} approvals` }).click()

      // Submit form
      await page.getByRole('button', { name: /^create rule$/i }).click()

      // Verify success toast notification
      await expect(page.getByText(/branch protection rule created successfully/i)).toBeVisible({
        timeout: 5000,
      })

      // Verify rule appears in list
      await expect(page.getByText(testRule.branchPattern)).toBeVisible()
    })

    test('should show validation errors for invalid input', async ({ page }) => {
      // Open dialog
      await page.getByRole('button', { name: /create rule/i }).click()

      // Try to submit without filling anything
      await page.getByRole('button', { name: /^create rule$/i }).click()

      // Verify validation error message
      await expect(page.getByText(/branch pattern is required/i)).toBeVisible()

      // Fill empty pattern
      await page.getByLabel(/branch pattern/i).fill('   ')
      await page.getByRole('button', { name: /^create rule$/i }).click()

      // Verify validation error
      await expect(page.getByText(/branch pattern cannot be empty/i)).toBeVisible()
    })

    test('should handle wildcard patterns', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()

      // Fill wildcard pattern
      await page.getByLabel(/branch pattern/i).fill(releaseRule.branchPattern)

      await page.getByRole('button', { name: /^create rule$/i }).click()

      // Verify success
      await expect(page.getByText(/branch protection rule created successfully/i)).toBeVisible({
        timeout: 5000,
      })

      await expect(page.getByText(releaseRule.branchPattern)).toBeVisible()
    })

    test('should submit form on Enter key', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()

      const branchPatternInput = page.getByLabel(/branch pattern/i)
      await branchPatternInput.fill(testRule.branchPattern)

      // Press Enter in branch pattern field
      await branchPatternInput.press('Enter')

      // Verify form submitted
      await expect(page.getByText(/branch protection rule created successfully/i)).toBeVisible({
        timeout: 5000,
      })
    })
  })

  test.describe('Conditional UI Logic', () => {
    test('should show/hide PR review options based on "Require PR" checkbox', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()

      // PR review options should be visible by default
      await expect(page.getByLabel(/required approving reviews/i)).toBeVisible()
      await expect(page.getByLabel(/dismiss stale pull request approvals/i)).toBeVisible()
      await expect(page.getByLabel(/require review from code owners/i)).toBeVisible()

      // Uncheck "Require pull request"
      await page.getByLabel(/require pull request before merging/i).uncheck()

      // PR review options should be hidden
      await expect(page.getByLabel(/required approving reviews/i)).not.toBeVisible()
      await expect(page.getByLabel(/dismiss stale pull request approvals/i)).not.toBeVisible()

      // Check again
      await page.getByLabel(/require pull request before merging/i).check()

      // PR review options should be visible again
      await expect(page.getByLabel(/required approving reviews/i)).toBeVisible()
    })

    test('should show warning when enabling force pushes', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()

      // Initially no warning should be visible
      await expect(
        page.getByText(/allowing force pushes can rewrite commit history/i)
      ).not.toBeVisible()

      // Enable force pushes
      await page.getByLabel(/allow force pushes/i).check()

      // Warning should appear
      await expect(
        page.getByText(/allowing force pushes can rewrite commit history/i)
      ).toBeVisible()

      // Disable force pushes
      await page.getByLabel(/allow force pushes/i).uncheck()

      // Warning should disappear
      await expect(
        page.getByText(/allowing force pushes can rewrite commit history/i)
      ).not.toBeVisible()
    })

    test('should show warning when enabling branch deletion', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()

      // Initially no warning
      await expect(
        page.getByText(/allowing branch deletion can result in permanent data loss/i)
      ).not.toBeVisible()

      // Enable branch deletion
      await page.getByLabel(/allow branch deletion/i).check()

      // Warning should appear
      await expect(
        page.getByText(/allowing branch deletion can result in permanent data loss/i)
      ).toBeVisible()
    })
  })

  test.describe('Edit Branch Protection Rule', () => {
    test.beforeEach(async ({ page }) => {
      // Create a rule first
      await page.getByRole('button', { name: /create rule/i }).click()
      await page.getByLabel(/branch pattern/i).fill(testRule.branchPattern)
      await page.getByRole('button', { name: /^create rule$/i }).click()
      await expect(page.getByText(/branch protection rule created successfully/i)).toBeVisible({
        timeout: 5000,
      })
    })

    test('should edit existing rule', async ({ page }) => {
      // Click edit button for the rule
      const ruleRow = page.locator(`text=${testRule.branchPattern}`).locator('..')
      await ruleRow.getByRole('button', { name: /edit/i }).click()

      // Verify edit dialog opened with existing data
      await expect(page.getByText('Edit Branch Protection Rule')).toBeVisible()
      await expect(page.getByLabel(/branch pattern/i)).toHaveValue(testRule.branchPattern)

      // Update pattern
      await page.getByLabel(/branch pattern/i).fill('main-updated')

      // Change settings
      await page.getByLabel(/dismiss stale pull request approvals/i).check()

      // Submit
      await page.getByRole('button', { name: /update rule/i }).click()

      // Verify success toast
      await expect(page.getByText(/branch protection rule updated successfully/i)).toBeVisible({
        timeout: 5000,
      })

      // Verify updated rule appears in list
      await expect(page.getByText('main-updated')).toBeVisible()
    })

    test('should validate on edit', async ({ page }) => {
      // Click edit
      const ruleRow = page.locator(`text=${testRule.branchPattern}`).locator('..')
      await ruleRow.getByRole('button', { name: /edit/i }).click()

      // Clear branch pattern
      await page.getByLabel(/branch pattern/i).clear()

      // Try to submit
      await page.getByRole('button', { name: /update rule/i }).click()

      // Verify validation error
      await expect(page.getByText(/branch pattern is required/i)).toBeVisible()
    })
  })

  test.describe('Delete Branch Protection Rule', () => {
    test.beforeEach(async ({ page }) => {
      // Create a rule first
      await page.getByRole('button', { name: /create rule/i }).click()
      await page.getByLabel(/branch pattern/i).fill(testRule.branchPattern)
      await page.getByRole('button', { name: /^create rule$/i }).click()
      await expect(page.getByText(/branch protection rule created successfully/i)).toBeVisible({
        timeout: 5000,
      })
    })

    test('should delete rule with confirmation', async ({ page }) => {
      // Click delete button
      const ruleRow = page.locator(`text=${testRule.branchPattern}`).locator('..')
      await ruleRow.getByRole('button', { name: /delete/i }).click()

      // Verify confirmation dialog
      await expect(page.getByText(/are you sure you want to delete this rule/i)).toBeVisible()

      // Confirm deletion
      await page
        .getByRole('button', { name: /delete|confirm/i })
        .last()
        .click()

      // Verify success toast
      await expect(page.getByText(/branch protection rule deleted successfully/i)).toBeVisible({
        timeout: 5000,
      })

      // Verify rule is removed from list
      await expect(page.getByText(testRule.branchPattern)).not.toBeVisible()
    })

    test('should cancel deletion', async ({ page }) => {
      // Click delete button
      const ruleRow = page.locator(`text=${testRule.branchPattern}`).locator('..')
      await ruleRow.getByRole('button', { name: /delete/i }).click()

      // Cancel deletion
      await page.getByRole('button', { name: /cancel/i }).click()

      // Verify rule still exists
      await expect(page.getByText(testRule.branchPattern)).toBeVisible()
    })
  })

  test.describe('Loading State', () => {
    test('should show loading state during submission', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()

      await page.getByLabel(/branch pattern/i).fill(testRule.branchPattern)

      // Click submit
      const submitButton = page.getByRole('button', { name: /^create rule$/i })
      await submitButton.click()

      // Verify loading state
      await expect(submitButton).toBeDisabled()
      await expect(page.getByText(/saving\.\.\./i)).toBeVisible()
    })
  })

  test.describe('Form Reset', () => {
    test('should reset form when dialog closes', async ({ page }) => {
      // Open dialog
      await page.getByRole('button', { name: /create rule/i }).click()

      // Fill some data
      await page.getByLabel(/branch pattern/i).fill('test-branch')
      await page.getByLabel(/allow force pushes/i).check()

      // Close dialog
      await page.getByRole('button', { name: /cancel/i }).click()

      // Reopen dialog
      await page.getByRole('button', { name: /create rule/i }).click()

      // Verify form is reset
      await expect(page.getByLabel(/branch pattern/i)).toHaveValue('')
      await expect(page.getByLabel(/allow force pushes/i)).not.toBeChecked()
    })
  })

  test.describe('Rule List', () => {
    test('should display empty state when no rules exist', async ({ page }) => {
      // Assuming no rules exist
      await expect(page.getByText(/no branch protection rules configured/i)).toBeVisible()
    })

    test('should display multiple rules', async ({ page }) => {
      const rules = [
        { pattern: 'main', approvals: 2 },
        { pattern: 'develop', approvals: 1 },
        { pattern: 'release/*', approvals: 3 },
      ]

      // Create multiple rules
      for (const rule of rules) {
        await page.getByRole('button', { name: /create rule/i }).click()
        await page.getByLabel(/branch pattern/i).fill(rule.pattern)
        await page.getByLabel(/required approving reviews/i).click()
        await page.getByRole('option', { name: `${rule.approvals} approval` }).click()
        await page.getByRole('button', { name: /^create rule$/i }).click()
        await expect(page.getByText(/branch protection rule created successfully/i)).toBeVisible({
          timeout: 5000,
        })
      }

      // Verify all rules are displayed
      for (const rule of rules) {
        await expect(page.getByText(rule.pattern)).toBeVisible()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should display error when API fails', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()
      await page.getByLabel(/branch pattern/i).fill(testRule.branchPattern)

      // Intercept the API request and make it fail
      await page.route('**/api/branch-protection', (route) => {
        route.abort('failed')
      })

      await page.getByRole('button', { name: /^create rule$/i }).click()

      // Verify error message is displayed
      await expect(page.getByText(/failed to save branch protection rule/i)).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab to create rule button
      await page.keyboard.press('Tab')

      // Press Enter to open dialog
      await page.keyboard.press('Enter')

      // Verify dialog opened
      await expect(page.getByRole('dialog')).toBeVisible()

      // Branch pattern field should be auto-focused
      await expect(page.getByLabel(/branch pattern/i)).toBeFocused()

      // Tab through form fields
      await page.keyboard.press('Tab') // To "Require PR" checkbox
      await page.keyboard.press('Space') // Toggle it
    })

    test('should have proper ARIA labels and error attributes', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()

      // Verify ARIA attributes
      const branchPatternInput = page.getByLabel(/branch pattern/i)
      await expect(branchPatternInput).toHaveAttribute('aria-invalid', 'false')

      // Trigger validation error
      await page.getByRole('button', { name: /^create rule$/i }).click()

      // Verify error ARIA attributes
      await expect(branchPatternInput).toHaveAttribute('aria-invalid', 'true')
      await expect(branchPatternInput).toHaveAttribute('aria-describedby', 'branchPattern-error')
    })
  })

  test.describe('Advanced Settings', () => {
    test('should configure status checks requirement', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()

      await page.getByLabel(/branch pattern/i).fill(testRule.branchPattern)

      // Enable status checks
      await page.getByLabel(/require status checks to pass before merging/i).check()

      await page.getByRole('button', { name: /^create rule$/i }).click()

      await expect(page.getByText(/branch protection rule created successfully/i)).toBeVisible({
        timeout: 5000,
      })
    })

    test('should configure code owner review requirement', async ({ page }) => {
      await page.getByRole('button', { name: /create rule/i }).click()

      await page.getByLabel(/branch pattern/i).fill(testRule.branchPattern)

      // Ensure "Require PR" is checked to see code owner option
      const requirePRCheckbox = page.getByLabel(/require pull request before merging/i)
      await expect(requirePRCheckbox).toBeChecked()

      // Enable code owner review
      await page.getByLabel(/require review from code owners/i).check()

      await page.getByRole('button', { name: /^create rule$/i }).click()

      await expect(page.getByText(/branch protection rule created successfully/i)).toBeVisible({
        timeout: 5000,
      })
    })
  })
})
