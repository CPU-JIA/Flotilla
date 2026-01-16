'use client'

import { logger } from '@/lib/logger'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, MessageCircle } from 'lucide-react'
import type { Issue } from '@/types/issue'

type IssueState = 'OPEN' | 'CLOSED' | 'ALL'

export default function IssuesPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const projectId = params.id as string

  const [issues, setIssues] = useState<Issue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [stateFilter, setStateFilter] = useState<IssueState>('OPEN')

  const loadIssues = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.issues.list(projectId)
      setIssues(response.data)
    } catch (error) {
      logger.error('Failed to load issues:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  useEffect(() => {
    if (stateFilter === 'ALL') {
      setFilteredIssues(issues)
    } else {
      setFilteredIssues(issues.filter((issue) => issue.state === stateFilter))
    }
  }, [issues, stateFilter])

  const openIssueCount = issues.filter((i) => i.state === 'OPEN').length
  const closedIssueCount = issues.filter((i) => i.state === 'CLOSED').length

  const handleIssueClick = (issueNumber: number) => {
    router.push(`/projects/${projectId}/issues/${issueNumber}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t.issues.list.title}</h1>
        </div>
        <div className="text-muted-foreground">{t.issues.list.loading}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t.issues.list.title}</h1>
        <Button onClick={() => router.push(`/projects/${projectId}/issues/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          {t.issues.createNew}
        </Button>
      </div>

      {/* State Filter Tabs */}
      <Tabs
        value={stateFilter}
        onValueChange={(value) => setStateFilter(value as IssueState)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="OPEN">
            {t.issues.list.openIssues} ({openIssueCount})
          </TabsTrigger>
          <TabsTrigger value="CLOSED">
            {t.issues.list.closedIssues} ({closedIssueCount})
          </TabsTrigger>
          <TabsTrigger value="ALL">
            {t.issues.list.allIssues} ({issues.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-lg font-medium mb-2">{t.issues.list.noIssuesFound}</p>
          <p className="text-sm text-muted-foreground mb-4">{t.issues.list.noIssuesDesc}</p>
          <Button onClick={() => router.push(`/projects/${projectId}/issues/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            {t.issues.createNew}
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => handleIssueClick(issue.number)}
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Issue Number and State Badge */}
                <div className="flex-shrink-0 pt-1">
                  <Badge variant={issue.state === 'OPEN' ? 'default' : 'secondary'}>
                    {issue.state === 'OPEN' ? t.issues.state.open : t.issues.state.closed}
                  </Badge>
                </div>

                {/* Issue Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h3 className="font-semibold text-base mb-1 hover:text-primary transition-colors">
                    {issue.title}
                    <span className="text-muted-foreground ml-2">#{issue.number}</span>
                  </h3>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {/* Author */}
                    <span>
                      {t.issues.detail.openedBy
                        .replace('{author}', issue.author?.username || 'Unknown')
                        .replace('{date}', new Date(issue.createdAt).toLocaleDateString())}
                    </span>

                    {/* Labels */}
                    {issue.labels && issue.labels.length > 0 && (
                      <div className="flex items-center gap-1">
                        {issue.labels.slice(0, 3).map((issueLabel) => (
                          <Badge
                            key={issueLabel.id}
                            variant="outline"
                            style={{
                              backgroundColor: `${issueLabel.label.color}20`,
                              borderColor: issueLabel.label.color,
                              color: issueLabel.label.color,
                            }}
                            className="text-xs"
                          >
                            {issueLabel.label.name}
                          </Badge>
                        ))}
                        {issue.labels.length > 3 && (
                          <span className="text-xs">+{issue.labels.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Milestone */}
                    {issue.milestone && (
                      <Badge variant="outline" className="text-xs">
                        🏁 {issue.milestone.title}
                      </Badge>
                    )}

                    {/* Comment Count */}
                    {issue._count && issue._count.comments > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{issue._count.comments}</span>
                      </div>
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
