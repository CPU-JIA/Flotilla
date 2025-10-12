'use client'

/**
 * 项目列表页面
 * ECP-A1: 单一职责 - 显示和管理项目列表
 * ECP-C3: 性能意识 - 分页加载
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { api, ApiError } from '@/lib/api'
import type { Project, ProjectsResponse } from '@/types/project'

export default function ProjectsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 12

  /**
   * 获取项目列表
   * ECP-C2: 系统化错误处理
   */
  const fetchProjects = useCallback(async (query?: string) => {
    setLoading(true)
    setError('')

    try {
      const response: ProjectsResponse = await api.projects.getAll({
        page,
        pageSize,
        search: query || undefined,
      })
      setProjects(response.projects)
      setTotal(response.total)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '获取项目列表失败')
      } else {
        setError('网络错误，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
    }
  }, [isAuthenticated, fetchProjects])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      {/* 白色卡片容器 - lab.html样式 */}
      <div
        className="bg-white rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'
        }}
      >
        <div className="space-y-6">
          {/* 页头 */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">我的项目</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                共 {total} 个项目
              </p>
            </div>
            <CreateProjectDialog onSuccess={fetchProjects} />
          </div>

          {/* 搜索栏 */}
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1)
                  fetchProjects(searchQuery)
                }
              }}
              className="max-w-md"
            />
            <Button onClick={() => {
              setPage(1)
              fetchProjects(searchQuery)
            }}>
              搜索
            </Button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* 项目列表 */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mt-2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {searchQuery ? '未找到匹配的项目' : '还没有项目'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery ? '尝试使用不同的关键词搜索' : '创建您的第一个项目开始协作'}
                </p>
                {!searchQuery && <CreateProjectDialog onSuccess={fetchProjects} />}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <Badge variant={project.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                          {project.visibility === 'PUBLIC' ? '公开' : '私有'}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {project.description || '暂无描述'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <span>👥</span>
                          <span>{project._count?.members || 0} 成员</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{new Date(project.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="text-xs text-gray-500 dark:text-gray-500">
                      所有者: {project.owner?.username || '未知'}
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* 分页 */}
          {total > pageSize && (
            <div className="flex justify-center items-center gap-4 pt-6">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1 || loading}
              >
                上一页
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / pageSize) || loading}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
