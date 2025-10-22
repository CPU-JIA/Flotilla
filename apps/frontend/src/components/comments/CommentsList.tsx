/**
 * CommentsList Component
 *
 * Display list of comments with timeline layout
 *
 * ECP-A1: Single Responsibility - Only handles comment display and management
 * ECP-C1: Defensive Programming - Permission checks for edit/delete
 * ECP-B2: KISS - Simple, clear timeline layout
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MarkdownPreview } from '@/components/markdown/MarkdownPreview'
import { CommentForm } from './CommentForm'
import { useLanguage } from '@/contexts/language-context'
import { useAuth } from '@/contexts/auth-context'
import { Edit, Trash2, User } from 'lucide-react'
import type { IssueComment } from '@/types/issue'

interface CommentsListProps {
  comments: IssueComment[]
  onUpdate: (commentId: string, body: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  loading?: boolean
}

export function CommentsList({ comments, onUpdate, onDelete, loading = false }: CommentsListProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)

  // ECP-B2: Helper to format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return t.issues.comments.justNow
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60)
      return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    }
    if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} ${days === 1 ? 'day' : 'days'} ago`
    }
    // Fallback to absolute date
    return date.toLocaleDateString()
  }

  // ECP-C1: Check if current user can edit/delete comment
  const canManageComment = (comment: IssueComment): boolean => {
    return user?.id === comment.authorId
  }

  const handleUpdate = async (commentId: string, body: string) => {
    await onUpdate(commentId, body)
    setEditingCommentId(null)
  }

  const handleDelete = async (commentId: string) => {
    const confirmed = confirm(t.issues.comments.confirmDelete)
    if (!confirmed) return
    await onDelete(commentId)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">{t.issues.comments.loading}</div>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t.issues.comments.noComments}</p>
        <p className="text-sm mt-1">{t.issues.comments.beFirst}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
          {/* Comment Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Author Avatar */}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {comment.author?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comment.author.avatar}
                    alt={comment.author.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* Author Info */}
              <div>
                <div className="font-semibold">{comment.author?.username || 'Unknown'}</div>
                <div
                  className="text-xs text-muted-foreground"
                  title={new Date(comment.createdAt).toLocaleString()}
                >
                  {formatRelativeTime(comment.createdAt)}
                  {comment.updatedAt !== comment.createdAt && (
                    <span className="ml-1">(edited)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons (only for author) */}
            {canManageComment(comment) && editingCommentId !== comment.id && (
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCommentId(comment.id)}
                  title={t.issues.comments.editButton}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(comment.id)}
                  className="text-destructive hover:text-destructive"
                  title={t.issues.comments.deleteButton}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Comment Body */}
          {editingCommentId === comment.id ? (
            <CommentForm
              mode="edit"
              initialValue={comment.body}
              onSubmit={(body) => handleUpdate(comment.id, body)}
              onCancel={handleCancelEdit}
            />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownPreview content={comment.body} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
