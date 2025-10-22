'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Issue, IssueComment } from '@/types/issue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarkdownPreview } from '@/components/markdown/MarkdownPreview'
import { CommentsList } from '@/components/comments/CommentsList'
import { CommentForm } from '@/components/comments/CommentForm'
import { ArrowLeft, Lock, Unlock, Trash2, MessageSquare } from 'lucide-react'

export default function IssueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const number = parseInt(params.number as string)

  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [comments, setComments] = useState<IssueComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)

  const loadIssue = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.issues.get(projectId, number)
      setIssue(data)
    } catch (error) {
      console.error('Failed to load issue:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, number])

  const loadComments = useCallback(async () => {
    try {
      setCommentsLoading(true)
      const data = await api.comments.list(projectId, number)
      setComments(data)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setCommentsLoading(false)
    }
  }, [projectId, number])

  useEffect(() => {
    loadIssue()
    loadComments()
  }, [loadIssue, loadComments])

  const handleCreateComment = async (body: string) => {
    const newComment = await api.comments.create(projectId, number, { body })
    setComments([...comments, newComment])
  }

  const handleUpdateComment = async (commentId: string, body: string) => {
    const updatedComment = await api.comments.update(projectId, number, commentId, { body })
    setComments(comments.map((c) => (c.id === commentId ? updatedComment : c)))
  }

  const handleDeleteComment = async (commentId: string) => {
    await api.comments.delete(projectId, number, commentId)
    setComments(comments.filter((c) => c.id !== commentId))
  }

  const handleClose = async () => {
    if (!issue) return
    try {
      setActionLoading(true)
      await api.issues.close(projectId, number)
      await loadIssue()
    } catch (error) {
      console.error('Failed to close issue:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReopen = async () => {
    if (!issue) return
    try {
      setActionLoading(true)
      await api.issues.reopen(projectId, number)
      await loadIssue()
    } catch (error) {
      console.error('Failed to reopen issue:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this issue?')) return
    try {
      setActionLoading(true)
      await api.issues.delete(projectId, number)
      router.push(`/projects/${projectId}/issues`)
    } catch (error) {
      console.error('Failed to delete issue:', error)
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading issue...</div>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Issue not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => router.push(`/projects/${projectId}/issues`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Issues
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">
              #{issue.number} {issue.title}
            </h1>
            {issue.state === 'OPEN' ? (
              <Badge className="bg-green-500">Open</Badge>
            ) : (
              <Badge variant="secondary">Closed</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Opened by {issue.author?.username || 'Unknown'} on{' '}
            {new Date(issue.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="border rounded-lg p-6 mb-6">
        {issue.body ? (
          <MarkdownPreview content={issue.body} />
        ) : (
          <p className="text-muted-foreground italic">No description provided</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {issue.state === 'OPEN' ? (
          <Button
            onClick={handleClose}
            disabled={actionLoading}
            variant="outline"
          >
            <Lock className="mr-2 h-4 w-4" />
            Close Issue
          </Button>
        ) : (
          <Button
            onClick={handleReopen}
            disabled={actionLoading}
            variant="outline"
          >
            <Unlock className="mr-2 h-4 w-4" />
            Reopen Issue
          </Button>
        )}
        <Button
          onClick={handleDelete}
          disabled={actionLoading}
          variant="destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Issue
        </Button>
      </div>

      {/* Metadata */}
      <div className="mt-6 space-y-4">
        {/* Labels */}
        {issue.labelIds && issue.labelIds.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Labels</h3>
            <div className="flex flex-wrap gap-2">
              {issue.labelIds.map((labelId) => (
                <span
                  key={labelId}
                  className="px-3 py-1 rounded-full text-sm font-medium border"
                  style={{
                    backgroundColor: `${labelId}20`,
                    borderColor: labelId,
                    color: labelId,
                  }}
                >
                  Label {labelId.slice(0, 8)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Milestone */}
        {issue.milestone && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Milestone</h3>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{issue.milestone.title}</span>
              {issue.milestone.state === 'OPEN' ? (
                <Badge className="bg-green-500">Open</Badge>
              ) : (
                <Badge variant="secondary">Closed</Badge>
              )}
            </div>
            {issue.milestone.dueDate && (
              <p className="text-sm text-muted-foreground">
                Due: {new Date(issue.milestone.dueDate).toLocaleDateString()}
              </p>
            )}
            {issue.milestone.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {issue.milestone.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="mt-8 border-t pt-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Comments ({comments.length})
        </h2>

        {/* Comments List */}
        <CommentsList
          comments={comments}
          onUpdate={handleUpdateComment}
          onDelete={handleDeleteComment}
          loading={commentsLoading}
        />

        {/* Add Comment Form */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Add a comment</h3>
          <CommentForm onSubmit={handleCreateComment} />
        </div>
      </div>
    </div>
  )
}
