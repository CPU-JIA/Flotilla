'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import {
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

interface PipelineRun {
  id: string
  pipelineId: string
  commitSha: string
  branch: string
  status: string
  startedAt: string
  finishedAt: string | null
  duration: number | null
  logs?: string | null
  metadata?: Record<string, unknown> | null
  triggeredBy?: {
    id: string
    username: string
    email: string
  }
}

interface Pipeline {
  id: string
  name: string
  active: boolean
  triggers: string[]
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: '等待中' },
  RUNNING: {
    icon: PlayCircle,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    label: '运行中',
  },
  SUCCESS: {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-100',
    label: '成功',
  },
  FAILURE: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: '失败' },
  CANCELLED: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bg: 'bg-orange-100',
    label: '已取消',
  },
}

export default function PipelineRunsPage() {
  const params = useParams()
  const projectId = params.id as string
  const pipelineId = params.pipelineId as string

  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [pipelineRes, runsRes] = await Promise.all([
        api.pipelines.getById(pipelineId),
        api.pipelines.runs(pipelineId),
      ])
      setPipeline(pipelineRes)
      setRuns(runsRes.runs || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [pipelineId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href={`/projects/${projectId}/pipelines`}>流水线</Link>
          <ChevronRight className="w-4 h-4" />
          <span>{pipeline?.name}</span>
        </div>
        <h1 className="text-3xl font-bold">运行历史</h1>
      </div>

      {runs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400">
            <Clock className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-700">还没有运行记录</h3>
            <p className="text-sm mt-2">流水线触发后会在这里显示运行历史</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const config = statusConfig[run.status]
            const StatusIcon = config.icon

            return (
              <Card key={run.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-full ${config.bg}`}>
                      <StatusIcon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm font-medium">
                          {run.commitSha.substring(0, 7)}
                        </span>
                        <Badge variant="outline">{run.branch}</Badge>
                        <Badge className={config.bg + ' ' + config.color}>
                          {config.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          开始时间: {new Date(run.startedAt).toLocaleString()}
                        </span>
                        {run.finishedAt && (
                          <span>
                            结束时间: {new Date(run.finishedAt).toLocaleString()}
                          </span>
                        )}
                        <span>耗时: {formatDuration(run.duration)}</span>
                      </div>
                    </div>

                    <Link href={`/projects/${projectId}/pipelines/runs/${run.id}`}>
                      <Button variant="outline" size="sm">
                        查看详情
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
