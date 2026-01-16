/**
 * Admin Audit Logs Page - Full System Audit Trail
 */

'use client'

import { logger } from '@/lib/logger'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Activity, CheckCircle, XCircle, Monitor, MapPin, Download, Search } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  username: string | null
  description: string
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  createdAt: string
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.audit.getAdminLogs()
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

  const handleExport = async () => {
    try {
      const csvContent = logs
        .map(
          (log) =>
            `"${log.createdAt}","${log.username}","${log.action}","${log.entityType}","${log.description}","${log.ipAddress}","${log.success}"`
        )
        .join('\n')
      const blob = new Blob([`Date,User,Action,Entity,Description,IP,Success\n${csvContent}`], {
        type: 'text/csv',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      logger.error('Failed to export logs:', error)
      alert('Failed to export logs')
    }
  }

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

  const filteredLogs = logs.filter(
    (log) =>
      !searchTerm ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading audit logs...</div>
      </div>
    )

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Audit Logs</h1>
            <p className="text-muted-foreground mt-1">
              Complete audit trail of all system activities
            </p>
          </div>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Events</div>
          <div className="text-2xl font-bold">{filteredLogs.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Successful</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredLogs.filter((l) => l.success).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredLogs.filter((l) => !l.success).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Unique Users</div>
          <div className="text-2xl font-bold">
            {new Set(filteredLogs.map((l) => l.username).filter(Boolean)).size}
          </div>
        </Card>
      </div>

      {filteredLogs.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No audit logs found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {log.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    <Badge variant="outline">{log.entityType}</Badge>
                    {log.username && <Badge variant="secondary">@{log.username}</Badge>}
                    <span className="text-xs text-muted-foreground">
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
                        <span>{log.userAgent.includes('Chrome') ? 'Chrome' : 'Other'}</span>
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
