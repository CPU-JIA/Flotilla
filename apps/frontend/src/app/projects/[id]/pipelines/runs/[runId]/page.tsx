'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import {
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'

interface PipelineRunDetail {
  id: string
  pipelineId: string
  commitSha: string
  branch: string
  status: string
  startedAt: string
  finishedAt: string | null
  duration: number | null
  logs: string | null
  pipeline: {
    id: string
    name: string
  }
}

const statusConfig = {
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

export default function PipelineRunDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const runId = params.runId as string

  const [run, setRun] = useState<PipelineRunDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRunDetails = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.pipelines.getRun(runId)
      setRun(data)
    } catch (error) {
      console.error('Failed to load run details:', error)
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    loadRunDetails()
  }, [loadRunDetails])

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

  if (!run) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-12 text-center">
          <p className="text-gray-600">运行记录不存在</p>
        </Card>
      </div>
    )
  }

  const config = statusConfig[run.status as keyof typeof statusConfig]
  const StatusIcon = config.icon

  return (
    <div className="container mx-auto p-6">
      <Link
        href={`/projects/${projectId}/pipelines/${run.pipeline.id}/runs`}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        返回运行历史
      </Link>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-full ${config.bg}`}>
            <StatusIcon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{run.pipeline.name}</h1>
            <p className="text-gray-600">运行 #{run.id.substring(0, 8)}</p>
          </div>
          <Badge className={`${config.bg} ${config.color} ml-auto`}>{config.label}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Commit</p>
            <p className="font-mono text-sm font-medium">{run.commitSha}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">分支</p>
            <p className="font-medium">{run.branch}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">开始时间</p>
            <p className="text-sm">{new Date(run.startedAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">执行时长</p>
            <p className="text-sm">{formatDuration(run.duration)}</p>
          </div>
        </div>

        {run.finishedAt && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">结束时间</p>
            <p className="text-sm">{new Date(run.finishedAt).toLocaleString()}</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">构建日志</h2>
        <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
          <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
            {run.logs || '暂无日志输出'}
          </pre>
        </div>
      </Card>
    </div>
  )
}
