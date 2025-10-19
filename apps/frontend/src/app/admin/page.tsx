'use client'

/**
 * 管理员仪表板 - 重构版本
 * 设计语言：统一蓝色主题 + 渐变背景 + 柔和阴影
 * ECP-A1: 单一职责 - 系统概览和快捷操作
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { api, ApiError } from '@/lib/api'
import type { SystemStats } from '@/types/admin'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { t } = useLanguage()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.admin.getSystemStats()
      setStats(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t.admin.loadingStats)
      }
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user && user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchStats()
  }, [isLoading, isAuthenticated, user, router, fetchStats])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-yellow-50 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t.admin.loading}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-yellow-50 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
        <div className="text-center bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg max-w-md border border-gray-200 dark:border-gray-700">
          <div className="text-red-600 dark:text-red-400 mb-4 text-lg">{error}</div>
          <button
            onClick={fetchStats}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-md hover:bg-blue-600 transition-all"
          >
            {t.admin.retry}
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <AppLayout>
      {/* 白色卡片容器 - lab.html样式 + Dark模式支持 */}
      <div
        className="bg-card rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'
        }}
      >
        {/* 页头 */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-card-foreground">{t.admin.dashboard}</h1>
          <p className="text-muted-foreground mt-1">{t.admin.systemOverview}</p>
        </header>

        {/* 统计卡片区 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 用户统计 */}
          <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl">👥</div>
              <div className="text-sm text-muted-foreground">{t.admin.total}</div>
            </div>
            <div className="text-3xl font-bold text-card-foreground mb-1">{stats.users.total}</div>
            <div className="text-sm text-muted-foreground mb-3">{t.admin.totalUsers}</div>
            <div className="flex gap-3 text-xs">
              <span className="text-green-600 dark:text-green-400 font-medium">✓ {stats.users.active} {t.admin.active}</span>
              <span className="text-gray-400">✗ {stats.users.inactive} {t.admin.inactive}</span>
            </div>
          </div>

          {/* 项目统计 */}
          <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl">📁</div>
              <div className="text-sm text-muted-foreground">{t.admin.projects}</div>
            </div>
            <div className="text-3xl font-bold text-card-foreground mb-1">{stats.projects.total}</div>
            <div className="text-sm text-muted-foreground mb-3">{t.admin.totalProjects}</div>
            <div className="flex gap-3 text-xs">
              <span className="text-blue-600 dark:text-blue-400 font-medium">🌍 {stats.projects.public} {t.admin.public}</span>
              <span className="text-gray-400">🔒 {stats.projects.private} {t.admin.private}</span>
            </div>
          </div>

          {/* 提交统计 */}
          <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl">📝</div>
              <div className="text-sm text-muted-foreground">{t.admin.commits}</div>
            </div>
            <div className="text-3xl font-bold text-card-foreground mb-1">{stats.commits.total}</div>
            <div className="text-sm text-muted-foreground mb-3">{t.admin.totalCommits}</div>
            <div className="text-xs text-gray-400">{t.admin.allCodeCommits}</div>
          </div>

          {/* 管理员统计 */}
          <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl">👑</div>
              <div className="text-sm text-muted-foreground">{t.admin.roles}</div>
            </div>
            <div className="text-sm text-muted-foreground mb-3">{t.admin.permissionDistribution}</div>
            <div className="space-y-1 text-xs">
              <div className="text-red-600 dark:text-red-400 font-medium">{t.admin.superAdmins}：{stats.users.superAdmins}</div>
              <div className="text-gray-400">{t.admin.admins}：{stats.users.admins}</div>
              <div className="text-muted-foreground">{t.admin.regularUsers}：{stats.users.regularUsers}</div>
            </div>
          </div>
        </div>

        {/* 快捷操作区 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/admin/users">
            <div className="bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 group">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">👥</div>
                <div className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium group-hover:bg-blue-600 dark:bg-blue-600 dark:group-hover:bg-blue-700 transition-colors">
                  {t.admin.enterManagement}
                </div>
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-2">{t.admin.userManagement}</h3>
              <p className="text-muted-foreground text-sm">
                {t.admin.userManagementDesc}
              </p>
            </div>
          </Link>

          <Link href="/admin/projects">
            <div className="bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 group">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">📁</div>
                <div className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium group-hover:bg-blue-600 dark:bg-blue-600 dark:group-hover:bg-blue-700 transition-colors">
                  {t.admin.enterManagement}
                </div>
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-2">{t.admin.projectManagement}</h3>
              <p className="text-muted-foreground text-sm">
                {t.admin.projectManagementDesc}
              </p>
            </div>
          </Link>

          <Link href="/admin/cluster">
            <div className="bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 group">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">🔗</div>
                <div className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium group-hover:bg-green-600 dark:bg-green-600 dark:group-hover:bg-green-700 transition-colors">
                  {t.admin.enterManagement}
                </div>
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-2">{t.admin.raftClusterManagement}</h3>
              <p className="text-muted-foreground text-sm">
                {t.admin.raftClusterManagementDesc}
              </p>
            </div>
          </Link>
        </div>

        {/* 最近活动区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 最近注册用户 */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-card-foreground mb-1">{t.admin.recentUsers}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t.admin.recentUsersDesc}</p>
            <div className="space-y-3">
              {stats.recent.users.map((user) => (
                <div
                  key={user.id}
                  className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <div className="font-medium text-card-foreground">{user.username}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 最近创建项目 */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-card-foreground mb-1">{t.admin.recentProjects}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t.admin.recentProjectsDesc}</p>
            <div className="space-y-3">
              {stats.recent.projects.map((project) => (
                <div
                  key={project.id}
                  className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <div className="font-medium text-card-foreground">{project.name}</div>
                    <div className="text-xs text-muted-foreground">{t.admin.by} {project.owner.username}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
