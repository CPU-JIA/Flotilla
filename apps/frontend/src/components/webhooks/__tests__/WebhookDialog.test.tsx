/**
 * WebhookDialog Component - Unit Tests
 *
 * ECP-D1: Design for Testability - Comprehensive test coverage for webhook dialog
 * Tests form validation, create/edit modes, submission, and error handling
 *
 * @jest-environment jsdom
 */

import { render, screen, waitFor, within as _within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WebhookDialog } from '../WebhookDialog'
import type { Webhook } from '@/types/webhook'

// Mock webhook data
const mockWebhook: Webhook = {
  id: 'webhook-1',
  projectId: 'project-1',
  url: 'https://example.com/webhook',
  events: ['push', 'pull_request.opened'],
  active: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('WebhookDialog', () => {
  const mockOnOpenChange = jest.fn()
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Create Mode', () => {
    it('should render create dialog with empty form', () => {
      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByText('Create Webhook')).toBeInTheDocument()
      expect(screen.getByLabelText(/webhook url/i)).toHaveValue('')
    })

    it('should auto-focus URL input when opened', async () => {
      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      await waitFor(() => {
        const urlInput = screen.getByLabelText(/webhook url/i)
        expect(urlInput).toHaveFocus()
      }, { timeout: 300 })
    })

    it('should validate required URL field', async () => {
      const user = userEvent.setup()
      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const submitButton = screen.getByRole('button', { name: /create webhook/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/url is required/i)).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should validate URL format', async () => {
      const user = userEvent.setup()
      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.type(urlInput, 'invalid-url')

      const submitButton = screen.getByRole('button', { name: /create webhook/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/must be a valid url/i)).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should require http/https protocol', async () => {
      const user = userEvent.setup()
      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.type(urlInput, 'ftp://example.com')

      const submitButton = screen.getByRole('button', { name: /create webhook/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/url must start with http:\/\/ or https:\/\//i)
        ).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should require at least one event to be selected', async () => {
      const user = userEvent.setup()
      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.type(urlInput, 'https://example.com/webhook')

      const submitButton = screen.getByRole('button', { name: /create webhook/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/at least one event must be selected/i)
        ).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should submit valid webhook data', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      // Fill URL
      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.type(urlInput, 'https://example.com/webhook')

      // Select events
      const pushCheckbox = screen.getByLabelText(/^push$/i)
      await user.click(pushCheckbox)

      const prCheckbox = screen.getByLabelText(/pull_request\.opened/i)
      await user.click(prCheckbox)

      // Submit
      const submitButton = screen.getByRole('button', { name: /create webhook/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          url: 'https://example.com/webhook',
          events: ['push', 'pull_request.opened'],
          active: true,
        })
      })

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should toggle active checkbox', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const activeCheckbox = screen.getByLabelText(/active \(webhook will receive events\)/i)
      expect(activeCheckbox).toBeChecked()

      await user.click(activeCheckbox)
      expect(activeCheckbox).not.toBeChecked()
    })

    it('should handle submission errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Network error occurred'
      mockOnSubmit.mockRejectedValue(new Error(errorMessage))

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      // Fill form
      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.type(urlInput, 'https://example.com/webhook')

      const pushCheckbox = screen.getByLabelText(/^push$/i)
      await user.click(pushCheckbox)

      // Submit
      const submitButton = screen.getByRole('button', { name: /create webhook/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })

      expect(mockOnOpenChange).not.toHaveBeenCalled()
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolveSubmit: () => void
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve
      })
      mockOnSubmit.mockReturnValue(submitPromise)

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      // Fill form
      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.type(urlInput, 'https://example.com/webhook')

      const pushCheckbox = screen.getByLabelText(/^push$/i)
      await user.click(pushCheckbox)

      // Submit
      const submitButton = screen.getByRole('button', { name: /create webhook/i })
      await user.click(submitButton)

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
        expect(urlInput).toBeDisabled()
      })

      // Resolve submission
      resolveSubmit!()

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('Edit Mode', () => {
    it('should render edit dialog with webhook data', () => {
      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          webhook={mockWebhook}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByText('Edit Webhook')).toBeInTheDocument()
      expect(screen.getByLabelText(/webhook url/i)).toHaveValue(mockWebhook.url)

      // Check selected events
      const pushCheckbox = screen.getByLabelText(/^push$/i)
      expect(pushCheckbox).toBeChecked()

      const prCheckbox = screen.getByLabelText(/pull_request\.opened/i)
      expect(prCheckbox).toBeChecked()
    })

    it('should update webhook data', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          webhook={mockWebhook}
          onSubmit={mockOnSubmit}
        />
      )

      // Change URL
      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.clear(urlInput)
      await user.type(urlInput, 'https://updated.com/webhook')

      // Change events
      const issueCheckbox = screen.getByLabelText(/issue\.opened/i)
      await user.click(issueCheckbox)

      // Submit
      const submitButton = screen.getByRole('button', { name: /update webhook/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          url: 'https://updated.com/webhook',
          events: expect.arrayContaining(['push', 'pull_request.opened', 'issue.opened']),
          active: true,
        })
      })
    })

    it('should deselect events', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="edit"
          webhook={mockWebhook}
          onSubmit={mockOnSubmit}
        />
      )

      // Deselect push event
      const pushCheckbox = screen.getByLabelText(/^push$/i)
      await user.click(pushCheckbox)

      // Add new event
      const issueCheckbox = screen.getByLabelText(/issue\.opened/i)
      await user.click(issueCheckbox)

      // Submit
      const submitButton = screen.getByRole('button', { name: /update webhook/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            events: ['pull_request.opened', 'issue.opened'],
          })
        )
      })
    })
  })

  describe('Form Reset', () => {
    it('should reset form when dialog closes', async () => {
      const { rerender } = render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const user = userEvent.setup()

      // Fill some data
      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.type(urlInput, 'https://example.com/webhook')

      // Close dialog
      rerender(
        <WebhookDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      // Wait for reset animation
      await waitFor(() => {
        // Form should be reset after closing
      }, { timeout: 300 })

      // Reopen dialog
      rerender(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      // Form should be empty
      await waitFor(() => {
        expect(screen.getByLabelText(/webhook url/i)).toHaveValue('')
      })
    })
  })

  describe('Keyboard Interaction', () => {
    it('should submit form on Enter key in input field', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      // Fill valid data
      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.type(urlInput, 'https://example.com/webhook')

      const pushCheckbox = screen.getByLabelText(/^push$/i)
      await user.click(pushCheckbox)

      // Press Enter in URL field
      await user.type(urlInput, '{Enter}')

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for URL field', () => {
      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const urlInput = screen.getByLabelText(/webhook url/i)
      expect(urlInput).toHaveAttribute('aria-invalid', 'false')
    })

    it('should show ARIA error attributes when validation fails', async () => {
      const user = userEvent.setup()

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const submitButton = screen.getByRole('button', { name: /create webhook/i })
      await user.click(submitButton)

      await waitFor(() => {
        const urlInput = screen.getByLabelText(/webhook url/i)
        expect(urlInput).toHaveAttribute('aria-invalid', 'true')
        expect(urlInput).toHaveAttribute('aria-describedby', 'url-error')
      })
    })

    it('should have proper role for events group', () => {
      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const eventsGroup = screen.getByRole('group')
      expect(eventsGroup).toBeInTheDocument()
    })
  })

  describe('Cancel Button', () => {
    it('should close dialog on cancel', async () => {
      const user = userEvent.setup()

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should disable cancel button during submission', async () => {
      const user = userEvent.setup()
      let resolveSubmit: () => void
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve
      })
      mockOnSubmit.mockReturnValue(submitPromise)

      render(
        <WebhookDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
          onSubmit={mockOnSubmit}
        />
      )

      // Fill form
      const urlInput = screen.getByLabelText(/webhook url/i)
      await user.type(urlInput, 'https://example.com/webhook')

      const pushCheckbox = screen.getByLabelText(/^push$/i)
      await user.click(pushCheckbox)

      // Submit
      const submitButton = screen.getByRole('button', { name: /create webhook/i })
      await user.click(submitButton)

      // Check cancel button is disabled
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        expect(cancelButton).toBeDisabled()
      })

      // Resolve submission
      resolveSubmit!()
    })
  })
})
