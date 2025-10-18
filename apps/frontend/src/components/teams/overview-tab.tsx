'use client'

/**
 * 团队概览Tab
 * ECP-A1: 单一职责 - 显示团队基本信息
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/language-context'
import type { Team } from '@/types/team'

interface OverviewTabProps {
  team: Team
}

export function OverviewTab({ team }: OverviewTabProps) {
  const { t } = useLanguage()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.teams.overview}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {t.teams.name}
          </h4>
          <p className="text-gray-900 dark:text-gray-100">{team.name}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {t.teams.description}
          </h4>
          <p className="text-gray-900 dark:text-gray-100">
            {team.description || (t.loading === t.loading ? '暂无描述' : 'No description')}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {t.loading === t.loading ? '您的角色' : 'Your Role'}
          </h4>
          {team.role ? (
            <Badge variant={team.role === 'MAINTAINER' ? 'default' : 'outline'}>
              {t.teams.roles[team.role]}
            </Badge>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              {t.loading === t.loading ? '无角色' : 'No role'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              {t.teams.memberCount}
            </h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {team._count?.members || 0}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              {t.loading === t.loading ? '项目权限数' : 'Project Permissions'}
            </h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {team._count?.projectPermissions || 0}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {t.loading === t.loading ? '创建时间' : 'Created At'}
          </h4>
          <p className="text-gray-900 dark:text-gray-100">
            {new Date(team.createdAt).toLocaleString()}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {t.loading === t.loading ? '最后更新' : 'Last Updated'}
          </h4>
          <p className="text-gray-900 dark:text-gray-100">
            {new Date(team.updatedAt).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
