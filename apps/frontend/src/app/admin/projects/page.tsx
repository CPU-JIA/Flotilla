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
import { api, ApiError } from '@/lib/api'
import type { Project } from '@/types/project'
import { AppLayout } from '@/components/layout/AppLayout'

export default function AdminProjectsPage() {
  const router = useRouter()
  const { user: currentUser, isAuthenticated, isLoading } = useAuth()
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
        setError('加载项目列表失败')
      }
    } finally {
      setLoading(false)
    }
  }, [page])

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
    if (!confirm(`确定要删除项目 "${projectName}" 吗？此操作不可撤销！`)) {
      return
    }

    try {
      await api.projects.delete(projectId)
      alert('项目已删除')
      fetchProjects()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`删除失败：${err.message}`)
      } else {
        alert('删除失败')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div
        className="bg-white rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'
        }}
      >
        {/* 页头 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
          <p className="text-gray-600 mt-1">共 {total} 个项目</p>
        </div>

        {/* 搜索栏 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-gray-100">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="搜索项目名称或描述..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchProjects(search)
                }
              }}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              onClick={() => fetchProjects(search)}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-sm hover:bg-blue-600 hover:shadow-md transition-all"
            >
              搜索
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {/* 项目列表 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">项目列表</h2>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {search ? '未找到匹配的项目' : '暂无项目'}
              </h3>
              <p className="text-gray-600">
                {search ? '尝试使用不同的关键词搜索' : '系统中还没有创建任何项目'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      {/* 项目信息 */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-bold text-lg text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {project.name}
                          </Link>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              project.visibility === 'PUBLIC'
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            {project.visibility === 'PUBLIC' ? '🌍 公开' : '🔒 私有'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {project.description || '暂无描述'}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span>
                            👤 所有者: <span className="font-medium text-gray-700">{project.owner?.username || '未知'}</span>
                          </span>
                          <span>
                            👥 成员: {project._count?.members || 0} 人
                          </span>
                          <span>
                            📅 创建于: {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                          <span>
                            🔖 ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                              {project.id.substring(0, 8)}...
                            </code>
                          </span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/projects/${project.id}`}>
                          <button className="px-4 py-2 border border-blue-200 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-all">
                            查看详情
                          </button>
                        </Link>
                        {currentUser?.role === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all"
                          >
                            删除
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
                    className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-gray-600">
                    第 {page} 页 / 共 {Math.ceil(total / 20)} 页
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(total / 20)}
                    className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    下一页
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
