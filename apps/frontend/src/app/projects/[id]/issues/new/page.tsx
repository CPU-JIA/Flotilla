'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor'
import { LabelSelector } from '@/components/labels/LabelSelector'
import { MilestoneSelector } from '@/components/milestones/MilestoneSelector'
import { AssigneesSelector } from '@/components/assignees/AssigneesSelector'
import { ArrowLeft } from 'lucide-react'

export default function NewIssuePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [milestoneId, setMilestoneId] = useState<string | null>(null)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const issue = await api.issues.create(projectId, {
        title: title.trim(),
        body: body.trim() || undefined,
        labelIds: labelIds.length > 0 ? labelIds : undefined,
        milestoneId: milestoneId || undefined,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      })
      router.push(`/projects/${projectId}/issues/${issue.number}`)
    } catch (error) {
      console.error('Failed to create issue:', error)
      setError('Failed to create issue. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <h1 className="text-3xl font-bold mb-6">New Issue</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the issue"
            maxLength={500}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Description</Label>
          <MarkdownEditor
            value={body}
            onChange={setBody}
            placeholder="Detailed description (supports Markdown)"
            rows={10}
          />
          <p className="text-sm text-muted-foreground">
            You can use Markdown formatting
          </p>
        </div>

        {/* Labels Field */}
        <div className="space-y-2">
          <LabelSelector
            projectId={projectId}
            value={labelIds}
            onChange={setLabelIds}
            disabled={submitting}
          />
        </div>

        {/* Milestone Field */}
        <div className="space-y-2">
          <MilestoneSelector
            projectId={projectId}
            value={milestoneId}
            onChange={setMilestoneId}
            disabled={submitting}
          />
        </div>

        {/* Assignees Field */}
        <div className="space-y-2">
          <AssigneesSelector
            projectId={projectId}
            value={assigneeIds}
            onChange={setAssigneeIds}
            disabled={submitting}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Issue'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
