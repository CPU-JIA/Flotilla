/**
 * Raft集群管理页面
 *
 * 实时监控和管理Raft集群状态
 * ECP-A1: 单一职责 - 专注于集群管理界面
 * ECP-B3: 清晰命名 - 语义化组件和方法命名
 */

'use client'

import { logger } from '@/lib/logger'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  Play,
  Square,
  RotateCcw,
  Activity,
  Users,
  Clock,
  Zap,
  ArrowLeft,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ClusterTopology } from '@/components/raft/cluster-topology'
import { RaftCommandPanel } from '@/components/raft/command-panel'

// 类型定义
interface ClusterStatus {
  nodeId: string
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
  isLeader: boolean
  currentTerm: number
  clusterSize: number
  nodesState: Array<{
    nodeId: string
    state: 'LEADER' | 'FOLLOWER' | 'CANDIDATE'
    currentTerm: number
    logLength: number
    lastApplied: number
  }>
  lastError?: string
}

interface ClusterMetrics {
  totalCommands: number
  commandsPerSecond: number
  averageResponseTime: number
  leaderElections: number
  uptime: number
}

interface ClusterConfig {
  settings: {
    nodeId: string
    nodes: string[]
    ports: Record<string, number>
    electionTimeoutMin: number
    electionTimeoutMax: number
    heartbeatInterval: number
    rpcTimeout: number
    autoStart: boolean
  }
  validation: {
    valid: boolean
    errors: string[]
  }
}

export default function RaftClusterPage() {
  const { t } = useLanguage()
  const [status, setStatus] = useState<ClusterStatus | null>(null)
  const [metrics, setMetrics] = useState<ClusterMetrics | null>(null)
  const [config, setConfig] = useState<ClusterConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ECP-C1: 动态读取API URL环境变量
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

  // 获取集群状态 - ECP-D1: 使用useCallback确保函数引用稳定
  const fetchClusterStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/raft-cluster/status`, {
        credentials: 'include', // 🔒 自动发送 HttpOnly Cookie
      })
      const result = await response.json()
      if (result.success) {
        setStatus(result.data)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch cluster status')
    }
  }, [API_URL])

  // 获取集群指标 - ECP-D1: 使用useCallback确保函数引用稳定
  const fetchClusterMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/raft-cluster/metrics`, {
        credentials: 'include', // 🔒 自动发送 HttpOnly Cookie
      })
      const result = await response.json()
      if (result.success) {
        setMetrics(result.data)
      }
    } catch (err) {
      logger.error('Failed to fetch metrics:', err)
    }
  }, [API_URL])

  // 获取集群配置 - ECP-D1: 使用useCallback确保函数引用稳定
  const fetchClusterConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/raft-cluster/config`, {
        credentials: 'include', // 🔒 自动发送 HttpOnly Cookie
      })
      const result = await response.json()
      if (result.success) {
        setConfig(result.data)
      }
    } catch (err) {
      logger.error('Failed to fetch config:', err)
    }
  }, [API_URL])

  // 集群控制操作
  const handleClusterAction = async (action: 'start' | 'stop' | 'restart') => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/raft-cluster/${action}`, {
        method: 'POST',
        credentials: 'include', // 🔒 自动发送 HttpOnly Cookie
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const result = await response.json()

      if (result.success) {
        await fetchClusterStatus()
      } else {
        setError(result.error)
      }
    } catch {
      setError(`Failed to ${action} cluster`)
    } finally {
      setLoading(false)
    }
  }

  // 自动刷新 - ECP-D1: 正确声明useEffect依赖，添加页面可见性检测优化性能
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchClusterStatus(), fetchClusterMetrics(), fetchClusterConfig()])
    }

    fetchData()

    // 每5秒刷新一次状态和指标
    const interval = setInterval(() => {
      fetchClusterStatus()
      fetchClusterMetrics()
    }, 5000)

    // 添加页面可见性检测，优化资源使用
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 页面恢复可见时，立即刷新数据
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchClusterStatus, fetchClusterMetrics, fetchClusterConfig])

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500'
      case 'starting':
        return 'bg-yellow-500'
      case 'stopping':
        return 'bg-orange-500'
      case 'stopped':
        return 'bg-gray-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 返回按钮 */}
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{t.raft.management.title}</h1>
            <p className="text-muted-foreground">{t.raft.management.description}</p>
          </div>
        </div>

        {/* 集群控制按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleClusterAction('start')}
            disabled={loading || status?.status === 'running'}
            variant="default"
          >
            <Play className="w-4 h-4 mr-2" />
            {t.raft.management.start}
          </Button>
          <Button
            onClick={() => handleClusterAction('stop')}
            disabled={loading || status?.status === 'stopped'}
            variant="outline"
          >
            <Square className="w-4 h-4 mr-2" />
            {t.raft.management.stop}
          </Button>
          <Button
            onClick={() => handleClusterAction('restart')}
            disabled={loading}
            variant="outline"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t.raft.management.restart}
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 集群状态总览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 集群状态 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.raft.management.clusterStatus}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${getStatusColor(status?.status || 'stopped')}`}
              />
              <span className="text-2xl font-bold capitalize">
                {status?.status || t.raft.management.unknown}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.raft.management.nodeId}: {status?.nodeId || 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* Leader信息 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.raft.management.leaderStatus}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.isLeader ? t.raft.management.isLeader : t.raft.management.notLeader}
            </div>
            <p className="text-xs text-muted-foreground">
              {t.raft.management.currentTerm}: {status?.currentTerm || 0}
            </p>
          </CardContent>
        </Card>

        {/* 集群大小 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.raft.management.clusterSize}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.clusterSize || 0} {t.raft.management.nodes}
            </div>
            <p className="text-xs text-muted-foreground">{t.raft.management.configuredNodes}</p>
          </CardContent>
        </Card>

        {/* 运行时间 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.raft.management.uptime}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? Math.floor(metrics.uptime / 60) : 0}m
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.uptime || 0} {t.raft.management.seconds}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 - 使用Tab分组 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t.raft.management.clusterOverview}</TabsTrigger>
          <TabsTrigger value="topology">{t.raft.management.topologyMap}</TabsTrigger>
          <TabsTrigger value="commands">{t.raft.management.distributedCommands}</TabsTrigger>
          <TabsTrigger value="config">{t.raft.management.configInfo}</TabsTrigger>
        </TabsList>

        {/* 集群概览 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 性能指标 */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {t.raft.performanceMetrics}
                </CardTitle>
                <CardDescription>{t.raft.management.performanceDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {metrics.totalCommands}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t.raft.management.totalCommands}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {metrics.commandsPerSecond.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t.raft.management.commandsPerSecond}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {metrics.averageResponseTime.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t.raft.management.averageResponseTime}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {metrics.leaderElections}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t.raft.management.leaderElections}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 节点状态详情 */}
          {status?.nodesState && status.nodesState.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t.raft.management.nodeStatusDetails}</CardTitle>
                <CardDescription>{t.raft.management.nodeStatusDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {status.nodesState.map((node) => (
                    <div
                      key={node.nodeId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge
                          className={
                            node.state === 'LEADER'
                              ? 'bg-blue-500'
                              : node.state === 'FOLLOWER'
                                ? 'bg-green-500'
                                : 'bg-yellow-500'
                          }
                        >
                          {node.state}
                        </Badge>
                        <div>
                          <div className="font-semibold">{node.nodeId}</div>
                          <div className="text-sm text-muted-foreground">
                            {t.raft.term}: {node.currentTerm}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div>
                          {t.raft.management.logLength}: {node.logLength}
                        </div>
                        <div className="text-muted-foreground">
                          {t.raft.management.appliedLogs}: {node.lastApplied}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 集群拓扑 */}
        <TabsContent value="topology">
          <ClusterTopology nodes={status?.nodesState || []} currentNodeId={status?.nodeId} />
        </TabsContent>

        {/* 分布式命令 */}
        <TabsContent value="commands">
          <RaftCommandPanel />
        </TabsContent>

        {/* 配置信息 */}
        <TabsContent value="config">
          {config && (
            <Card>
              <CardHeader>
                <CardTitle>{t.raft.management.clusterConfig}</CardTitle>
                <CardDescription>{t.raft.management.clusterConfigDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-semibold">{t.raft.management.basicConfig}</h4>
                    <div className="text-sm space-y-1">
                      <div>
                        {t.raft.management.nodeList}: {config.settings.nodes.join(', ')}
                      </div>
                      <div>
                        {t.raft.management.electionTimeout}: {config.settings.electionTimeoutMin}-
                        {config.settings.electionTimeoutMax}ms
                      </div>
                      <div>
                        {t.raft.management.heartbeatInterval}: {config.settings.heartbeatInterval}ms
                      </div>
                      <div>
                        {t.raft.management.rpcTimeout}: {config.settings.rpcTimeout}ms
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">{t.raft.management.portMapping}</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(config.settings.ports).map(([nodeId, port]) => (
                        <div key={nodeId}>
                          {nodeId}: {port}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 配置验证 */}
                {!config.validation.valid && (
                  <>
                    <Separator className="my-4" />
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t.raft.management.configValidationFailed}:{' '}
                        {config.validation.errors.join(', ')}
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
