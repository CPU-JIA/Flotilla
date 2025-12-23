'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { Plus, Play, Settings, Trash2, Clock } from 'lucide-react'
import Link from 'next/link'

interface Pipeline {
  id: string
  name: string
  active: boolean
  triggers: string[]
  createdAt: string
  updatedAt: string
}

export default function PipelinesPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPipelines()
  }, [projectId])

  const loadPipelines = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/projects/${projectId}/pipelines`)
      setPipelines(response.data.pipelines)
    } catch (error) {
      console.error('Failed to load pipelines:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (pipelineId: string) => {
    if (!confirm('确定要删除此流水线吗？')) return

    try {
      await api.delete(`/pipelines/${pipelineId}`)
      loadPipelines()
    } catch (error) {
      console.error('Failed to delete pipeline:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">CI/CD 流水线</h1>
          <p className="text-gray-600 mt-2">配置和管理项目的持续集成/持续部署流水线</p>
        </div>
        <Link href={`/projects/${projectId}/pipelines/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            创建流水线
          </Button>
        </Link>
      </div>

      {pipelines.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Settings className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-700">还没有流水线</h3>
            <p className="text-sm mt-2">创建第一个 CI/CD 流水线来自动化构建和测试</p>
          </div>
          <Link href={`/projects/${projectId}/pipelines/new`}>
            <Button className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              创建流水线
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link href={`/projects/${projectId}/pipelines/${pipeline.id}`}>
                      <h3 className="text-xl font-semibold hover:text-blue-600 cursor-pointer">
                        {pipeline.name}
                      </h3>
                    </Link>
                    <Badge variant={pipeline.active ? 'default' : 'secondary'}>
                      {pipeline.active ? '激活' : '未激活'}
                    </Badge>
                  </div>

                  <div className="flex gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      <span>触发条件: {pipeline.triggers.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        创建于: {new Date(pipeline.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/projects/${projectId}/pipelines/${pipeline.id}/runs`}>
                    <Button variant="outline" size="sm">
                      <Clock className="w-4 h-4 mr-1" />
                      运行历史
                    </Button>
                  </Link>
                  <Link href={`/projects/${projectId}/pipelines/${pipeline.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-1" />
                      配置
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(pipeline.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
