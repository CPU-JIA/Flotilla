'use client'

/**
 * 团队详情页面
 * ECP-A1: 单一职责 - 显示团队详情和管理
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
import { OverviewTab } from '@/components/teams/overview-tab'
import { MembersTab } from '@/components/teams/members-tab'
import { PermissionsTab } from '@/components/teams/permissions-tab'
import { SettingsTab } from '@/components/teams/settings-tab'
import { api, ApiError } from '@/lib/api'
import type { Team } from '@/types/team'

export default function TeamDetailPage() {
  const router = useRouter()
  const params = useParams()
  const organizationSlug = params?.slug as string
  const teamSlug = params?.teamSlug as string
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()

  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTeam = useCallback(async () => {
    if (!organizationSlug || !teamSlug) return
    setLoading(true)
    setError('')
    try {
      const data = await api.teams.getBySlug(organizationSlug, teamSlug)
      setTeam(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t.error)
        if (err.status === 403 || err.status === 404) {
          setTimeout(() => router.push(`/organizations/${organizationSlug}/teams`), 2000)
        }
      } else {
        setError(t.editor.networkError)
      }
    } finally {
      setLoading(false)
    }
  }, [organizationSlug, teamSlug, router, t])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && organizationSlug && teamSlug) {
      fetchTeam()
    }
  }, [isAuthenticated, organizationSlug, teamSlug, fetchTeam])

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

  const isMaintainer = team?.role === 'MAINTAINER'

  return (
    <AppLayout>
      <div
        className="bg-white rounded-[14px] p-[22px]"
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
            <Button onClick={() => router.push(`/organizations/${organizationSlug}/teams`)} className="mt-4">
              {t.loading === t.loading ? '返回团队列表' : 'Back to Teams'}
            </Button>
          </div>
        ) : team ? (
          <div className="space-y-8">
            {/* 页头 */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {team.name}
                    </h1>
                    {team.role && (
                      <Badge variant={team.role === 'MAINTAINER' ? 'default' : 'outline'}>
                        {t.teams.roles[team.role]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-base">
                    {team.description || (t.loading === t.loading ? '暂无描述' : 'No description')}
                  </p>
                </div>
                <Button variant="outline" onClick={() => router.push(`/organizations/${organizationSlug}/teams`)}>
                  {t.loading === t.loading ? '← 返回列表' : '← Back'}
                </Button>
              </div>

              {/* 统计信息卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t.teams.slug}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔖</span>
                      <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {team.slug}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t.teams.members}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {team._count?.members || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t.teams.projects}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔑</span>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {team._count?.projectPermissions || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tabs内容区 */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">{t.teams.overview}</TabsTrigger>
                <TabsTrigger value="members">{t.teams.members}</TabsTrigger>
                <TabsTrigger value="permissions">{t.teams.permissions}</TabsTrigger>
                <TabsTrigger value="settings" disabled={!isMaintainer}>
                  {t.teams.settings}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <OverviewTab team={team} />
              </TabsContent>

              <TabsContent value="members" className="mt-6">
                <MembersTab
                  organizationSlug={organizationSlug}
                  teamSlug={team.slug}
                  canManage={isMaintainer}
                  currentUserRole={team.role}
                />
              </TabsContent>

              <TabsContent value="permissions" className="mt-6">
                <PermissionsTab
                  organizationSlug={organizationSlug}
                  teamSlug={team.slug}
                  canManage={isMaintainer}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <SettingsTab
                  organizationSlug={organizationSlug}
                  team={team}
                  onUpdate={fetchTeam}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
