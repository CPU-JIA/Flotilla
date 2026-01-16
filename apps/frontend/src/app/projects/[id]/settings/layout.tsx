'use client'

/**
 * Project Settings Layout
 * ECP-A1: 单一职责 - Settings页面统一布局和侧边栏导航
 * ECP-B3: 清晰命名 - 语义化路由和组件
 */

import { useEffect, useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api, ApiError } from '@/lib/api'
import type { Project } from '@/types/project'

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const projectId = params?.id as string
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 获取项目信息（验证权限）
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (!projectId || !isAuthenticated) return

    const fetchProject = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await api.projects.getById(projectId)
        setProject(data)

        // 权限验证：只有OWNER可以访问Settings
        if (data.ownerId !== user?.id && user?.role !== 'SUPER_ADMIN') {
          setError('您没有权限访问此项目设置')
          setTimeout(() => router.push(`/projects/${projectId}`), 2000)
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || t.projects.detail.fetchError)
          if (err.status === 403 || err.status === 404) {
            setTimeout(() => router.push('/projects'), 2000)
          }
        } else {
          setError(t.projects.detail.networkError)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [authLoading, isAuthenticated, projectId, router, user, t])

  // 侧边栏导航项
  const navItems = [
    {
      id: 'general',
      label: t.projects.settings.general,
      href: `/projects/${projectId}/settings/general`,
      icon: '⚙️',
    },
    {
      id: 'pull-requests',
      label: t.projects.settings.pullRequests || 'Pull Requests',
      href: `/projects/${projectId}/settings/pull-requests`,
      icon: '🔀',
    },
    {
      id: 'branch-protection',
      label: t.projects.settings.branchProtection || 'Branch Protection',
      href: `/projects/${projectId}/settings/branch-protection`,
      icon: '🛡️',
    },
    {
      id: 'members',
      label: t.projects.settings.members,
      href: `/projects/${projectId}/settings/members`,
      icon: '👥',
    },
    {
      id: 'danger',
      label: t.projects.settings.dangerZone,
      href: `/projects/${projectId}/settings/danger`,
      icon: '⚠️',
    },
  ]

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div
          className="bg-card rounded-[14px] p-[22px]"
          style={{
            boxShadow: '10px 10px 15px black',
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))',
          }}
        >
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">{error}</h3>
            <Button onClick={() => router.push('/projects')} className="mt-4">
              {t.projects.detail.backToList}
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!project) return null

  return (
    <AppLayout>
      <div
        className="bg-card rounded-[14px] p-[22px]"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))',
        }}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-card-foreground">{t.projects.settings.title}</h1>
            <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
              {t.projects.settings.backToProject}
            </Button>
          </div>
          <p className="text-muted-foreground">
            {project.name} - {project.description || t.projects.noDescription}
          </p>
        </div>

        {/* Layout: Sidebar + Content */}
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link key={item.id} href={item.href}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer',
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground hover:text-card-foreground'
                      )}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* Content Area */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </AppLayout>
  )
}
