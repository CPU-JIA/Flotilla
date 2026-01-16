/**
 * BranchProtectionDialog Component
 *
 * Create/Edit branch protection rule dialog with form validation
 *
 * ECP-A1: Single Responsibility - Only handles branch protection CRUD dialog
 * ECP-B1: DRY - Single component for both create and edit modes
 * ECP-C1: Defensive Programming - Form validation before submission
 * ECP-D1: Design for Testability - Accessible form elements with proper labels
 */

'use client'

import { logger } from '@/lib/logger'
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
import { AlertCircle, Info, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BranchProtectionRule {
  id: string
  branchPattern: string
  requirePullRequest: boolean
  requiredApprovingReviews: number
  dismissStaleReviews: boolean
  requireCodeOwnerReview: boolean
  allowForcePushes: boolean
  allowDeletions: boolean
  requireStatusChecks: boolean
  requiredStatusChecks: string[]
  createdAt: string
}

// ECP-C1: Form validation schema using Zod
const branchProtectionSchema = z.object({
  branchPattern: z
    .string()
    .min(1, 'Branch pattern is required')
    .max(100, 'Branch pattern must be at most 100 characters')
    .refine((pattern) => pattern.trim().length > 0, 'Branch pattern cannot be empty'),
  requirePullRequest: z.boolean(),
  requiredApprovingReviews: z.number().min(0).max(10),
  dismissStaleReviews: z.boolean(),
  requireCodeOwnerReview: z.boolean(),
  allowForcePushes: z.boolean(),
  allowDeletions: z.boolean(),
  requireStatusChecks: z.boolean(),
  requiredStatusChecks: z.array(z.string()).optional(),
})

type BranchProtectionFormData = z.infer<typeof branchProtectionSchema>

export interface BranchProtectionRuleInput {
  branchPattern: string
  requirePullRequest?: boolean
  requiredApprovingReviews?: number
  dismissStaleReviews?: boolean
  requireCodeOwnerReview?: boolean
  allowForcePushes?: boolean
  allowDeletions?: boolean
  requireStatusChecks?: boolean
  requiredStatusChecks?: string[]
}

interface BranchProtectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  rule?: BranchProtectionRule
  onSubmit: (data: BranchProtectionRuleInput) => Promise<void>
}

export function BranchProtectionDialog({
  open,
  onOpenChange,
  mode,
  rule,
  onSubmit,
}: BranchProtectionDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ECP-D1: Auto-focus ref for first input field
  const branchPatternInputRef = useRef<HTMLInputElement>(null)

  // Initialize react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<BranchProtectionFormData>({
    resolver: zodResolver(branchProtectionSchema),
    defaultValues: {
      branchPattern: '',
      requirePullRequest: true,
      requiredApprovingReviews: 1,
      dismissStaleReviews: false,
      requireCodeOwnerReview: false,
      allowForcePushes: false,
      allowDeletions: false,
      requireStatusChecks: false,
      requiredStatusChecks: [],
    },
  })

  const requirePullRequest = watch('requirePullRequest')
  const allowForcePushes = watch('allowForcePushes')
  const allowDeletions = watch('allowDeletions')

  // ECP-C1: Load rule data in edit mode and handle auto-focus
  useEffect(() => {
    if (mode === 'edit' && rule && open) {
      setValue('branchPattern', rule.branchPattern)
      setValue('requirePullRequest', rule.requirePullRequest)
      setValue('requiredApprovingReviews', rule.requiredApprovingReviews)
      setValue('dismissStaleReviews', rule.dismissStaleReviews)
      setValue('requireCodeOwnerReview', rule.requireCodeOwnerReview)
      setValue('allowForcePushes', rule.allowForcePushes)
      setValue('allowDeletions', rule.allowDeletions)
      setValue('requireStatusChecks', rule.requireStatusChecks)
      setValue('requiredStatusChecks', rule.requiredStatusChecks || [])
      // Auto-focus branch pattern field after dialog animation
      setTimeout(() => branchPatternInputRef.current?.focus(), 150)
    } else if (mode === 'create' && open) {
      reset({
        branchPattern: '',
        requirePullRequest: true,
        requiredApprovingReviews: 1,
        dismissStaleReviews: false,
        requireCodeOwnerReview: false,
        allowForcePushes: false,
        allowDeletions: false,
        requireStatusChecks: false,
        requiredStatusChecks: [],
      })
      // Auto-focus branch pattern field after dialog animation
      setTimeout(() => branchPatternInputRef.current?.focus(), 150)
    }
  }, [mode, rule, open, setValue, reset])

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

  // Form submission handler
  const onFormSubmit = async (data: BranchProtectionFormData) => {
    setError('')

    try {
      setSubmitting(true)
      await onSubmit({
        branchPattern: data.branchPattern.trim(),
        requirePullRequest: data.requirePullRequest,
        requiredApprovingReviews: data.requiredApprovingReviews,
        dismissStaleReviews: data.dismissStaleReviews,
        requireCodeOwnerReview: data.requireCodeOwnerReview,
        allowForcePushes: data.allowForcePushes,
        allowDeletions: data.allowDeletions,
        requireStatusChecks: data.requireStatusChecks,
        requiredStatusChecks: data.requiredStatusChecks,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      logger.error('Failed to submit branch protection rule:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save branch protection rule. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ECP-D1: Handle Enter key submission (except in textarea/select)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault()
      handleSubmit(onFormSubmit)()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Branch Protection Rule' : 'Edit Branch Protection Rule'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Configure protection settings for a branch pattern'
              : 'Update branch protection rule settings'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Branch Pattern Field */}
          <div className="space-y-2">
            <Label htmlFor="branchPattern">
              Branch Pattern <span className="text-destructive">*</span>
            </Label>
            <Input
              id="branchPattern"
              {...register('branchPattern')}
              ref={branchPatternInputRef}
              placeholder="main"
              disabled={submitting}
              className={
                errors.branchPattern ? 'border-destructive focus-visible:ring-destructive' : ''
              }
              aria-invalid={errors.branchPattern ? 'true' : 'false'}
              aria-describedby={errors.branchPattern ? 'branchPattern-error' : undefined}
            />
            {errors.branchPattern && (
              <p
                id="branchPattern-error"
                className="text-sm font-medium text-destructive"
                role="alert"
              >
                {errors.branchPattern.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Branch name or pattern to protect (e.g., main, release/*, feature/*)
            </p>
          </div>

          {/* Pull Request Settings */}
          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="font-medium">Pull Request Settings</h4>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requirePullRequest"
                checked={requirePullRequest}
                onCheckedChange={(checked) => setValue('requirePullRequest', checked as boolean)}
                disabled={submitting}
              />
              <label
                htmlFor="requirePullRequest"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Require pull request before merging
              </label>
            </div>

            {requirePullRequest && (
              <div className="ml-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="requiredApprovingReviews">Required Approving Reviews</Label>
                  <Select
                    value={watch('requiredApprovingReviews').toString()}
                    onValueChange={(value) => setValue('requiredApprovingReviews', parseInt(value))}
                    disabled={submitting}
                  >
                    <SelectTrigger id="requiredApprovingReviews">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'approval' : 'approvals'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dismissStaleReviews"
                    checked={watch('dismissStaleReviews')}
                    onCheckedChange={(checked) =>
                      setValue('dismissStaleReviews', checked as boolean)
                    }
                    disabled={submitting}
                  />
                  <label
                    htmlFor="dismissStaleReviews"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Dismiss stale pull request approvals when new commits are pushed
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireCodeOwnerReview"
                    checked={watch('requireCodeOwnerReview')}
                    onCheckedChange={(checked) =>
                      setValue('requireCodeOwnerReview', checked as boolean)
                    }
                    disabled={submitting}
                  />
                  <label
                    htmlFor="requireCodeOwnerReview"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Require review from code owners
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Status Checks */}
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireStatusChecks"
                checked={watch('requireStatusChecks')}
                onCheckedChange={(checked) => setValue('requireStatusChecks', checked as boolean)}
                disabled={submitting}
              />
              <label
                htmlFor="requireStatusChecks"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Require status checks to pass before merging
              </label>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="font-medium">Advanced Settings</h4>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowForcePushes"
                checked={allowForcePushes}
                onCheckedChange={(checked) => setValue('allowForcePushes', checked as boolean)}
                disabled={submitting}
              />
              <label
                htmlFor="allowForcePushes"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Allow force pushes
              </label>
            </div>
            {allowForcePushes && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Warning: Allowing force pushes can rewrite commit history and cause issues for
                  collaborators.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowDeletions"
                checked={allowDeletions}
                onCheckedChange={(checked) => setValue('allowDeletions', checked as boolean)}
                disabled={submitting}
              />
              <label
                htmlFor="allowDeletions"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Allow branch deletion
              </label>
            </div>
            {allowDeletions && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Warning: Allowing branch deletion can result in permanent data loss.
                </AlertDescription>
              </Alert>
            )}
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
              {submitting ? 'Saving...' : mode === 'create' ? 'Create Rule' : 'Update Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
