'use client'

/**
 * 全局应用布局组件
 * 统一的导航栏 + 径向渐变背景
 * ECP-A1: 单一职责 - 统一布局管理
 * 新增: Light/Dark主题切换 + 中文/英文语言切换
 * 更新: 使用增强的ThemeToggle和LanguageToggle组件
 */

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageToggle } from '@/components/language/language-toggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { UserMenu } from '@/components/layout/UserMenu'
import { useMantineThemeSync } from '@/hooks/use-mantine-theme-sync'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { t } = useLanguage()

  // 同步Mantine主题
  useMantineThemeSync()

  return (
    <div
      className="min-h-screen transition-colors"
      style={{
        background:
          theme === 'dark'
            ? `
            radial-gradient(1200px 600px at 10% -10%, #1e3a8a 0%, transparent 60%),
            radial-gradient(1200px 600px at 110% 10%, #78350f 0%, transparent 60%),
            #111827
          `
            : `
            radial-gradient(1200px 600px at 10% -10%, #dbeafe 0%, transparent 60%),
            radial-gradient(1200px 600px at 110% 10%, #fde68a 0%, transparent 60%),
            #f4f6f9
          `,
      }}
    >
      {/* 顶部导航栏 */}
      <header className="border-b border-gray-200/30 backdrop-blur-sm bg-white/50 dark:bg-gray-900/50 dark:border-gray-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/dashboard">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer">
                  {t.appName}
                </h1>
              </Link>
              <nav className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white font-medium transition-colors"
                >
                  {t.nav.dashboard}
                </Link>
                <Link
                  href="/projects"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white font-medium transition-colors"
                >
                  {t.nav.projects}
                </Link>
                <Link
                  href="/organizations"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white font-medium transition-colors"
                >
                  {t.nav.organizations}
                </Link>
                {user?.role === 'SUPER_ADMIN' && (
                  <Link
                    href="/admin"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white font-medium transition-colors"
                  >
                    {t.nav.admin}
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {/* 通知铃铛 */}
              <NotificationBell />

              {/* 主题切换按钮 */}
              <ThemeToggle size="sm" variant="outline" />

              {/* 语言切换按钮 */}
              <LanguageToggle size="sm" variant="outline" showFullName />

              {/* 🔒 Phase 2 FIX: 用户菜单下拉框（包含设备管理、设置、登出） */}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
