'use client'

/**
 * Pull Requests List Page
 *
 * Displays all PRs for a project with filtering by state
 * ECP-D1: Testability - Follows E2E test requirements
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PullRequest {
  id: string
  number: number
  title: string
  body?: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  sourceBranch: string
  targetBranch: string
  author: {
    id: string
    username: string
    avatar?: string
  }
  createdAt: string
}

export default function PullRequestsPage() {
  const { t } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPullRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function fetchPullRequests() {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      const response = await fetch(
        `http://localhost:4000/api/pull-requests?projectId=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        setPullRequests(data)
      } else {
        setError('Failed to fetch pull requests')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  function getStateBadge(state: string) {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      OPEN: 'default',
      CLOSED: 'secondary',
      MERGED: 'outline',
    }

    return (
      <Badge variant={variants[state] || 'default'} data-slot="badge">
        {state === 'OPEN' && t.pullRequests.state.open}
        {state === 'CLOSED' && t.pullRequests.state.closed}
        {state === 'MERGED' && t.pullRequests.state.merged}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p>{t.pullRequests.list.loading}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.pullRequests.title}</h1>
        <Button
          onClick={() => router.push(`/projects/${projectId}/pulls/new`)}
        >
          {t.pullRequests.createNew}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {pullRequests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {t.pullRequests.list.noPullRequestsDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pullRequests.map((pr) => (
            <div
              key={pr.id}
              className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() =>
                router.push(`/projects/${projectId}/pulls/${pr.number}`)
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">#{pr.number}</span>
                    <h3 className="text-lg font-medium">{pr.title}</h3>
                    {getStateBadge(pr.state)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {pr.sourceBranch} → {pr.targetBranch} •{' '}
                    {t.pullRequests.detail.openedBy
                      .replace('{author}', pr.author.username)
                      .replace(
                        '{date}',
                        new Date(pr.createdAt).toLocaleDateString(),
                      )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
