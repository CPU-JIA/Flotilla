'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PullRequest, PRState } from '@/types/pull-request'
import { useLanguage } from '@/contexts/language-context'
import { apiRequest } from '@/lib/api'

export default function PullRequestsPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const projectId = params.id as string

  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [stateFilter, setStateFilter] = useState<PRState | undefined>(PRState.OPEN)

  useEffect(() => {
    fetchPullRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, stateFilter])

  const fetchPullRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ projectId })
      if (stateFilter) {
        params.append('state', stateFilter)
      }
      const data = await apiRequest<PullRequest[]>(`/pull-requests?${params}`)
      setPullRequests(data)
    } catch (error) {
      console.error('Failed to fetch pull requests:', error)
    } finally {
      setLoading(false)
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t.pullRequests.title}</h1>
        <Link
          href={`/projects/${projectId}/pulls/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {t.pullRequests.createNew}
        </Link>
      </div>

      {/* State Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setStateFilter(PRState.OPEN)}
            className={`pb-3 border-b-2 transition-colors ${
              stateFilter === PRState.OPEN
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            {t.pullRequests.list.openPRs}
          </button>
          <button
            onClick={() => setStateFilter(PRState.CLOSED)}
            className={`pb-3 border-b-2 transition-colors ${
              stateFilter === PRState.CLOSED
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            {t.pullRequests.list.closedPRs}
          </button>
          <button
            onClick={() => setStateFilter(PRState.MERGED)}
            className={`pb-3 border-b-2 transition-colors ${
              stateFilter === PRState.MERGED
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            {t.pullRequests.list.mergedPRs}
          </button>
          <button
            onClick={() => setStateFilter(undefined)}
            className={`pb-3 border-b-2 transition-colors ${
              stateFilter === undefined
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            {t.pullRequests.list.allPRs}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-gray-400">{t.pullRequests.list.loading}</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && pullRequests.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-gray-400 mb-4">
            {t.pullRequests.list.noPRsFound}
          </div>
          <div className="text-gray-500 dark:text-gray-500 text-sm">
            {t.pullRequests.list.noPRsDesc}
          </div>
        </div>
      )}

      {/* PR List */}
      {!loading && pullRequests.length > 0 && (
        <div className="space-y-4">
          {pullRequests.map((pr) => (
            <div
              key={pr.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => router.push(`/projects/${projectId}/pulls/${pr.number}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-600 dark:text-gray-400">#{pr.number}</span>
                    <h3 className="text-lg font-semibold">{pr.title}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStateStyle(pr.state)}`}
                    >
                      {getStateText(pr.state)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-x-4">
                    <span>
                      {pr.sourceBranch} → {pr.targetBranch}
                    </span>
                    <span>
                      by {pr.author.username}
                    </span>
                    <span>
                      {new Date(pr.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  {pr._count && (
                    <>
                      <span>💬 {pr._count.comments}</span>
                      <span>👁 {pr._count.reviews}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
