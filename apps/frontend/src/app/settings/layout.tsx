'use client'

/**
 * 设置页面布局
 * ECP-A1: 单一职责 - 提供统一的设置导航
 * ECP-B2: KISS原则 - 简洁的侧边栏设计
 */

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { useLanguage } from '@/contexts/language-context'
import {
  User,
  Settings,
  Smartphone,
  Bell,
  Shield,
  Key,
  Eye,
  Link2,
  ScrollText,
} from 'lucide-react'

const getSettingsNav = (language: 'zh' | 'en') => [
  {
    name: language === 'zh' ? '个人资料' : 'Profile',
    href: '/settings/profile',
    icon: User,
  },
  {
    name: language === 'zh' ? '通用设置' : 'General',
    href: '/settings/general',
    icon: Settings,
  },
  {
    name: language === 'zh' ? '通知偏好' : 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
  },
  {
    name: language === 'zh' ? '设备管理' : 'Devices',
    href: '/settings/devices',
    icon: Smartphone,
  },
  {
    name: language === 'zh' ? '双因素认证' : '2FA',
    href: '/settings/2fa',
    icon: Shield,
  },
  {
    name: language === 'zh' ? '访问令牌' : 'Tokens',
    href: '/settings/tokens',
    icon: Key,
  },
  {
    name: language === 'zh' ? '隐私设置' : 'Privacy',
    href: '/settings/privacy',
    icon: Eye,
  },
  {
    name: language === 'zh' ? '关联账户' : 'Accounts',
    href: '/settings/accounts',
    icon: Link2,
  },
  {
    name: language === 'zh' ? '审计日志' : 'Audit Logs',
    href: '/settings/audit-logs',
    icon: ScrollText,
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { language } = useLanguage()
  const settingsNav = getSettingsNav(language)

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {language === 'zh' ? '设置' : 'Settings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'zh' ? '管理您的账户设置和偏好' : 'Manage your account settings and preferences'}
          </p>
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
