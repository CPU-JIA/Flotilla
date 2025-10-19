'use client'

/**
 * 组织详情页面
 * ECP-A1: 单一职责 - 显示组织详情和管理
 * ECP-C2: 系统化错误处理
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MembersTab } from '@/components/organizations/members-tab'
import { TeamsTab } from '@/components/organizations/teams-tab'
import { SettingsTab } from '@/components/organizations/settings-tab'
import { api, ApiError } from '@/lib/api'
import type { Organization } from '@/types/organization'

export default function OrganizationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()

  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrganization = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError('')
    try {
      const data = await api.organizations.getBySlug(slug)
      setOrganization(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t.error)
        if (err.status === 403 || err.status === 404) {
          setTimeout(() => router.push('/organizations'), 2000)
        }
      } else {
        setError(t.editor.networkError)
      }
    } finally {
      setLoading(false)
    }
  }, [slug, router, t])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && slug) {
      fetchOrganization()
    }
  }, [isAuthenticated, slug, fetchOrganization])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      </div>
    )
  }

  const isOwner = organization?.myRole === 'OWNER'
  const isAdmin = organization?.myRole === 'ADMIN'
  const canManage = isOwner || isAdmin

  return (
    <AppLayout>
      <div
        className="bg-card rounded-[14px] p-[22px]"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'
        }}
      >
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">{t.loading}</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{error}</h3>
            <Button onClick={() => router.push('/organizations')} className="mt-4">
              {t.loading === t.loading ? '返回组织列表' : 'Back to Organizations'}
            </Button>
          </div>
        ) : organization ? (
          <div className="space-y-8">
            {/* 页头 */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {organization.name}
                    </h1>
                    {organization.isPersonal && (
                      <Badge variant="outline">
                        {t.organizations.personal}
                      </Badge>
                    )}
                    {organization.myRole && (
                      <Badge variant={
                        organization.myRole === 'OWNER' ? 'default' :
                        organization.myRole === 'ADMIN' ? 'secondary' :
                        'outline'
                      }>
                        {t.organizations.roles[organization.myRole]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-base">
                    {organization.description || (t.loading === t.loading ? '暂无描述' : 'No description')}
                  </p>
                </div>
                <Button variant="outline" onClick={() => router.push('/organizations')}>
                  {t.loading === t.loading ? '← 返回列表' : '← Back'}
                </Button>
              </div>

              {/* 统计信息卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t.organizations.slug}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔖</span>
                      <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {organization.slug}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t.organizations.members}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {organization._count?.members || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t.loading === t.loading ? '创建时间' : 'Created At'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📅</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {new Date(organization.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tabs内容区 */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">{t.organizations.overview}</TabsTrigger>
                <TabsTrigger value="members">{t.organizations.members}</TabsTrigger>
                <TabsTrigger value="teams">{t.teams.title}</TabsTrigger>
                <TabsTrigger value="settings" disabled={!canManage}>
                  {t.organizations.settings}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t.organizations.overview}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {t.organizations.name}
                      </h4>
                      <p className="text-gray-900 dark:text-gray-100">{organization.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {t.organizations.description}
                      </h4>
                      <p className="text-gray-900 dark:text-gray-100">
                        {organization.description || (t.loading === t.loading ? '暂无描述' : 'No description')}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {t.loading === t.loading ? '组织类型' : 'Organization Type'}
                      </h4>
                      <Badge variant={organization.isPersonal ? 'outline' : 'default'}>
                        {organization.isPersonal
                          ? t.organizations.personal
                          : (t.loading === t.loading ? '团队组织' : 'Team Organization')
                        }
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members" className="mt-6">
                <MembersTab
                  organizationSlug={organization.slug}
                  canManage={canManage}
                  currentUserRole={organization.myRole}
                />
              </TabsContent>

              <TabsContent value="teams" className="mt-6">
                <TeamsTab
                  organizationSlug={organization.slug}
                  canManage={canManage}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <SettingsTab organization={organization} onUpdate={fetchOrganization} />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
