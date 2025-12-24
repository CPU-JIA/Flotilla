'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Wiki 页面编辑器
 * 支持 Markdown 编辑
 */
export default function WikiPageEdit() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const slug = params.slug as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPage()
  }, [projectId, slug])

  const fetchPage = async () => {
    try {
      setLoading(true)
      const page = await api.get<{ title: string; content: string; slug: string }>(`/projects/${projectId}/wiki/${slug}`)
      setTitle(page.title)
      setContent(page.content)
      setNewSlug(page.slug)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required')
      return
    }

    try {
      setSaving(true)
      const updateData: any = {
        title,
        content,
        message: message || undefined,
      }

      if (newSlug !== slug) {
        updateData.slug = newSlug
      }

      await api.put(`/projects/${projectId}/wiki/${slug}`, updateData)
      router.push(`/projects/${projectId}/wiki/${newSlug || slug}`)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save page')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading editor...</div>
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
        <Button
          variant="ghost"
          onClick={() => router.push(`/projects/${projectId}/wiki/${slug}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-6">Edit Wiki Page</h1>

        <div className="space-y-6">
          <div>
            <Label htmlFor="slug">Slug (URL identifier)</Label>
            <Input
              id="slug"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="getting-started"
              pattern="[a-z0-9-]+"
            />
            <p className="text-sm text-gray-500 mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page Title"
            />
          </div>

          <div>
            <Label htmlFor="content">Content (Markdown)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Your content here..."
              rows={20}
              className="font-mono"
            />
          </div>

          <div>
            <Label htmlFor="message">Edit Message (optional)</Label>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your changes..."
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/wiki/${slug}`)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
