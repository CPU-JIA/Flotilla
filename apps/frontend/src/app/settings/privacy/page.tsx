'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Download, FileJson, FileText, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react'

type ExportFormat = 'JSON' | 'CSV'
type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED'

interface DataExportRequest {
  id: string
  format: ExportFormat
  status: ExportStatus
  filePath?: string
  fileSize?: number
  expiresAt?: string
  errorMsg?: string
  completedAt?: string
  createdAt: string
}

export default function PrivacyPage() {
  const [exports, setExports] = useState<DataExportRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('JSON')
  const { toast } = useToast()

  // 加载导出历史
  const loadExports = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:4000/api/v1/gdpr/exports', {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to load exports')
      const data = await response.json()
      setExports(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load export history',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExports()
  }, [])

  // 创建新的导出请求
  const handleCreateExport = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('http://localhost:4000/api/v1/gdpr/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ format: selectedFormat }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create export')
      }

      const data = await response.json()
      toast({
        title: 'Export request created',
        description: data.message || 'You will receive an email when your export is ready.',
      })

      // 刷新列表
      await loadExports()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create export request',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  // 下载导出文件
  const handleDownload = async (exportId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/v1/gdpr/export/${exportId}/download`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get download URL')
      }

      const data = await response.json()

      // 打开下载 URL
      window.open(data.url, '_blank')

      toast({
        title: 'Download started',
        description: 'Your data export file is being downloaded.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download export',
        variant: 'destructive',
      })
    }
  }

  // 状态徽章
  const StatusBadge = ({ status }: { status: ExportStatus }) => {
    const config = {
      PENDING: { icon: Clock, color: 'bg-yellow-500', text: 'Pending' },
      PROCESSING: { icon: Loader2, color: 'bg-blue-500', text: 'Processing' },
      COMPLETED: { icon: CheckCircle, color: 'bg-green-500', text: 'Completed' },
      FAILED: { icon: AlertCircle, color: 'bg-red-500', text: 'Failed' },
      EXPIRED: { icon: AlertCircle, color: 'bg-gray-500', text: 'Expired' },
    }

    const { icon: Icon, color, text } = config[status]

    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {text}
      </Badge>
    )
  }

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Privacy & Data Export</h1>
          <p className="text-muted-foreground mt-2">
            Export your personal data in compliance with GDPR regulations
          </p>
        </div>

        {/* Create Export Card */}
        <Card>
          <CardHeader>
            <CardTitle>Request Data Export</CardTitle>
            <CardDescription>
              Download all your personal data from Flotilla. Your export will include user profile, projects,
              issues, pull requests, comments, and activity logs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Export Format</label>
                <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JSON">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4" />
                        JSON (Recommended)
                      </div>
                    </SelectItem>
                    <SelectItem value="CSV">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        CSV (Spreadsheet)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateExport} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Request Export
                  </>
                )}
              </Button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your export will be processed asynchronously. You will receive an email
                with a download link when it is ready. The download link will expire after 7 days.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export History */}
        <Card>
          <CardHeader>
            <CardTitle>Export History</CardTitle>
            <CardDescription>Your recent data export requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : exports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No export requests yet</p>
                <p className="text-sm mt-2">Create your first export above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exports.map((exportRequest) => (
                  <div
                    key={exportRequest.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={exportRequest.status} />
                          <span className="font-medium">
                            {exportRequest.format} Export
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {formatDate(exportRequest.createdAt)}
                          </div>
                          {exportRequest.completedAt && (
                            <div>
                              <span className="font-medium">Completed:</span>{' '}
                              {formatDate(exportRequest.completedAt)}
                            </div>
                          )}
                          {exportRequest.fileSize && (
                            <div>
                              <span className="font-medium">Size:</span>{' '}
                              {formatFileSize(exportRequest.fileSize)}
                            </div>
                          )}
                          {exportRequest.expiresAt && (
                            <div>
                              <span className="font-medium">Expires:</span>{' '}
                              {formatDate(exportRequest.expiresAt)}
                            </div>
                          )}
                        </div>

                        {exportRequest.errorMsg && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            <strong>Error:</strong> {exportRequest.errorMsg}
                          </div>
                        )}
                      </div>

                      <div>
                        {exportRequest.status === 'COMPLETED' && (
                          <Button
                            size="sm"
                            onClick={() => handleDownload(exportRequest.id)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                        {exportRequest.status === 'PROCESSING' && (
                          <Button size="sm" disabled>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Data Exports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>What's included:</strong> Your data export includes your user profile, organization
              and team memberships, projects and repositories, issues, pull requests, comments, reviews,
              commits, notifications, and audit logs.
            </p>
            <p>
              <strong>Processing time:</strong> Most exports complete within a few minutes. Large accounts
              may take longer.
            </p>
            <p>
              <strong>Download expiration:</strong> Download links expire after 7 days for security reasons.
              You can request a new export at any time.
            </p>
            <p>
              <strong>Privacy:</strong> Your export is stored securely and encrypted. Only you can access
              your data export using your authenticated account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
