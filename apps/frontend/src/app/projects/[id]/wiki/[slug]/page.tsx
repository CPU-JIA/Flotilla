'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Edit, Clock, Trash2, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import ReactMarkdown from 'react-markdown'

interface WikiPage {
  id: string
  projectId: string
  slug: string
  title: string
  content: string
  parentId: string | null
  order: number
  createdById: string
  createdBy: {
    id: string
    username: string
    email: string
    avatar: string | null
  }
  createdAt: string
  updatedAt: string
}

/**
 * Wiki 页面查看器
 * 支持 Markdown 渲染
 */
export default function WikiPageView() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const slug = params.slug as string

  const [page, setPage] = useState<WikiPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchPage()
  }, [projectId, slug])

  const fetchPage = async () => {
    try {
      setLoading(true)
      const data = await api.get<WikiPage>(`/projects/${projectId}/wiki/${slug}`)
      setPage(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      setDeleting(true)
      await api.delete(`/projects/${projectId}/wiki/${slug}`)
      router.push(`/projects/${projectId}/wiki`)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete page')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading page...</div>
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
          <div className="text-red-600">Error: {error || 'Page not found'}</div>
          <Button
            className="mt-4"
            onClick={() => router.push(`/projects/${projectId}/wiki`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Wiki
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/wiki`}
          className="text-blue-600 hover:underline flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Wiki
        </Link>
      </div>

      <Card className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{page.title}</h1>
            <div className="text-sm text-gray-500">
              Last updated{' '}
              {new Date(page.updatedAt).toLocaleDateString()} by{' '}
              {page.createdBy.username}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/projects/${projectId}/wiki/${slug}/history`)
              }
            >
              <Clock className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/projects/${projectId}/wiki/${slug}/edit`)
              }
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="prose prose-slate max-w-none">
          <ReactMarkdown>{page.content}</ReactMarkdown>
        </div>
      </Card>
    </div>
  )
}
