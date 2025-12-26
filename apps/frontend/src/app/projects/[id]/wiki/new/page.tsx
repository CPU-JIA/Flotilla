'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * 创建新 Wiki 页面
 */
export default function WikiPageNew() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!slug.trim() || !title.trim() || !content.trim()) {
      alert('Slug, title, and content are required')
      return
    }

    // 验证 slug 格式
    if (!/^[a-z0-9-]+$/.test(slug)) {
      alert('Slug must contain only lowercase letters, numbers, and hyphens')
      return
    }

    try {
      setCreating(true)
      const data = await api.post<{ slug: string }>(`/projects/${projectId}/wiki`, {
        slug,
        title,
        content,
      })
      router.push(`/projects/${projectId}/wiki/${data.slug}`)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create page')
    } finally {
      setCreating(false)
    }
  }

  const handleSlugChange = (value: string) => {
    // 自动转换为 URL 友好格式
    const urlFriendly = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(urlFriendly)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/projects/${projectId}/wiki`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Wiki
        </Button>
      </div>

      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-6">Create New Wiki Page</h1>

        <div className="space-y-6">
          <div>
            <Label htmlFor="slug">Slug (URL identifier)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="getting-started"
            />
            <p className="text-sm text-gray-500 mt-1">
              Will be automatically formatted to lowercase with hyphens
            </p>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Getting Started"
            />
          </div>

          <div>
            <Label htmlFor="content">Content (Markdown)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Getting Started

Write your content here using Markdown syntax...

## Installation
...

## Usage
..."
              rows={20}
              className="font-mono"
            />
            <p className="text-sm text-gray-500 mt-1">
              Supports full Markdown syntax including headings, lists, code blocks, etc.
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/wiki`)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              <Plus className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
