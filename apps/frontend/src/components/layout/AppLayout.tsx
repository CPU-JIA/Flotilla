'use client'

/**
 * 全局应用布局组件
 * 统一的导航栏 + 径向渐变背景
 * ECP-A1: 单一职责 - 统一布局管理
 */

import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(1200px 600px at 10% -10%, #dbeafe 0%, transparent 60%),
          radial-gradient(1200px 600px at 110% 10%, #fde68a 0%, transparent 60%),
          #f4f6f9
        `
      }}
    >
      {/* 顶部导航栏 */}
      <header className="border-b border-gray-200/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/dashboard">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer">
                  Cloud Dev Platform
                </h1>
              </Link>
              <nav className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  首页
                </Link>
                <Link
                  href="/projects"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  项目
                </Link>
                {user?.role === 'SUPER_ADMIN' && (
                  <Link
                    href="/admin"
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    管理员
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{user.username}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={logout}>
                退出
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
