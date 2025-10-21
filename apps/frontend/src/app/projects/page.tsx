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
import { useLanguage } from '@/contexts/language-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { ProjectCardSkeleton } from '@/components/common/loading-skeleton'
import { api, ApiError } from '@/lib/api'
import type { Project, ProjectsResponse } from '@/types/project'

export default function ProjectsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()

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
  const fetchProjects = useCallback(
    async (query?: string) => {
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
          setError(err.message || t.projects.fetchError)
        } else {
          setError(t.projects.networkError)
        }
      } finally {
        setLoading(false)
      }
    },
    [page, pageSize, t]
  )

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
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      {/* 白色卡片容器 - lab.html样式 + Dark模式支持 */}
      <div
        className="bg-card rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))',
        }}
      >
        <div className="space-y-6">
          {/* 页头 */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-card-foreground">{t.projects.myProjects}</h2>
              <p className="text-muted-foreground mt-1">
                {t.projects.totalProjects.replace('{count}', total.toString())}
              </p>
            </div>
            <CreateProjectDialog onSuccess={fetchProjects} />
          </div>

          {/* 搜索栏 */}
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder={t.projects.searchPlaceholder}
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
            <Button
              onClick={() => {
                setPage(1)
                fetchProjects(searchQuery)
              }}
            >
              {t.projects.search}
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
            <ProjectCardSkeleton />
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">
                  {searchQuery ? t.projects.noMatchingProjects : t.projects.noProjectsYet}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? t.projects.tryDifferentKeywords : t.projects.createFirstProject}
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
                          {project.visibility === 'PUBLIC'
                            ? t.projects.visibility.public
                            : t.projects.visibility.private}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {project.description || t.projects.noDescription}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <span>👥</span>
                          <span>
                            {project._count?.members || 0} {t.projects.members}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{new Date(project.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="text-xs text-gray-500 dark:text-gray-500">
                      {t.projects.owner}: {project.owner?.username || t.projects.unknown}
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
                {t.projects.previousPage}
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t.projects.pageInfo
                  .replace('{current}', page.toString())
                  .replace('{total}', Math.ceil(total / pageSize).toString())}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / pageSize) || loading}
              >
                {t.projects.nextPage}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
