/**
 * WebhookDialog Component
 *
 * Create/Edit webhook dialog with form validation
 *
 * ECP-A1: Single Responsibility - Only handles webhook CRUD dialog
 * ECP-B1: DRY - Single component for both create and edit modes
 * ECP-C1: Defensive Programming - Form validation before submission
 * ECP-D1: Design for Testability - Accessible form elements with proper labels
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { Webhook, CreateWebhookDto } from '@/types/webhook'
import { WEBHOOK_EVENTS } from '@/types/webhook'

// ECP-C1: Form validation schema using Zod
const webhookSchema = z.object({
  url: z.string()
    .min(1, 'URL is required')
    .url('Must be a valid URL')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must start with http:// or https://'
    ),
  events: z.array(z.string())
    .min(1, 'At least one event must be selected'),
  active: z.boolean().optional(),
})

type WebhookFormData = z.infer<typeof webhookSchema>

interface WebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  webhook?: Webhook
  onSubmit: (data: CreateWebhookDto) => Promise<void>
}

export function WebhookDialog({
  open,
  onOpenChange,
  mode,
  webhook,
  onSubmit,
}: WebhookDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ECP-D1: Auto-focus ref for first input field
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Initialize react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      url: '',
      events: [],
      active: true,
    },
  })

  const selectedEvents = watch('events')

  // ECP-C1: Load webhook data in edit mode and handle auto-focus
  useEffect(() => {
    if (mode === 'edit' && webhook && open) {
      setValue('url', webhook.url)
      setValue('events', webhook.events)
      setValue('active', webhook.active)
      // Auto-focus URL field after dialog animation
      setTimeout(() => urlInputRef.current?.focus(), 150)
    } else if (mode === 'create' && open) {
      reset({
        url: '',
        events: [],
        active: true,
      })
      // Auto-focus URL field after dialog animation
      setTimeout(() => urlInputRef.current?.focus(), 150)
    }
  }, [mode, webhook, open, setValue, reset])

  // ECP-D1: Reset form when dialog closes (cleanup)
  useEffect(() => {
    if (!open) {
      // Reset form state and clear errors when dialog closes
      setTimeout(() => {
        reset()
        setError('')
      }, 200) // Wait for dialog close animation
    }
  }, [open, reset])

  // Handle event checkbox toggle
  const handleEventToggle = (event: string, checked: boolean) => {
    const currentEvents = selectedEvents || []
    if (checked) {
      setValue('events', [...currentEvents, event])
    } else {
      setValue('events', currentEvents.filter((e) => e !== event))
    }
  }

  // Form submission handler
  const onFormSubmit = async (data: WebhookFormData) => {
    setError('')

    try {
      setSubmitting(true)
      await onSubmit({
        url: data.url.trim(),
        events: data.events,
        active: data.active ?? true,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Failed to submit webhook:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save webhook. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ECP-D1: Handle Enter key submission (except in textarea)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      e.target instanceof HTMLInputElement
    ) {
      e.preventDefault()
      handleSubmit(onFormSubmit)()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Webhook' : 'Edit Webhook'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Configure a webhook to receive real-time events from this project'
              : 'Update webhook configuration'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          onKeyDown={handleKeyDown}
          className="space-y-6"
        >
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* URL Field */}
          <div className="space-y-2">
            <Label htmlFor="url">
              Webhook URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="url"
              {...register('url')}
              ref={urlInputRef}
              placeholder="https://api.example.com/webhooks"
              disabled={submitting}
              className={errors.url ? 'border-destructive focus-visible:ring-destructive' : ''}
              aria-invalid={errors.url ? 'true' : 'false'}
              aria-describedby={errors.url ? 'url-error' : undefined}
            />
            {errors.url && (
              <p id="url-error" className="text-sm font-medium text-destructive" role="alert">
                {errors.url.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The endpoint URL that will receive webhook payloads
            </p>
          </div>

          {/* Events Selection */}
          <div className="space-y-3">
            <Label>
              Events <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Select which events will trigger this webhook
            </p>
            <div
              className={`border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto ${
                errors.events ? 'border-destructive' : ''
              }`}
              role="group"
              aria-labelledby="events-label"
              aria-describedby={errors.events ? 'events-error' : undefined}
            >
              {WEBHOOK_EVENTS.map((event) => (
                <div key={event} className="flex items-center space-x-2">
                  <Checkbox
                    id={`event-${event}`}
                    checked={selectedEvents?.includes(event)}
                    onCheckedChange={(checked) =>
                      handleEventToggle(event, checked as boolean)
                    }
                    disabled={submitting}
                  />
                  <label
                    htmlFor={`event-${event}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {event}
                  </label>
                </div>
              ))}
            </div>
            {errors.events && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {errors.events.message}
              </p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={watch('active')}
              onCheckedChange={(checked) => setValue('active', checked as boolean)}
              disabled={submitting}
            />
            <label
              htmlFor="active"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Active (webhook will receive events)
            </label>
          </div>

          {/* Dialog Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create Webhook'
                  : 'Update Webhook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
