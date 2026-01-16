/**
 * Audit Logs Page - Personal Activity History
 */

'use client'

import { logger } from '@/lib/logger'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Activity, CheckCircle, XCircle, Monitor, MapPin } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  description: string
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  createdAt: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.audit.getUserLogs()
      setLogs(data)
    } catch (error) {
      logger.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      LOGIN: 'bg-green-500',
      LOGOUT: 'bg-gray-500',
      CREATE: 'bg-blue-500',
      UPDATE: 'bg-yellow-500',
      DELETE: 'bg-red-500',
      ACCESS: 'bg-purple-500',
    }
    return <Badge className={colors[action] || 'bg-gray-500'}>{action}</Badge>
  }

  const formatUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Other'
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading activity logs...</div>
      </div>
    )

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">
          Your personal activity history and security events
        </p>
      </div>

      {logs.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No activity logs yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-4">
                {/* Success/Failure Icon */}
                <div className="flex-shrink-0 mt-1">
                  {log.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    <Badge variant="outline">{log.entityType}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm">{log.description}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {log.ipAddress && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{log.ipAddress}</span>
                      </div>
                    )}
                    {log.userAgent && (
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        <span>{formatUserAgent(log.userAgent)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
