'use client'

/**
 * 组织团队管理Tab
 * ECP-A1: 单一职责 - 显示和管理组织内的团队
 * ECP-C2: 系统化错误处理
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateTeamDialog } from '@/components/teams/create-team-dialog'
import { useLanguage } from '@/contexts/language-context'
import { api, ApiError } from '@/lib/api'
import type { Team } from '@/types/team'

interface TeamsTabProps {
  organizationSlug: string
  canManage: boolean // OWNER或ADMIN才能创建团队
}

export function TeamsTab({ organizationSlug, canManage }: TeamsTabProps) {
  const { t } = useLanguage()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const data = await api.teams.getAll(organizationSlug)
      setTeams(data)
    } catch (err) {
      console.error('Failed to fetch teams:', err)
      alert(err instanceof ApiError ? err.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationSlug])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.teams.title}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {t.loading === t.loading ? `共 ${teams.length} 个团队` : `${teams.length} teams`}
          </p>
        </div>
        {canManage && teams.length > 0 && (
          <CreateTeamDialog organizationSlug={organizationSlug} onSuccess={fetchTeams} />
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mt-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t.teams.noTeams}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t.loading === t.loading
                ? '创建您的第一个团队开始协作'
                : 'Create your first team to start collaboration'}
            </p>
            {canManage && (
              <CreateTeamDialog organizationSlug={organizationSlug} onSuccess={fetchTeams} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Link key={team.id} href={`/organizations/${organizationSlug}/teams/${team.slug}`}>
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
                    {team.description || (t.loading === t.loading ? '暂无描述' : 'No description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-500 mt-2">
                    <span>📅</span>
                    <span>{new Date(team.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-gray-500 dark:text-gray-500">
                  {team.slug}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
