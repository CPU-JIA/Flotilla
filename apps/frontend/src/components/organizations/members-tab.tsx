'use client'

/**
 * 组织成员管理Tab
 * ECP-A1: 单一职责 - 显示和管理组织成员
 * ECP-C1: 防御性编程 - 权限检查
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/language-context'
import { AddOrganizationMemberDialog } from './add-organization-member-dialog'
import { api, ApiError } from '@/lib/api'
import type { OrganizationMember, OrgRole } from '@/types/organization'

interface MembersTabProps {
  organizationSlug: string
  canManage: boolean // OWNER或ADMIN才能管理
  currentUserRole?: OrgRole
}

export function MembersTab({ organizationSlug, canManage, currentUserRole }: MembersTabProps) {
  const { t } = useLanguage()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.organizations.getMembers(organizationSlug)
      setMembers(data)
    } catch (err) {
      console.error('Failed to fetch members:', err)
      alert(err instanceof ApiError ? err.message : t.error)
    } finally {
      setLoading(false)
    }
  }, [organizationSlug, t.error])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleUpdateRole = async (userId: string, newRole: OrgRole) => {
    setUpdating(userId)
    try {
      await api.organizations.updateMemberRole(organizationSlug, userId, { role: newRole })
      await fetchMembers()
      alert(t.organizations.updateSuccess)
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || t.error)
      } else {
        alert(t.editor.networkError)
      }
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveMember = async (userId: string, username: string) => {
    const confirmMessage =
      t.loading === t.loading ? `确定要移除成员 ${username} 吗？` : `Remove member ${username}?`
    if (!confirm(confirmMessage)) return

    setRemoving(userId)
    try {
      await api.organizations.removeMember(organizationSlug, userId)
      await fetchMembers()
      alert(t.loading === t.loading ? '成员已移除' : 'Member removed')
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || t.error)
      } else {
        alert(t.editor.networkError)
      }
    } finally {
      setRemoving(null)
    }
  }

  const getRoleBadge = (role: OrgRole) => {
    const roleConfig = {
      OWNER: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      ADMIN: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      MEMBER: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    }
    const config = roleConfig[role]
    return (
      <Badge variant="outline" className={config.color}>
        {t.organizations.roles[role]}
      </Badge>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t.organizations.members}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {t.loading === t.loading ? `共 ${members.length} 名成员` : `${members.length} members`}
          </p>
        </div>
        {canManage && (
          <AddOrganizationMemberDialog
            organizationSlug={organizationSlug}
            onSuccess={fetchMembers}
          />
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t.organizations.noMembers}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t.loading === t.loading
                ? '邀请成员加入组织开始协作'
                : 'Invite members to start collaboration'}
            </p>
            {canManage && (
              <AddOrganizationMemberDialog
                organizationSlug={organizationSlug}
                onSuccess={fetchMembers}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {members.map((member) => {
            if (!member.user) return null
            const isOwner = member.role === 'OWNER'
            const canModifyThisMember = canManage && !isOwner && currentUserRole === 'OWNER'

            return (
              <Card key={member.userId} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                        {member.user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {member.user.username}
                          </p>
                          {getRoleBadge(member.role)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          📧 {member.user.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          📅 {t.loading === t.loading ? '加入于' : 'Joined'}{' '}
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {canModifyThisMember && (
                      <div className="flex items-center gap-3">
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleUpdateRole(member.userId, value as OrgRole)
                          }
                          disabled={updating === member.userId}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">{t.organizations.roles.ADMIN}</SelectItem>
                            <SelectItem value="MEMBER">{t.organizations.roles.MEMBER}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          onClick={() => handleRemoveMember(member.userId, member.user!.username)}
                          disabled={removing === member.userId}
                        >
                          {removing === member.userId
                            ? t.loading === t.loading
                              ? '移除中...'
                              : 'Removing...'
                            : t.organizations.removeMember}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
