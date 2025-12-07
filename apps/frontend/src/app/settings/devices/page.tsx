'use client'

/**
 * 设备管理页面
 * 🔒 Phase 4: 查看所有活跃登录设备 + 撤销特定设备
 * ECP-A1: 单一职责 - 设备会话管理
 * ECP-C1: 防御性编程 - 错误处理和用户友好提示
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface UserSession {
  id: string
  ipAddress: string
  device: string | null
  browser: string | null
  os: string | null
  location: string | null
  lastUsedAt: string
  createdAt: string
  expiresAt: string
}

export default function DevicesPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)

  // 加载设备列表
  const loadSessions = async () => {
    setIsLoading(true)
    try {
      const data = await api.auth.getSessions()
      setSessions(data)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || '加载设备列表失败')
        if (err.status === 401) {
          router.push('/auth/login')
        }
      } else {
        toast.error('网络错误，请稍后重试')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  // 撤销设备
  const handleRevokeSession = async (sessionId: string) => {
    if (sessions.length === 1) {
      toast.error('无法撤销最后一个活跃设备，请使用登出功能')
      return
    }

    if (!confirm('确定要撤销此设备的登录吗？该设备将被强制下线。')) {
      return
    }

    setRevokingSessionId(sessionId)
    try {
      await api.auth.revokeSession(sessionId)
      toast.success('设备已成功撤销')
      // 重新加载设备列表
      await loadSessions()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || '撤销失败，请稍后重试')
      } else {
        toast.error('网络错误，请稍后重试')
      }
    } finally {
      setRevokingSessionId(null)
    }
  }

  // 获取设备图标
  const getDeviceIcon = (device: string | null) => {
    if (!device) return <Monitor className="h-5 w-5" />
    if (device.toLowerCase().includes('mobile')) return <Smartphone className="h-5 w-5" />
    if (device.toLowerCase().includes('tablet')) return <Tablet className="h-5 w-5" />
    return <Monitor className="h-5 w-5" />
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} 天前`
    if (hours > 0) return `${hours} 小时前`
    if (minutes > 0) return `${minutes} 分钟前`
    return '刚刚'
  }

  // 判断是否是当前设备（粗略判断，基于最后活跃时间）
  const isCurrentDevice = (session: UserSession) => {
    const lastUsed = new Date(session.lastUsedAt)
    const now = new Date()
    const diff = now.getTime() - lastUsed.getTime()
    // 如果最后活跃时间在5分钟内，认为是当前设备
    return diff < 5 * 60 * 1000
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">设备管理</h1>
            <p className="text-muted-foreground mt-1">
              管理您的所有登录设备，确保账户安全
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSessions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* 安全提示 */}
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  安全提示
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  如果您发现任何不熟悉的设备，请立即撤销其登录状态并修改密码。
                  您的访问令牌有效期为 15 分钟，刷新令牌有效期为 30 天。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 设备列表 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">加载设备列表...</p>
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无活跃设备</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const isCurrent = isCurrentDevice(session)
              return (
                <Card key={session.id} className={isCurrent ? 'border-blue-200 dark:border-blue-800' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                          {getDeviceIcon(session.device)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">
                              {session.browser || 'Unknown'} - {session.os || 'Unknown'}
                            </CardTitle>
                            {isCurrent && (
                              <Badge variant="default" className="bg-blue-500 text-white">
                                当前设备
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Globe className="h-3.5 w-3.5" />
                              <span>{session.ipAddress}</span>
                            </div>
                            {session.location && (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{session.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3.5 w-3.5" />
                              <span>最后活跃: {formatTime(session.lastUsedAt)}</span>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                      {!isCurrent && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingSessionId === session.id}
                        >
                          {revokingSessionId === session.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              撤销中...
                            </>
                          ) : (
                            '撤销'
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        )}

        {/* 设备统计 */}
        {!isLoading && sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">设备统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                  <p className="text-sm text-muted-foreground">活跃设备</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {sessions.filter((s) => s.device?.toLowerCase().includes('mobile')).length}
                  </p>
                  <p className="text-sm text-muted-foreground">移动设备</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {sessions.filter((s) => s.device?.toLowerCase().includes('desktop')).length}
                  </p>
                  <p className="text-sm text-muted-foreground">桌面设备</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {new Set(sessions.map((s) => s.ipAddress)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">不同IP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
