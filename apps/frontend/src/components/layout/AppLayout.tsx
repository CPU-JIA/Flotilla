'use client'

/**
 * 全局应用布局组件
 * 统一的导航栏 + 径向渐变背景
 * ECP-A1: 单一职责 - 统一布局管理
 * 新增: Light/Dark主题切换 + 中文/英文语言切换
 */

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Languages } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  return (
    <div
      className="min-h-screen transition-colors"
      style={{
        background: theme === 'dark'
          ? `
            radial-gradient(1200px 600px at 10% -10%, #1e3a8a 0%, transparent 60%),
            radial-gradient(1200px 600px at 110% 10%, #78350f 0%, transparent 60%),
            #111827
          `
          : `
            radial-gradient(1200px 600px at 10% -10%, #dbeafe 0%, transparent 60%),
            radial-gradient(1200px 600px at 110% 10%, #fde68a 0%, transparent 60%),
            #f4f6f9
          `
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
              {/* 主题切换按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 p-0"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {/* 语言切换按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                className="gap-1 px-3"
                title={language === 'zh' ? 'Switch to English' : '切换到中文'}
              >
                <Languages className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {language === 'zh' ? 'EN' : '中'}
                </span>
              </Button>

              {user && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">{user.username}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={logout}>
                {t.nav.logout}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
