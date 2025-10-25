'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/language-context'
import { apiRequest } from '@/lib/api'
import {
  PullRequest,
  PRState,
  ReviewState,
  GitDiff,
  CreateReviewDto,
  CreateCommentDto,
  MergePullRequestDto,
  MergeStrategy,
  MergeStatus,
  ReviewSummary,
} from '@/types/pull-request'
import { ReviewSummaryCard } from '@/components/pull-requests/review-summary-card'

export default function PullRequestDetailPage() {
  const params = useParams()
  const { t } = useLanguage()
  const projectId = params.id as string
  const prNumber = parseInt(params.number as string, 10)

  const [pr, setPr] = useState<PullRequest | null>(null)
  const [diff, setDiff] = useState<GitDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Review state
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewState, setReviewState] = useState<ReviewState>(ReviewState.APPROVED)
  const [reviewBody, setReviewBody] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Comment state
  const [commentBody, setCommentBody] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Merge state
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>(MergeStrategy.MERGE)
  const [merging, setMerging] = useState(false)

  // PR Review Enhancement states
  const [mergeStatus, setMergeStatus] = useState<MergeStatus | null>(null)
  const [loadingMergeStatus, setLoadingMergeStatus] = useState(false)
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null)

  useEffect(() => {
    fetchPR()
    fetchDiff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, prNumber])

  const fetchPR = async () => {
    try {
      setLoading(true)
      const data = await apiRequest<PullRequest>(
        `/pull-requests/project/${projectId}/number/${prNumber}`
      )
      setPr(data)
    } catch (err) {
      console.error('Failed to fetch PR:', err)
      const error = err as Error
      setError(error.message || t.pullRequests.detail.notFound)
    } finally {
      setLoading(false)
    }
  }

  const fetchDiff = async () => {
    try {
      console.log('[fetchDiff] Starting - projectId:', projectId, 'prNumber:', prNumber)
      const prData = await apiRequest<PullRequest>(
        `/pull-requests/project/${projectId}/number/${prNumber}`
      )
      console.log('[fetchDiff] Got PR data:', prData?.id, prData?.sourceBranch, prData?.targetBranch)
      const diffData = await apiRequest<GitDiff>(`/pull-requests/${prData.id}/diff`)
      console.log('[fetchDiff] Got diff data - files:', diffData?.files?.length)
      setDiff(diffData)
    } catch (err) {
      console.error('[fetchDiff] FAILED:', err)
      console.error('[fetchDiff] Error details:', {
        message: (err as Error).message,
        name: (err as Error).name,
        stack: (err as Error).stack
      })
    }
  }

  const fetchMergeStatus = async () => {
    if (!pr) return

    try {
      setLoadingMergeStatus(true)
      const data = await apiRequest<MergeStatus>(
        `/pull-requests/${pr.id}/merge-status`
      )
      setMergeStatus(data)
    } catch (err) {
      console.error('Failed to fetch merge status:', err)
    } finally {
      setLoadingMergeStatus(false)
    }
  }

  const handleReviewSummaryRefresh = () => {
    // This callback is called when ReviewSummaryCard refreshes
    // We should also refresh merge status
    if (pr && pr.state === PRState.OPEN) {
      fetchMergeStatus()
    }
  }

  // Fetch merge status when PR state is OPEN
  useEffect(() => {
    if (pr && pr.state === PRState.OPEN) {
      fetchMergeStatus()
    }
  }, [pr, reviewSummary])

  const handleSubmitReview = async () => {
    if (!pr) return

    try {
      setSubmittingReview(true)
      const dto: CreateReviewDto = {
        state: reviewState,
        body: reviewBody.trim() || undefined,
      }

      await apiRequest(`/pull-requests/${pr.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify(dto),
      })

      setShowReviewDialog(false)
      setReviewBody('')
      fetchPR() // Refresh PR data
    } catch (err) {
      console.error('Failed to submit review:', err)
      alert(t.pullRequests.reviews.createFailed)
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!pr || !commentBody.trim()) return

    try {
      setSubmittingComment(true)
      const dto: CreateCommentDto = {
        body: commentBody.trim(),
      }

      await apiRequest(`/pull-requests/${pr.id}/comments`, {
        method: 'POST',
        body: JSON.stringify(dto),
      })

      setCommentBody('')
      fetchPR() // Refresh PR data
    } catch (err) {
      console.error('Failed to submit comment:', err)
      alert(t.pullRequests.comments.createFailed)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleMerge = async () => {
    if (!pr) return

    try {
      setMerging(true)
      const dto: MergePullRequestDto = {
        strategy: mergeStrategy,
      }

      await apiRequest(`/pull-requests/${pr.id}/merge`, {
        method: 'POST',
        body: JSON.stringify(dto),
      })

      setShowMergeDialog(false)
      fetchPR() // Refresh PR data
    } catch (err) {
      console.error('Failed to merge PR:', err)
      alert(t.pullRequests.detail.mergeFailed)
    } finally {
      setMerging(false)
    }
  }

  const handleClose = async () => {
    if (!pr) return

    try {
      await apiRequest(`/pull-requests/${pr.id}/close`, {
        method: 'POST',
      })
      fetchPR() // Refresh PR data
    } catch (err) {
      console.error('Failed to close PR:', err)
      alert(t.pullRequests.detail.closeFailed)
    }
  }

  const getStateStyle = (state: PRState) => {
    switch (state) {
      case PRState.OPEN:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case PRState.MERGED:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case PRState.CLOSED:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStateText = (state: PRState) => {
    switch (state) {
      case PRState.OPEN:
        return t.pullRequests.state.open
      case PRState.MERGED:
        return t.pullRequests.state.merged
      case PRState.CLOSED:
        return t.pullRequests.state.closed
      default:
        return state
    }
  }

  const getReviewStateIcon = (state: ReviewState) => {
    switch (state) {
      case ReviewState.APPROVED:
        return '✅'
      case ReviewState.CHANGES_REQUESTED:
        return '🔴'
      case ReviewState.COMMENTED:
        return '💬'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">{t.pullRequests.detail.loading}</div>
      </div>
    )
  }

  if (error || !pr) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center text-red-600">{error || t.pullRequests.detail.notFound}</div>
        <div className="text-center mt-4">
          <Link href={`/projects/${projectId}/pulls`} className="text-blue-600 hover:underline">
            {t.pullRequests.detail.goBack}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/pulls`}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          {t.pullRequests.backToPRs}
        </Link>
      </div>

      {/* PR Title and State */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">
              {pr.title} <span className="text-gray-500">#{pr.number}</span>
            </h1>
            <span data-slot="badge" className={`px-3 py-1 rounded text-sm font-medium ${getStateStyle(pr.state)}`}>
              {getStateText(pr.state)}
            </span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            {t.pullRequests.detail.openedBy
              .replace('{author}', pr.author.username)
              .replace('{date}', new Date(pr.createdAt).toLocaleDateString())}
          </div>
          {pr.state === PRState.MERGED && pr.mergedAt && pr.mergedBy && (
            <div className="text-purple-600 dark:text-purple-400 mt-1 font-medium">
              {pr.mergedBy} merged this pull request on {new Date(pr.mergedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Actions */}
        {pr.state === PRState.OPEN && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowReviewDialog(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {t.pullRequests.reviews.addReview}
            </button>

            {/* Enhanced Merge Button with Validation */}
            {loadingMergeStatus ? (
              <button
                disabled
                className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
              >
                {t.pullRequests.mergeStatus?.checking || 'Checking...'}
              </button>
            ) : mergeStatus ? (
              mergeStatus.allowed ? (
                <button
                  onClick={() => setShowMergeDialog(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                >
                  <span>✓</span>
                  <span>{t.pullRequests.detail.mergePR}</span>
                  <span className="text-xs opacity-80">
                    ({mergeStatus.approvalCount}/{mergeStatus.requiredApprovals})
                  </span>
                </button>
              ) : (
                <div className="relative group">
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed flex items-center gap-2"
                  >
                    <span>✗</span>
                    <span>{t.pullRequests.mergeStatus?.cannotMerge || 'Cannot Merge'}</span>
                  </button>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-sm rounded shadow-lg z-10">
                    <div className="font-semibold mb-1">
                      {t.pullRequests.mergeStatus?.mergeBlocked || 'Merge Blocked'}
                    </div>
                    <div className="mb-2">{mergeStatus.reason}</div>

                    {/* Progress Info */}
                    <div className="text-xs border-t border-gray-700 pt-2">
                      <div>
                        {t.pullRequests.detail.commits || 'Approvals'}: {mergeStatus.approvalCount}/{mergeStatus.requiredApprovals}
                      </div>
                      {mergeStatus.hasChangeRequests && (
                        <div className="text-red-300 mt-1">
                          ⚠ {t.pullRequests.mergeStatus?.activeChangeRequests || 'Active change requests'}
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )
            ) : null}

            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {t.pullRequests.detail.closePR}
            </button>
          </div>
        )}
      </div>

      {/* Branch Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <div className="text-sm">
          <span className="font-mono bg-white dark:bg-gray-900 px-2 py-1 rounded">
            {pr.sourceBranch}
          </span>
          <span className="mx-2">→</span>
          <span className="font-mono bg-white dark:bg-gray-900 px-2 py-1 rounded">
            {pr.targetBranch}
          </span>
        </div>
      </div>

      {/* Body */}
      {pr.body && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <div className="prose dark:prose-invert max-w-none">
            {pr.body.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Review Summary Card */}
      {pr.state === PRState.OPEN && (
        <ReviewSummaryCard
          prId={pr.id}
          onRefresh={handleReviewSummaryRefresh}
        />
      )}

      {/* Reviews */}
      {pr.reviews && pr.reviews.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{t.pullRequests.reviews.title}</h2>
          <div className="space-y-4">
            {pr.reviews.map((review) => (
              <div key={review.id} className="border-l-4 border-gray-300 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{getReviewStateIcon(review.state)}</span>
                  <span className="font-semibold">{review.reviewer.username}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.body && <p className="text-gray-700 dark:text-gray-300">{review.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diff */}
      {diff && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{t.pullRequests.diff.title}</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t.pullRequests.diff.filesChanged.replace('{count}', String(diff.summary.totalFiles))}
            {' · '}
            <span className="text-green-600">
              {t.pullRequests.diff.additions.replace('{count}', String(diff.summary.totalAdditions))}
            </span>
            {' '}
            <span className="text-red-600">
              {t.pullRequests.diff.deletions.replace('{count}', String(diff.summary.totalDeletions))}
            </span>
          </div>
          <div className="space-y-4">
            {diff.files.map((file, idx) => (
              <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 font-mono text-sm">
                  {file.path}
                  <span className="ml-2 text-gray-600">
                    ({file.status})
                  </span>
                </div>
                {file.patch && (
                  <pre className="p-4 text-sm overflow-x-auto bg-white dark:bg-gray-900">
                    <code>{file.patch}</code>
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{t.pullRequests.comments.title}</h2>

        {/* Comment List */}
        {pr.comments && pr.comments.length > 0 && (
          <div className="space-y-4 mb-6">
            {pr.comments.map((comment) => (
              <div key={comment.id} className="border-l-4 border-blue-300 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{comment.author.username}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                  {comment.filePath && (
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                      {comment.filePath}:{comment.lineNumber}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 dark:text-gray-300">{comment.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment */}
        {pr.state === PRState.OPEN && (
          <div>
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={t.pullRequests.comments.commentPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[100px]"
              rows={4}
            />
            <div className="mt-2">
              <button
                onClick={handleSubmitComment}
                disabled={submittingComment || !commentBody.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingComment
                  ? t.pullRequests.comments.submitting
                  : t.pullRequests.comments.submitButton}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      {showReviewDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold mb-4">{t.pullRequests.reviews.addReview}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Review State</label>
                <select
                  value={reviewState}
                  onChange={(e) => setReviewState(e.target.value as ReviewState)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value={ReviewState.APPROVED}>{t.pullRequests.reviews.approveLabel}</option>
                  <option value={ReviewState.CHANGES_REQUESTED}>
                    {t.pullRequests.reviews.changesRequestedLabel}
                  </option>
                  <option value={ReviewState.COMMENTED}>{t.pullRequests.reviews.commentLabel}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Comment</label>
                <textarea
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  placeholder={t.pullRequests.reviews.reviewCommentPlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {submittingReview
                  ? t.pullRequests.reviews.submitting
                  : t.pullRequests.reviews.submitButton}
              </button>
              <button
                onClick={() => setShowReviewDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t.pullRequests.reviews.cancelButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Dialog */}
      {showMergeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4" role="dialog" aria-labelledby="merge-dialog-title">
            <h3 id="merge-dialog-title" className="text-xl font-bold mb-4">{t.pullRequests.detail.mergePR}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.pullRequests.mergeStrategy.title}
                </label>
                <select
                  value={mergeStrategy}
                  onChange={(e) => setMergeStrategy(e.target.value as MergeStrategy)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value={MergeStrategy.MERGE}>
                    {t.pullRequests.mergeStrategy.merge} - {t.pullRequests.mergeStrategy.mergeDesc}
                  </option>
                  <option value={MergeStrategy.SQUASH}>
                    {t.pullRequests.mergeStrategy.squash} - {t.pullRequests.mergeStrategy.squashDesc}
                  </option>
                  <option value={MergeStrategy.REBASE}>
                    {t.pullRequests.mergeStrategy.rebase} - {t.pullRequests.mergeStrategy.rebaseDesc}
                  </option>
                </select>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.pullRequests.detail.confirmMerge}
              </p>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleMerge}
                disabled={merging}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {merging ? 'Merging...' : t.pullRequests.detail.mergePR}
              </button>
              <button
                onClick={() => setShowMergeDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
