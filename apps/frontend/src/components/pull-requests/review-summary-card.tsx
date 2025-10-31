'use client'

import { useState, useEffect } from 'react'
import { ReviewSummary, ReviewState } from '@/types/pull-request'
import { apiRequest } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'

interface ReviewSummaryCardProps {
  prId: string
  onRefresh?: () => void
}

export function ReviewSummaryCard({ prId, onRefresh }: ReviewSummaryCardProps) {
  const { t } = useLanguage()
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchReviewSummary = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiRequest<ReviewSummary>(
        `/pull-requests/${prId}/review-summary`
      )
      setReviewSummary(data)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to fetch review summary:', err)
      setError((err as Error).message || 'Failed to load review summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviewSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prId])

  const getReviewStateIcon = (state: ReviewState): string => {
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

  const getReviewStateBadgeClass = (state: ReviewState): string => {
    switch (state) {
      case ReviewState.APPROVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case ReviewState.CHANGES_REQUESTED:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case ReviewState.COMMENTED:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <div className="text-center text-gray-500">
          {t.pullRequests?.reviewSummary?.loading || 'Loading review summary...'}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 bg-red-50 dark:bg-red-900/20">
        <div className="text-red-600 dark:text-red-400">
          {t.pullRequests?.reviewSummary?.error || 'Failed to load review summary'}: {error}
        </div>
      </div>
    )
  }

  if (!reviewSummary) {
    return null
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          {t.pullRequests?.reviewSummary?.title || 'Review Summary'}
        </h2>
        <button
          onClick={fetchReviewSummary}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          aria-label="Refresh review summary"
        >
          {t.pullRequests?.reviewSummary?.refresh || 'Refresh'}
        </button>
      </div>

      {/* Aggregated Counts */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
          <span className="text-lg">✅</span>
          <span className="font-semibold">{reviewSummary.approved}</span>
          <span className="text-sm">
            {t.pullRequests?.reviewSummary?.approved || 'Approved'}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          <span className="text-lg">🔴</span>
          <span className="font-semibold">{reviewSummary.changesRequested}</span>
          <span className="text-sm">
            {t.pullRequests?.reviewSummary?.changesRequested || 'Changes Requested'}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
          <span className="text-lg">💬</span>
          <span className="font-semibold">{reviewSummary.commented}</span>
          <span className="text-sm">
            {t.pullRequests?.reviewSummary?.commented || 'Commented'}
          </span>
        </div>
      </div>

      {/* Reviewers List */}
      {reviewSummary.reviewers.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">
            {t.pullRequests?.reviewSummary?.reviewers || 'Reviewers'} ({reviewSummary.totalReviewers})
          </h3>
          <div className="space-y-2">
            {reviewSummary.reviewers.map((reviewer) => (
              <div
                key={reviewer.id}
                className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                {/* Avatar */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reviewer.avatar || '/default-avatar.png'}
                  alt={reviewer.username}
                  className="w-8 h-8 rounded-full"
                />

                {/* Username */}
                <span className="font-medium">{reviewer.username}</span>

                {/* Latest State Badge */}
                <span
                  className={`ml-auto px-2 py-1 text-xs rounded flex items-center gap-1 ${getReviewStateBadgeClass(reviewer.state)}`}
                >
                  <span>{getReviewStateIcon(reviewer.state)}</span>
                  <span>{reviewer.state}</span>
                </span>

                {/* Timestamp */}
                <span className="text-sm text-gray-500">
                  {new Date(reviewer.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No reviewers message */}
      {reviewSummary.reviewers.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          {t.pullRequests?.reviewSummary?.noReviewers || 'No reviews yet'}
        </div>
      )}
    </div>
  )
}
