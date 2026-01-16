'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Clock, User } from 'lucide-react'
import { api } from '@/lib/api'
import ReactMarkdown from 'react-markdown'

interface WikiPageHistory {
  id: string
  pageId: string
  title: string
  content: string
  editedById: string
  editedBy: {
    id: string
    username: string
    email: string
    avatar: string | null
  }
  editedAt: string
  message: string | null
}

/**
 * Wiki 页面历史记录
 * 显示所有历史版本
 */
export default function WikiPageHistory() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const slug = params.slug as string

  const [history, setHistory] = useState<WikiPageHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<WikiPageHistory | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<WikiPageHistory[]>(`/projects/${projectId}/wiki/${slug}/history`)
      setHistory(data)
      if (data.length > 0) {
        setSelectedVersion(data[0])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [projectId, slug])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading history...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
          <div className="text-red-600">Error: {error}</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push(`/projects/${projectId}/wiki/${slug}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Page
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 历史版本列表 */}
        <Card className="col-span-1 p-4">
          <h2 className="text-xl font-bold mb-4">Version History</h2>
          <div className="space-y-2">
            {history.map((version) => (
              <button
                key={version.id}
                onClick={() => setSelectedVersion(version)}
                className={`w-full text-left p-3 rounded border ${
                  selectedVersion?.id === version.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-1 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {version.message || 'No message'}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {version.editedBy.username}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(version.editedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* 版本内容预览 */}
        <Card className="col-span-2 p-8">
          {selectedVersion ? (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">{selectedVersion.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedVersion.editedBy.username}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(selectedVersion.editedAt).toLocaleString()}
                  </div>
                </div>
                {selectedVersion.message && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <strong>Edit Message:</strong> {selectedVersion.message}
                  </div>
                )}
              </div>

              <div className="prose prose-slate max-w-none">
                <ReactMarkdown>{selectedVersion.content}</ReactMarkdown>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-12">Select a version to view</div>
          )}
        </Card>
      </div>
    </div>
  )
}
