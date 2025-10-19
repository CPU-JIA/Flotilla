'use client'

/**
 * 管理员项目管理页面 - 重构版本
 * 设计语言：统一蓝色主题 + 渐变背景 + 柔和阴影
 * ECP-A1: 单一职责 - 管理所有项目
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { api, ApiError } from '@/lib/api'
import type { Project } from '@/types/project'
import { AppLayout } from '@/components/layout/AppLayout'

export default function AdminProjectsPage() {
  const router = useRouter()
  const { user: currentUser, isAuthenticated, isLoading } = useAuth()
  const { t } = useLanguage()
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchProjects = useCallback(async (searchQuery?: string) => {
    try {
      setLoading(true)
      setError('')
      const data = await api.projects.getAll({
        page,
        pageSize: 20,
        search: searchQuery || undefined,
      })
      setProjects(data.projects)
      setTotal(data.total)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t.admin.projectsPage.loadingProjectsFailed)
      }
    } finally {
      setLoading(false)
    }
  }, [page, t])

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchProjects()
  }, [isLoading, isAuthenticated, currentUser, router, fetchProjects])

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(t.admin.projectsPage.confirmDelete.replace('{name}', projectName))) {
      return
    }

    try {
      await api.projects.delete(projectId)
      alert(t.admin.projectsPage.deleteSuccess)
      fetchProjects()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.admin.projectsPage.deleteFailed}：${err.message}`)
      } else {
        alert(t.admin.projectsPage.deleteFailed)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-yellow-50 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div
        className="bg-card rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'
        }}
      >
        {/* 页头 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-card-foreground">{t.admin.projectsPage.title}</h1>
          <p className="text-muted-foreground mt-1">{t.admin.projectsPage.totalProjects.replace('{count}', total.toString())}</p>
        </div>

        {/* 搜索栏 */}
        <div className="bg-card rounded-2xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder={t.admin.projectsPage.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchProjects(search)
                }
              }}
              className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-card text-card-foreground"
            />
            <button
              onClick={() => fetchProjects(search)}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-sm hover:bg-blue-600 hover:shadow-md transition-all"
            >
              {t.admin.projectsPage.search}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {/* 项目列表 */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-card-foreground mb-6">{t.admin.projectsPage.projectList}</h2>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">
                {search ? t.admin.projectsPage.noMatchingProjects : t.admin.projectsPage.noProjects}
              </h3>
              <p className="text-muted-foreground">
                {search ? t.admin.projectsPage.tryDifferentKeywords : t.admin.projectsPage.noProjectsCreated}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      {/* 项目信息 */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-bold text-lg text-card-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {project.name}
                          </Link>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              project.visibility === 'PUBLIC'
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {project.visibility === 'PUBLIC' ? `🌍 ${t.admin.projectsPage.public}` : `🔒 ${t.admin.projectsPage.private}`}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {project.description || t.admin.projectsPage.noDescription}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            👤 {t.admin.projectsPage.owner}: <span className="font-medium text-card-foreground">{project.owner?.username || t.admin.projectsPage.unknown}</span>
                          </span>
                          <span>
                            👥 {t.admin.projectsPage.members}: {project._count?.members || 0} {t.admin.projectsPage.people}
                          </span>
                          <span>
                            📅 {t.admin.projectsPage.createdAt}: {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                          <span>
                            🔖 ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">
                              {project.id.substring(0, 8)}...
                            </code>
                          </span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/projects/${project.id}`}>
                          <button className="px-4 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                            {t.admin.projectsPage.viewDetails}
                          </button>
                        </Link>
                        {currentUser?.role === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all"
                          >
                            {t.admin.projectsPage.delete}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {total > 20 && (
                <div className="mt-6 flex justify-center items-center gap-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-gray-800 transition-all bg-card text-card-foreground"
                  >
                    {t.projects.previousPage}
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {t.projects.pageInfo
                      .replace('{current}', page.toString())
                      .replace('{total}', Math.ceil(total / 20).toString())}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(total / 20)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-gray-800 transition-all bg-card text-card-foreground"
                  >
                    {t.projects.nextPage}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
