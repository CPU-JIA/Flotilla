'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'

interface WikiTreeNode {
  id: string
  slug: string
  title: string
  parentId: string | null
  order: number
  createdAt: string
  updatedAt: string
  children: WikiTreeNode[]
}

/**
 * Wiki 主页 - 显示页面树结构
 * ECP-B2: KISS - 简单的树形展示
 * ECP-C1: 防御性编程 - 错误处理和加载状态
 */
export default function WikiPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [tree, setTree] = useState<WikiTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const fetchWikiTree = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<WikiTreeNode[]>(`/projects/${projectId}/wiki`)
      setTree(data)
      // 默认展开所有节点
      const allIds = new Set<string>()
      const collectIds = (nodes: WikiTreeNode[]) => {
        nodes.forEach(node => {
          allIds.add(node.id)
          if (node.children?.length > 0) {
            collectIds(node.children)
          }
        })
      }
      collectIds(data)
      setExpandedNodes(allIds)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load wiki tree')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchWikiTree()
  }, [fetchWikiTree])

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const renderTree = (nodes: WikiTreeNode[], depth = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedNodes.has(node.id)
      const hasChildren = node.children?.length > 0

      return (
        <div key={node.id} style={{ marginLeft: `${depth * 20}px` }}>
          <div className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2 group">
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            <FileText className="h-4 w-4 text-gray-500" />
            <Link
              href={`/projects/${projectId}/wiki/${node.slug}`}
              className="flex-1 hover:underline"
            >
              {node.title}
            </Link>
          </div>
          {hasChildren && isExpanded && renderTree(node.children, depth + 1)}
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading wiki...</div>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Project Wiki</h1>
        <Button
          onClick={() => router.push(`/projects/${projectId}/wiki/new`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>

      <Card className="p-6">
        {tree.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">No wiki pages yet</p>
            <p className="text-sm mb-4">
              Create your first wiki page to get started
            </p>
            <Button
              onClick={() => router.push(`/projects/${projectId}/wiki/new`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </div>
        ) : (
          <div className="space-y-1">{renderTree(tree)}</div>
        )}
      </Card>
    </div>
  )
}
