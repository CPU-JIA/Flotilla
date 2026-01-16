'use client'

import { logger } from '@/lib/logger'
import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, Clock, PlayCircle } from 'lucide-react'

interface PipelineRun {
  status: string
}

interface PipelineStatusBadgeProps {
  projectId: string
  className?: string
}

export function PipelineStatusBadge({ projectId, className = '' }: PipelineStatusBadgeProps) {
  const [latestRun, setLatestRun] = useState<PipelineRun | null>(null)
  const [loading, setLoading] = useState(true)

  const loadLatestRun = useCallback(async () => {
    try {
      setLoading(true)
      // Use api.get with type parameter
      const data = await api.get<{ runs: Array<PipelineRun> }>(
        `/projects/${projectId}/pipeline-runs?limit=1`
      )
      if (data.runs && data.runs.length > 0) {
        setLatestRun(data.runs[0])
      }
    } catch (error) {
      logger.error('Failed to load pipeline status:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadLatestRun()
  }, [loadLatestRun])

  if (loading || !latestRun) {
    return null
  }

  const statusConfig = {
    PENDING: {
      icon: Clock,
      label: '等待构建',
      variant: 'secondary' as const,
      color: 'text-gray-600',
    },
    RUNNING: {
      icon: PlayCircle,
      label: '构建中',
      variant: 'default' as const,
      color: 'text-blue-600',
    },
    SUCCESS: {
      icon: CheckCircle,
      label: '构建通过',
      variant: 'default' as const,
      color: 'text-green-600',
    },
    FAILURE: {
      icon: XCircle,
      label: '构建失败',
      variant: 'destructive' as const,
      color: 'text-red-600',
    },
    CANCELLED: {
      icon: XCircle,
      label: '已取消',
      variant: 'secondary' as const,
      color: 'text-orange-600',
    },
  }

  const config = statusConfig[latestRun.status as keyof typeof statusConfig]
  const StatusIcon = config.icon

  return (
    <Badge variant={config.variant} className={className}>
      <StatusIcon className={`w-3 h-3 mr-1 ${config.color}`} />
      {config.label}
    </Badge>
  )
}
