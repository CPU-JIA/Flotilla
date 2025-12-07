'use client'

/**
 * 设置页面布局
 * ECP-A1: 单一职责 - 提供统一的设置导航
 * ECP-B2: KISS原则 - 简洁的侧边栏设计
 */

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { User, Settings, Smartphone } from 'lucide-react'

const settingsNav = [
  {
    name: '个人资料',
    href: '/settings/profile',
    icon: User,
  },
  {
    name: '通用设置',
    href: '/settings/general',
    icon: Settings,
  },
  {
    name: '设备管理',
    href: '/settings/devices',
    icon: Smartphone,
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">设置</h1>
          <p className="text-muted-foreground mt-1">管理您的账户设置和偏好</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 侧边栏导航 */}
          <aside className="col-span-12 md:col-span-3">
            <nav className="space-y-1">
              {settingsNav.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600'
                          : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* 内容区域 */}
          <main className="col-span-12 md:col-span-9">{children}</main>
        </div>
      </div>
    </AppLayout>
  )
}
