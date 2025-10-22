/**
 * MilestoneDialog Component
 *
 * Create/Edit milestone dialog with date picker
 *
 * ECP-A1: Single Responsibility - Only handles milestone CRUD dialog
 * ECP-B1: DRY - Single component for both create and edit modes
 * ECP-C1: Defensive Programming - Form validation before submission
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DateInput } from '@mantine/dates'
import { useLanguage } from '@/contexts/language-context'
import type { Milestone } from '@/types/issue'

interface MilestoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  milestone?: Milestone // Required for edit mode
  onSubmit: (data: { title: string; description?: string; dueDate?: string }) => Promise<void>
}

export function MilestoneDialog({
  open,
  onOpenChange,
  mode,
  milestone,
  onSubmit,
}: MilestoneDialogProps) {
  const { t } = useLanguage()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<Date | null>(null)

  // ECP-C1: Load milestone data in edit mode
  useEffect(() => {
    if (mode === 'edit' && milestone) {
      setTitle(milestone.title)
      setDescription(milestone.description || '')
      setDueDate(milestone.dueDate ? new Date(milestone.dueDate) : null)
    } else if (mode === 'create') {
      // Reset form for create mode
      setTitle('')
      setDescription('')
      setDueDate(null)
    }
  }, [mode, milestone, open])

  // ECP-C1: Form validation
  const validateForm = (): string | null => {
    if (!title.trim()) {
      return t.validation.fieldRequired
    }
    if (title.length < 2) {
      return t.validation.nameTooShort
    }
    if (title.length > 100) {
      return 'Title must be at most 100 characters'
    }
    if (description.length > 500) {
      return t.validation.descriptionTooLong
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
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? dueDate.toISOString() : undefined,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Failed to submit milestone:', err)
      setError(err instanceof Error ? err.message : t.issues.milestones.createFailed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t.issues.milestones.createNew : t.issues.milestones.updateButton}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new milestone to track project progress'
              : 'Update milestone properties'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title">{t.issues.milestones.name} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.issues.milestones.namePlaceholder}
              maxLength={100}
              required
              disabled={submitting}
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">{t.issues.milestones.description}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.issues.milestones.descriptionPlaceholder}
              rows={3}
              maxLength={500}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
          </div>

          {/* Due Date Field */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">{t.issues.milestones.dueDate}</Label>
            <DateInput
              value={dueDate}
              onChange={setDueDate}
              placeholder={t.issues.milestones.dueDatePlaceholder}
              clearable
              disabled={submitting}
              valueFormat="YYYY-MM-DD"
            />
            <p className="text-xs text-muted-foreground">
              Optional. Leave empty for no due date.
            </p>
          </div>

          {/* Dialog Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t.issues.milestones.cancelButton}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? 'Submitting...'
                : mode === 'create'
                  ? t.issues.milestones.createButton
                  : t.issues.milestones.updateButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
