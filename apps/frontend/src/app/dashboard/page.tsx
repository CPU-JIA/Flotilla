'use client'

/**
 * Dashboard 页面 - 重构版
 * 使用统一AppLayout + 白色卡片悬浮设计
 * ECP-A1: 单一职责 - 用户主页和项目概览
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AppLayout>
      {/* 主卡片容器 - 使用lab.html的卡片样式 */}
      <div
        className="bg-white rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'
        }}
      >
        {/* 欢迎区域 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">欢迎来到 Cloud Dev Platform</h2>
          <p className="text-gray-600">您已成功登录系统</p>
        </div>

        {/* 用户信息卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="text-sm text-gray-600 mb-1">用户名</div>
            <div className="text-lg font-semibold text-gray-900">{user.username}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="text-sm text-gray-600 mb-1">邮箱</div>
            <div className="text-lg font-semibold text-gray-900">{user.email}</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="text-sm text-gray-600 mb-1">角色</div>
            <div className="text-lg font-semibold text-gray-900">{user.role}</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="text-sm text-gray-600 mb-1">用户ID</div>
            <div className="text-sm font-mono text-gray-900">{user.id}</div>
          </div>
        </div>

        {/* 功能导航 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/projects">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group">
              <div className="text-4xl mb-3">📁</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">项目管理</h3>
              <p className="text-sm text-gray-600">创建和管理您的项目</p>
              <Button variant="outline" className="w-full mt-4 group-hover:bg-blue-50">
                查看我的项目
              </Button>
            </div>
          </Link>

          <div className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 opacity-60 cursor-not-allowed">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">代码仓库</h3>
            <p className="text-sm text-gray-600">浏览和编辑代码文件</p>
            <p className="text-sm text-gray-500 mt-4">即将推出...</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 opacity-60 cursor-not-allowed">
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">个人设置</h3>
            <p className="text-sm text-gray-600">管理您的账户设置</p>
            <p className="text-sm text-gray-500 mt-4">即将推出...</p>
          </div>
        </div>

        {/* 系统状态 */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">系统状态</h3>
          <p className="text-sm text-gray-600 mb-4">当前系统运行状态</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm font-semibold text-gray-900">后端API</div>
              <div className="text-xs text-green-600 mt-1">正常运行</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm font-semibold text-gray-900">数据库</div>
              <div className="text-xs text-green-600 mt-1">正常运行</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm font-semibold text-gray-900">MinIO</div>
              <div className="text-xs text-green-600 mt-1">正常运行</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm font-semibold text-gray-900">Redis</div>
              <div className="text-xs text-green-600 mt-1">正常运行</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
