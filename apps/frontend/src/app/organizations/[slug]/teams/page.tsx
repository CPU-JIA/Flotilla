'use client'

/**
 * 团队列表页面
 * ECP-A1: 单一职责 - 显示组织内的团队列表
 * ECP-C2: 系统化错误处理
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CreateTeamDialog } from '@/components/teams/create-team-dialog'
import { api, ApiError } from '@/lib/api'
import type { Team } from '@/types/team'
import type { Organization } from '@/types/organization'

export default function TeamsListPage() {
  const router = useRouter()
  const params = useParams()
  const organizationSlug = params?.slug as string
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()

  const [organization, setOrganization] = useState<Organization | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    if (!organizationSlug) return
    setLoading(true)
    setError('')
    try {
      const [orgData, teamsData] = await Promise.all([
        api.organizations.getBySlug(organizationSlug),
        api.teams.getAll(organizationSlug),
      ])
      setOrganization(orgData)
      setTeams(teamsData)
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
  }, [organizationSlug, router, t])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && organizationSlug) {
      fetchData()
    }
  }, [isAuthenticated, organizationSlug, fetchData])

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

  const canManage = organization?.myRole === 'OWNER' || organization?.myRole === 'ADMIN'

  return (
    <AppLayout>
      <div
        className="bg-card rounded-[14px] p-[22px]"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))',
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
        ) : (
          <div className="space-y-6">
            {/* 面包屑导航 */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/organizations" className="hover:text-foreground transition-colors">
                {t.organizations.title}
              </Link>
              <span>/</span>
              <Link
                href={`/organizations/${organizationSlug}`}
                className="hover:text-foreground transition-colors"
              >
                {organization?.name}
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">{t.teams.title}</span>
            </nav>

            {/* 页头 */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-card-foreground">{t.teams.title}</h2>
                <p className="text-muted-foreground mt-1">
                  {t.loading === t.loading
                    ? `${organization?.name} 的团队 - 共 ${teams.length} 个`
                    : `Teams of ${organization?.name} - ${teams.length} total`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/organizations/${organizationSlug}`)}
                >
                  {t.loading === t.loading ? '← 返回组织' : '← Back'}
                </Button>
                {canManage && teams.length > 0 && (
                  <CreateTeamDialog organizationSlug={organizationSlug} onSuccess={fetchData} />
                )}
              </div>
            </div>

            {/* 团队列表 */}
            {teams.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">
                    {t.teams.noTeams}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t.loading === t.loading
                      ? '创建您的第一个团队开始协作'
                      : 'Create your first team to start collaboration'}
                  </p>
                  {canManage && (
                    <CreateTeamDialog organizationSlug={organizationSlug} onSuccess={fetchData} />
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/organizations/${organizationSlug}/teams/${team.slug}`}
                  >
                    <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          {team.role && (
                            <Badge variant={team.role === 'MAINTAINER' ? 'default' : 'outline'}>
                              {t.teams.roles[team.role]}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {team.description ||
                            (t.loading === t.loading ? '暂无描述' : 'No description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>👥</span>
                            <span>
                              {team._count?.members || 0} {t.teams.members}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>🔑</span>
                            <span>
                              {team._count?.projectPermissions || 0} {t.teams.projects}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                          <span>📅</span>
                          <span>{new Date(team.createdAt).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="text-xs text-muted-foreground">{team.slug}</CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
