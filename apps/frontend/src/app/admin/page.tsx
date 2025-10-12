'use client'

/**
 * 管理员仪表板 - 重构版本
 * 设计语言：统一蓝色主题 + 渐变背景 + 柔和阴影
 * ECP-A1: 单一职责 - 系统概览和快捷操作
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { api, ApiError } from '@/lib/api'
import type { SystemStats } from '@/types/admin'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  }, [isLoading, isAuthenticated, user, router])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await api.admin.getSystemStats()
      setStats(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('加载统计信息失败')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `radial-gradient(1200px 600px at 10% -10%, #dbeafe 0%, transparent 60%), radial-gradient(1200px 600px at 110% 10%, #fde68a 0%, transparent 60%), #f4f6f9`
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `radial-gradient(1200px 600px at 10% -10%, #dbeafe 0%, transparent 60%), radial-gradient(1200px 600px at 110% 10%, #fde68a 0%, transparent 60%), #f4f6f9`
        }}
      >
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-md">
          <div className="text-red-600 mb-4 text-lg">{error}</div>
          <button
            onClick={fetchStats}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-md hover:bg-blue-600 transition-all"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

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
        {/* 页头 */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理员仪表板</h1>
          <p className="text-gray-600 mt-1">系统概览和统计信息</p>
        </header>

        {/* 统计卡片区 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 用户统计 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl">👥</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.users.total}</div>
            <div className="text-sm text-gray-600 mb-3">总用户数</div>
            <div className="flex gap-3 text-xs">
              <span className="text-green-600 font-medium">✓ {stats.users.active} 激活</span>
              <span className="text-gray-400">✗ {stats.users.inactive} 停用</span>
            </div>
          </div>

          {/* 项目统计 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl">📁</div>
              <div className="text-sm text-gray-500">Projects</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.projects.total}</div>
            <div className="text-sm text-gray-600 mb-3">总项目数</div>
            <div className="flex gap-3 text-xs">
              <span className="text-blue-600 font-medium">🌍 {stats.projects.public} 公开</span>
              <span className="text-gray-400">🔒 {stats.projects.private} 私有</span>
            </div>
          </div>

          {/* 提交统计 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl">📝</div>
              <div className="text-sm text-gray-500">Commits</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.commits.total}</div>
            <div className="text-sm text-gray-600 mb-3">总提交数</div>
            <div className="text-xs text-gray-400">所有代码提交</div>
          </div>

          {/* 管理员统计 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl">👑</div>
              <div className="text-sm text-gray-500">Roles</div>
            </div>
            <div className="text-sm text-gray-600 mb-3">权限分布</div>
            <div className="space-y-1 text-xs">
              <div className="text-red-600 font-medium">超级管理员：{stats.users.superAdmins}</div>
              <div className="text-gray-400">管理员：{stats.users.admins}</div>
              <div className="text-gray-600">普通用户：{stats.users.regularUsers}</div>
            </div>
          </div>
        </div>

        {/* 快捷操作区 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href="/admin/users">
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-blue-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">👥</div>
                <div className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium group-hover:bg-blue-600 transition-colors">
                  进入管理 →
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">用户管理</h3>
              <p className="text-gray-600 text-sm">
                查看、封禁、解封用户，修改角色权限
              </p>
            </div>
          </Link>

          <Link href="/admin/projects">
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-blue-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">📁</div>
                <div className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium group-hover:bg-blue-600 transition-colors">
                  进入管理 →
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">项目管理</h3>
              <p className="text-gray-600 text-sm">
                查看所有项目，管理项目权限和成员
              </p>
            </div>
          </Link>
        </div>

        {/* 最近活动区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 最近注册用户 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-1">最近注册用户</h3>
            <p className="text-sm text-gray-500 mb-4">最新的 5 个用户</p>
            <div className="space-y-3">
              {stats.recent.users.map((user) => (
                <div
                  key={user.id}
                  className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">{user.username}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 最近创建项目 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-1">最近创建项目</h3>
            <p className="text-sm text-gray-500 mb-4">最新的 5 个项目</p>
            <div className="space-y-3">
              {stats.recent.projects.map((project) => (
                <div
                  key={project.id}
                  className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">{project.name}</div>
                    <div className="text-xs text-gray-500">by {project.owner.username}</div>
                  </div>
                  <div className="text-xs text-gray-400">
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
