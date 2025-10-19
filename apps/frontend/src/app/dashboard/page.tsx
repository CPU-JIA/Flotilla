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
import { useLanguage } from '@/contexts/language-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { SystemStatus } from '@/components/dashboard/SystemStatus'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { t } = useLanguage()

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
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AppLayout>
      {/* 主卡片容器 - 使用lab.html的卡片样式 + Dark模式支持 */}
      <div
        className="bg-card rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'
        }}
      >
        {/* 欢迎区域 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-card-foreground mb-2">{t.dashboard.welcome}</h2>
          <p className="text-muted-foreground">{t.dashboard.loginSuccess}</p>
        </div>

        {/* 用户信息卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-100 dark:border-blue-900">
            <div className="text-sm text-muted-foreground mb-1">{t.dashboard.username}</div>
            <div className="text-lg font-semibold text-card-foreground">{user.username}</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-xl border border-green-100 dark:border-green-900">
            <div className="text-sm text-muted-foreground mb-1">{t.dashboard.email}</div>
            <div className="text-lg font-semibold text-card-foreground">{user.email}</div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-xl border border-purple-100 dark:border-purple-900">
            <div className="text-sm text-muted-foreground mb-1">{t.dashboard.role}</div>
            <div className="text-lg font-semibold text-card-foreground">{user.role}</div>
          </div>
          {/* 系统ID - 所有用户可见 */}
          <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-xl border border-orange-100 dark:border-orange-900">
            <div className="text-sm text-muted-foreground mb-1">{t.dashboard.systemId}</div>
            <div className="text-xs font-mono text-card-foreground break-all">{user.id}</div>
          </div>
        </div>

        {/* 功能导航 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/projects">
            <div className="p-6 bg-gradient-to-br from-blue-50 dark:from-blue-950 to-white dark:to-card rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all cursor-pointer group">
              <div className="text-4xl mb-3">📁</div>
              <h3 className="text-lg font-bold text-card-foreground mb-1">{t.dashboard.projectManagement}</h3>
              <p className="text-sm text-muted-foreground">{t.dashboard.projectManagementDesc}</p>
              <Button variant="outline" className="w-full mt-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-950">
                {t.dashboard.viewMyProjects}
              </Button>
            </div>
          </Link>

          <Link href="/projects">
            <div className="p-6 bg-gradient-to-br from-green-50 dark:from-green-950 to-white dark:to-card rounded-xl border border-gray-200 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg transition-all cursor-pointer group">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="text-lg font-bold text-card-foreground mb-1">{t.dashboard.codeRepository}</h3>
              <p className="text-sm text-muted-foreground">{t.dashboard.codeRepositoryDesc}</p>
              <Button variant="outline" className="w-full mt-4 group-hover:bg-green-50 dark:group-hover:bg-green-950">
                {t.dashboard.openCodeEditor}
              </Button>
            </div>
          </Link>

          <Link href="/settings">
            <div className="p-6 bg-gradient-to-br from-purple-50 dark:from-purple-950 to-white dark:to-card rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg transition-all cursor-pointer group">
              <div className="text-4xl mb-3">⚙️</div>
              <h3 className="text-lg font-bold text-card-foreground mb-1">{t.dashboard.personalSettings}</h3>
              <p className="text-sm text-muted-foreground">{t.dashboard.personalSettingsDesc}</p>
              <Button variant="outline" className="w-full mt-4 group-hover:bg-purple-50 dark:group-hover:bg-purple-950">
                {t.dashboard.modifyPersonalInfo}
              </Button>
            </div>
          </Link>
        </div>

        {/* 系统状态 - 动态监控 (ECP-C3: 性能意识 - 实时健康检查) */}
        <SystemStatus />
      </div>
    </AppLayout>
  )
}
