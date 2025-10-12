'use client'

/**
 * 项目详情页面
 * ECP-A1: 单一职责 - 显示项目详情和管理成员
 * ECP-C2: 系统化错误处理
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectMembersPanel } from '@/components/projects/project-members-panel'
import { api, ApiError } from '@/lib/api'
import type { Project } from '@/types/project'

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      const data = await api.projects.getById(projectId)
      setProject(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '获取项目详情失败')
        if (err.status === 403 || err.status === 404) {
          setTimeout(() => router.push('/projects'), 2000)
        }
      } else {
        setError('网络错误，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, router])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && projectId) {
      fetchProject()
    }
  }, [isAuthenticated, projectId, fetchProject])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  const isOwner = project?.ownerId === user?.id
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const canManageMembers = isOwner || isSuperAdmin

  return (
    <AppLayout>
      <div className="bg-white rounded-[14px] p-[22px]" style={{boxShadow: '10px 10px 15px black', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'}}>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载项目详情...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{error}</h3>
            <Button onClick={() => router.push('/projects')} className="mt-4">返回项目列表</Button>
          </div>
        ) : project ? (
          <div className="space-y-8">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                    <Badge variant={project.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                      {project.visibility === 'PUBLIC' ? '🌍 公开' : '🔒 私有'}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-base">{project.description || '暂无描述'}</p>
                </div>
                <Button variant="outline" onClick={() => router.push('/projects')}>← 返回列表</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">所有者</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👤</span>
                      <div>
                        <p className="font-semibold">{project.owner?.username}</p>
                        <p className="text-xs text-gray-500">{project.owner?.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">成员数量</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <p className="text-3xl font-bold">{project._count?.members || 0}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">创建时间</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📅</span>
                      <p className="font-semibold">
                        {new Date(project.createdAt).toLocaleDateString('zh-CN', {year: 'numeric', month: 'long', day: 'numeric'})}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div>
              <ProjectMembersPanel projectId={project.id} members={project.members || []} canManageMembers={canManageMembers} onMembersChange={fetchProject} />
            </div>
            {isOwner && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">项目操作</h3>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => alert('项目设置功能即将推出')}>⚙️ 项目设置</Button>
                  <Button variant="outline" onClick={() => router.push(`/projects/${project.id}/files`)}>📁 浏览文件</Button>
                  <Button variant="outline" onClick={() => alert('提交历史功能即将推出')}>📝 提交历史</Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
