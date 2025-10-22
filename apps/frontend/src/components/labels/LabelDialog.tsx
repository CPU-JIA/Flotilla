/**
 * LabelDialog Component
 *
 * Create/Edit label dialog with form validation
 *
 * ECP-A1: Single Responsibility - Only handles label CRUD dialog
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
import { ColorPicker } from './ColorPicker'
import { useLanguage } from '@/contexts/language-context'
import type { Label as LabelType } from '@/types/issue'

interface LabelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  label?: LabelType // Required for edit mode
  onSubmit: (data: { name: string; color: string; description?: string }) => Promise<void>
}

export function LabelDialog({ open, onOpenChange, mode, label, onSubmit }: LabelDialogProps) {
  const { t } = useLanguage()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [color, setColor] = useState('#D73A4A')
  const [description, setDescription] = useState('')

  // ECP-C1: Load label data in edit mode
  useEffect(() => {
    if (mode === 'edit' && label) {
      setName(label.name)
      setColor(label.color)
      setDescription(label.description || '')
    } else if (mode === 'create') {
      // Reset form for create mode
      setName('')
      setColor('#D73A4A')
      setDescription('')
    }
  }, [mode, label, open])

  // ECP-C1: Form validation
  const validateForm = (): string | null => {
    if (!name.trim()) {
      return t.validation.fieldRequired
    }
    if (name.length < 2) {
      return t.validation.nameTooShort
    }
    if (name.length > 50) {
      return 'Name must be at most 50 characters'
    }
    if (description.length > 200) {
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
        name: name.trim(),
        color: color.toUpperCase(),
        description: description.trim() || undefined,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Failed to submit label:', err)
      setError(err instanceof Error ? err.message : t.issues.labels.createFailed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t.issues.labels.createNew : t.issues.labels.updateButton}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new label to organize your issues'
              : 'Update label properties'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">{t.issues.labels.name} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.issues.labels.namePlaceholder}
              maxLength={50}
              required
              disabled={submitting}
            />
          </div>

          {/* Color Picker */}
          <ColorPicker value={color} onChange={setColor} disabled={submitting} />

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">{t.issues.labels.description}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.issues.labels.descriptionPlaceholder}
              rows={3}
              maxLength={200}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/200 characters
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
              {t.issues.labels.cancelButton}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? 'Submitting...'
                : mode === 'create'
                  ? t.issues.labels.createButton
                  : t.issues.labels.updateButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
