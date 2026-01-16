/**
 * Pipeline Detail Page
 *
 * Display pipeline configuration details, run history, and actions
 *
 * ECP-A1: Single Responsibility - Pipeline detail view
 * ECP-C1: Defensive Programming - Error handling and loading states
 * ECP-C2: Systematic Error Handling - User-friendly error messages
 */

'use client'

import { logger } from '@/lib/logger'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Play,
  Settings,
  Trash2,
  Clock,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import type { Pipeline, PipelineRunStatus } from '@/types/pipeline'

// Local type matching API response
interface PipelineRunItem {
  id: string
  pipelineId: string
  status: string
  startedAt: string
  finishedAt?: string
  logs?: string
  triggeredBy: {
    id: string
    username: string
    email: string
  }
  pipeline?: {
    id: string
    name: string
  }
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-gray-100 text-gray-800',
  },
  RUNNING: {
    label: 'Running',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-800 animate-pulse',
  },
  SUCCESS: {
    label: 'Success',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800',
  },
  FAILURE: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-100 text-red-800',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-800',
  },
}

export default function PipelineDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const pipelineId = params.pipelineId as string

  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [runs, setRuns] = useState<PipelineRunItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [triggeringRun, setTriggeringRun] = useState(false)

  // Load pipeline details and run history
  const loadPipeline = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [pipelineData, runsData] = await Promise.all([
        api.pipelines.getById(pipelineId),
        api.pipelines.getRuns(pipelineId, { page: 1, limit: 10 }),
      ])
      setPipeline(pipelineData)
      setRuns(runsData.data || [])
    } catch (err) {
      logger.error('Failed to load pipeline:', err)
      setError(err instanceof Error ? err.message : 'Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }, [pipelineId])

  useEffect(() => {
    loadPipeline()
  }, [loadPipeline])

  // Trigger manual pipeline run
  const handleTriggerRun = async () => {
    try {
      setTriggeringRun(true)
      await api.pipelines.trigger(pipelineId, {})
      // Reload to show new run
      await loadPipeline()
    } catch (err) {
      logger.error('Failed to trigger pipeline:', err)
      alert('Failed to trigger pipeline run')
    } finally {
      setTriggeringRun(false)
    }
  }

  // Delete pipeline
  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete pipeline "${pipeline?.name}"?\n\nThis action cannot be undone.`
      )
    ) {
      return
    }

    try {
      await api.pipelines.delete(pipelineId)
      router.push(`/projects/${projectId}/pipelines`)
    } catch (err) {
      logger.error('Failed to delete pipeline:', err)
      alert('Failed to delete pipeline')
    }
  }

  // Format duration
  const formatDuration = (startedAt: string, finishedAt?: string) => {
    const start = new Date(startedAt)
    const end = finishedAt ? new Date(finishedAt) : new Date()
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error || !pipeline) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Pipeline not found'}</AlertDescription>
        </Alert>
        <Link href={`/projects/${projectId}/pipelines`}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipelines
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/projects/${projectId}/pipelines`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipelines
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{pipeline.name}</h1>
              <Badge variant={pipeline.active ? 'default' : 'secondary'}>
                {pipeline.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground">Triggers: {pipeline.triggers.join(', ')}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleTriggerRun} disabled={!pipeline.active || triggeringRun}>
              {triggeringRun ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Trigger Run
            </Button>
            <Link href={`/projects/${projectId}/pipelines/${pipelineId}/edit`}>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Configuration */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">Triggers:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {pipeline.triggers.map((trigger) => (
                <Badge key={trigger} variant="outline">
                  {trigger}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Steps:</span>
            <div className="mt-2 bg-muted rounded-md p-4">
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(pipeline.config, null, 2)}
              </pre>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Created: {new Date(pipeline.createdAt).toLocaleString()}
            {' • '}
            Updated: {new Date(pipeline.updatedAt).toLocaleString()}
          </div>
        </div>
      </Card>

      {/* Run History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Runs</h2>
        {runs.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No runs yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Trigger a run manually or wait for an event to trigger this pipeline
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const statusConfig = STATUS_CONFIG[run.status as PipelineRunStatus]
              const StatusIcon = statusConfig.icon

              return (
                <Link key={run.id} href={`/projects/${projectId}/pipelines/runs/${run.id}`}>
                  <Card className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-2 rounded-full ${statusConfig.className}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Run #{run.id.slice(-8)}</span>
                            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Triggered by {run.triggeredBy.username}
                            {' • '}
                            {new Date(run.startedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {run.finishedAt
                          ? formatDuration(run.startedAt, run.finishedAt)
                          : run.status === 'RUNNING'
                            ? formatDuration(run.startedAt)
                            : '-'}
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}

            <Link href={`/projects/${projectId}/pipelines/${pipelineId}/runs`}>
              <Button variant="outline" className="w-full">
                View All Runs
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
