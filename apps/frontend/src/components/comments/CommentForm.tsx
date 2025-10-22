/**
 * CommentForm Component
 *
 * Form for adding/editing comments with Markdown support
 *
 * ECP-A1: Single Responsibility - Only handles comment input form
 * ECP-B1: DRY - Reusable for both add and edit modes
 * ECP-C1: Defensive Programming - Form validation before submission
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor'
import { useLanguage } from '@/contexts/language-context'

interface CommentFormProps {
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
  initialValue?: string
  mode?: 'create' | 'edit'
  disabled?: boolean
}

export function CommentForm({
  onSubmit,
  onCancel,
  initialValue = '',
  mode = 'create',
  disabled = false,
}: CommentFormProps) {
  const { t } = useLanguage()
  const [body, setBody] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ECP-C1: Update body when initialValue changes (for edit mode)
  useEffect(() => {
    setBody(initialValue)
  }, [initialValue])

  // ECP-C1: Form validation
  const validateForm = (): string | null => {
    if (!body.trim()) {
      return t.issues.comments.emptyComment
    }
    if (body.length > 10000) {
      return 'Comment must be at most 10000 characters'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSubmitting(true)
      await onSubmit(body.trim())
      // Clear form after successful submission (create mode only)
      if (mode === 'create') {
        setBody('')
      }
    } catch (err: unknown) {
      console.error('Failed to submit comment:', err)
      setError(err instanceof Error ? err.message : t.issues.comments.createFailed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Markdown Editor */}
      <MarkdownEditor
        value={body}
        onChange={setBody}
        placeholder={t.issues.comments.commentPlaceholder}
        rows={mode === 'create' ? 6 : 8}
        disabled={disabled || submitting}
      />

      {/* Character Counter */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{body.length}/10000 characters</span>
        {mode === 'create' && (
          <span className="text-muted-foreground">{t.issues.comments.supportsMarkdown}</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button type="submit" disabled={disabled || submitting || !body.trim()}>
          {submitting
            ? t.issues.comments.submitting
            : mode === 'create'
              ? t.issues.comments.submitButton
              : t.issues.comments.updateButton}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={disabled || submitting}
          >
            {t.issues.comments.cancelButton}
          </Button>
        )}
      </div>
    </form>
  )
}
