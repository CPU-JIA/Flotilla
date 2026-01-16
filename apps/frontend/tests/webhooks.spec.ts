/**
 * Webhook Management - E2E Tests
 *
 * ECP-D1: Design for Testability - End-to-end test coverage for webhook management
 * Tests complete CRUD flow, form validation, and user interactions
 */

import { test, expect } from '@playwright/test'

// Mock webhook data
const testWebhook = {
  url: 'https://example.com/webhook-test',
  events: ['push', 'pull_request.opened'],
}

const updatedWebhook = {
  url: 'https://updated.com/webhook',
  events: ['issue.opened', 'pull_request.merged'],
}

test.describe('Webhook Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to webhooks settings page
    // Note: This assumes authentication is handled via fixtures or beforeAll
    await page.goto('/projects/test-project/settings/webhooks')
  })

  test.describe('Create Webhook', () => {
    test('should create a new webhook successfully', async ({ page }) => {
      // Click create webhook button
      await page.getByRole('button', { name: /create webhook/i }).click()

      // Verify dialog opened
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('Create Webhook')).toBeVisible()

      // Verify auto-focus on URL field
      const urlInput = page.getByLabel(/webhook url/i)
      await expect(urlInput).toBeFocused()

      // Fill webhook URL
      await urlInput.fill(testWebhook.url)

      // Select events
      await page.getByLabel(/^push$/i).check()
      await page.getByLabel(/pull_request\.opened/i).check()

      // Ensure active is checked (should be by default)
      const activeCheckbox = page.getByLabel(/active \(webhook will receive events\)/i)
      await expect(activeCheckbox).toBeChecked()

      // Submit form
      await page.getByRole('button', { name: /^create webhook$/i }).click()

      // Verify success toast notification
      await expect(page.getByText(/webhook created successfully/i)).toBeVisible({ timeout: 5000 })

      // Verify webhook appears in list
      await expect(page.getByText(testWebhook.url)).toBeVisible()
    })

    test('should show validation errors for invalid input', async ({ page }) => {
      // Open dialog
      await page.getByRole('button', { name: /create webhook/i }).click()

      // Try to submit without filling anything
      await page.getByRole('button', { name: /^create webhook$/i }).click()

      // Verify validation error messages
      await expect(page.getByText(/url is required/i)).toBeVisible()
      await expect(page.getByText(/at least one event must be selected/i)).toBeVisible()

      // Fill invalid URL
      await page.getByLabel(/webhook url/i).fill('invalid-url')
      await page.getByRole('button', { name: /^create webhook$/i }).click()

      // Verify URL validation error
      await expect(page.getByText(/must be a valid url/i)).toBeVisible()

      // Fill URL without http/https
      await page.getByLabel(/webhook url/i).fill('ftp://example.com')
      await page.getByRole('button', { name: /^create webhook$/i }).click()

      // Verify protocol validation error
      await expect(page.getByText(/url must start with http:\/\/ or https:\/\//i)).toBeVisible()
    })

    test('should submit form on Enter key', async ({ page }) => {
      // Open dialog
      await page.getByRole('button', { name: /create webhook/i }).click()

      // Fill valid data
      const urlInput = page.getByLabel(/webhook url/i)
      await urlInput.fill(testWebhook.url)

      await page.getByLabel(/^push$/i).check()

      // Press Enter in URL field
      await urlInput.press('Enter')

      // Verify form submitted
      await expect(page.getByText(/webhook created successfully/i)).toBeVisible({ timeout: 5000 })
    })

    test('should show loading state during submission', async ({ page }) => {
      // Open dialog
      await page.getByRole('button', { name: /create webhook/i }).click()

      // Fill form
      await page.getByLabel(/webhook url/i).fill(testWebhook.url)
      await page.getByLabel(/^push$/i).check()

      // Click submit
      const submitButton = page.getByRole('button', { name: /^create webhook$/i })
      await submitButton.click()

      // Verify loading state (button should be disabled and show loading text)
      await expect(submitButton).toBeDisabled()
      await expect(page.getByText(/saving\.\.\./i)).toBeVisible()
    })

    test('should close dialog on cancel', async ({ page }) => {
      // Open dialog
      await page.getByRole('button', { name: /create webhook/i }).click()

      // Verify dialog is open
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).click()

      // Verify dialog is closed
      await expect(dialog).not.toBeVisible()
    })

    test('should reset form when dialog is reopened', async ({ page }) => {
      // Open dialog
      await page.getByRole('button', { name: /create webhook/i }).click()

      // Fill some data
      await page.getByLabel(/webhook url/i).fill('https://example.com')
      await page.getByLabel(/^push$/i).check()

      // Close dialog
      await page.getByRole('button', { name: /cancel/i }).click()

      // Reopen dialog
      await page.getByRole('button', { name: /create webhook/i }).click()

      // Verify form is reset
      await expect(page.getByLabel(/webhook url/i)).toHaveValue('')
      await expect(page.getByLabel(/^push$/i)).not.toBeChecked()
    })
  })

  test.describe('Edit Webhook', () => {
    test.beforeEach(async ({ page }) => {
      // Create a webhook first
      await page.getByRole('button', { name: /create webhook/i }).click()
      await page.getByLabel(/webhook url/i).fill(testWebhook.url)
      await page.getByLabel(/^push$/i).check()
      await page.getByRole('button', { name: /^create webhook$/i }).click()
      await expect(page.getByText(/webhook created successfully/i)).toBeVisible({ timeout: 5000 })
    })

    test('should edit existing webhook', async ({ page }) => {
      // Click edit button for the webhook
      const webhookRow = page.locator(`text=${testWebhook.url}`).locator('..')
      await webhookRow.getByRole('button', { name: /edit/i }).click()

      // Verify edit dialog opened with existing data
      await expect(page.getByText('Edit Webhook')).toBeVisible()
      await expect(page.getByLabel(/webhook url/i)).toHaveValue(testWebhook.url)
      await expect(page.getByLabel(/^push$/i)).toBeChecked()

      // Update URL
      await page.getByLabel(/webhook url/i).fill(updatedWebhook.url)

      // Change events
      await page.getByLabel(/^push$/i).uncheck()
      await page.getByLabel(/issue\.opened/i).check()

      // Submit
      await page.getByRole('button', { name: /update webhook/i }).click()

      // Verify success toast
      await expect(page.getByText(/webhook updated successfully/i)).toBeVisible({ timeout: 5000 })

      // Verify updated webhook appears in list
      await expect(page.getByText(updatedWebhook.url)).toBeVisible()
    })

    test('should validate on edit', async ({ page }) => {
      // Click edit
      const webhookRow = page.locator(`text=${testWebhook.url}`).locator('..')
      await webhookRow.getByRole('button', { name: /edit/i }).click()

      // Clear URL
      await page.getByLabel(/webhook url/i).clear()

      // Try to submit
      await page.getByRole('button', { name: /update webhook/i }).click()

      // Verify validation error
      await expect(page.getByText(/url is required/i)).toBeVisible()
    })
  })

  test.describe('Delete Webhook', () => {
    test.beforeEach(async ({ page }) => {
      // Create a webhook first
      await page.getByRole('button', { name: /create webhook/i }).click()
      await page.getByLabel(/webhook url/i).fill(testWebhook.url)
      await page.getByLabel(/^push$/i).check()
      await page.getByRole('button', { name: /^create webhook$/i }).click()
      await expect(page.getByText(/webhook created successfully/i)).toBeVisible({ timeout: 5000 })
    })

    test('should delete webhook with confirmation', async ({ page }) => {
      // Click delete button
      const webhookRow = page.locator(`text=${testWebhook.url}`).locator('..')
      await webhookRow.getByRole('button', { name: /delete/i }).click()

      // Verify confirmation dialog
      await expect(page.getByText(/are you sure you want to delete this webhook/i)).toBeVisible()

      // Confirm deletion
      await page
        .getByRole('button', { name: /delete|confirm/i })
        .last()
        .click()

      // Verify success toast
      await expect(page.getByText(/webhook deleted successfully/i)).toBeVisible({ timeout: 5000 })

      // Verify webhook is removed from list
      await expect(page.getByText(testWebhook.url)).not.toBeVisible()
    })

    test('should cancel deletion', async ({ page }) => {
      // Click delete button
      const webhookRow = page.locator(`text=${testWebhook.url}`).locator('..')
      await webhookRow.getByRole('button', { name: /delete/i }).click()

      // Cancel deletion
      await page.getByRole('button', { name: /cancel/i }).click()

      // Verify webhook still exists
      await expect(page.getByText(testWebhook.url)).toBeVisible()
    })
  })

  test.describe('Webhook List', () => {
    test('should display empty state when no webhooks exist', async ({ page }) => {
      // Assuming no webhooks exist
      await expect(page.getByText(/no webhooks configured/i)).toBeVisible()
    })

    test('should display webhook list', async ({ page }) => {
      // Create multiple webhooks
      const webhooks = [
        {
          url: 'https://webhook1.com',
          event: 'push',
        },
        {
          url: 'https://webhook2.com',
          event: 'pull_request.opened',
        },
      ]

      for (const webhook of webhooks) {
        await page.getByRole('button', { name: /create webhook/i }).click()
        await page.getByLabel(/webhook url/i).fill(webhook.url)
        await page.getByLabel(new RegExp(`^${webhook.event}$`, 'i')).check()
        await page.getByRole('button', { name: /^create webhook$/i }).click()
        await expect(page.getByText(/webhook created successfully/i)).toBeVisible({ timeout: 5000 })
      }

      // Verify all webhooks are displayed
      for (const webhook of webhooks) {
        await expect(page.getByText(webhook.url)).toBeVisible()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should display error when API fails', async ({ page }) => {
      // Mock API failure (this would require setting up request interception)
      // For demonstration, we'll test the error display

      await page.getByRole('button', { name: /create webhook/i }).click()
      await page.getByLabel(/webhook url/i).fill(testWebhook.url)
      await page.getByLabel(/^push$/i).check()

      // Intercept the API request and make it fail
      await page.route('**/api/webhooks', (route) => {
        route.abort('failed')
      })

      await page.getByRole('button', { name: /^create webhook$/i }).click()

      // Verify error message is displayed
      await expect(page.getByText(/failed to save webhook/i)).toBeVisible()
    })

    test('should handle network timeout', async ({ page }) => {
      await page.getByRole('button', { name: /create webhook/i }).click()
      await page.getByLabel(/webhook url/i).fill(testWebhook.url)
      await page.getByLabel(/^push$/i).check()

      // Simulate network timeout
      await page.route('**/api/webhooks', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 60000)) // Never resolves
      })

      await page.getByRole('button', { name: /^create webhook$/i }).click()

      // Verify timeout error (depends on implementation)
      // This is a placeholder - actual implementation may vary
      await expect(page.getByText(/request timeout|took too long/i)).toBeVisible({ timeout: 70000 })
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab to create webhook button
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Press Enter to open dialog
      await page.keyboard.press('Enter')

      // Verify dialog opened
      await expect(page.getByRole('dialog')).toBeVisible()

      // URL field should be auto-focused
      await expect(page.getByLabel(/webhook url/i)).toBeFocused()

      // Tab through form fields
      await page.keyboard.press('Tab') // To first checkbox
      await page.keyboard.press('Space') // Check it

      // Continue tabbing and submit
      await page.keyboard.press('Tab')
      // ... continue keyboard navigation
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.getByRole('button', { name: /create webhook/i }).click()

      // Verify ARIA attributes
      const urlInput = page.getByLabel(/webhook url/i)
      await expect(urlInput).toHaveAttribute('aria-invalid', 'false')

      // Trigger validation error
      await page.getByRole('button', { name: /^create webhook$/i }).click()

      // Verify error ARIA attributes
      await expect(urlInput).toHaveAttribute('aria-invalid', 'true')
      await expect(urlInput).toHaveAttribute('aria-describedby', 'url-error')
    })
  })
})
