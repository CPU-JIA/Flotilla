'use client'

/**
 * Members Management Page
 * ECP-A1: 单一职责 - 项目成员管理
 * ECP-C1: 防御性编程 - 权限验证和错误处理
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
// Table component removed - using native HTML table instead
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddMemberDialog } from '@/components/projects/add-member-dialog'
import { api, ApiError } from '@/lib/api'

interface ProjectMember {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    username: string
    email: string
  }
}

export default function MembersManagementPage() {
  const params = useParams()
  const projectId = params?.id as string
  const { user } = useAuth()
  const { t } = useLanguage()

  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [ownerId, setOwnerId] = useState<string>('')

  // 获取项目成员列表
  const fetchMembers = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      // 获取项目信息（获取ownerId）
      const project = await api.projects.getById(projectId)
      setOwnerId(project.ownerId)

      // 获取成员列表
      const data = await api.projects.getMembers(projectId)
      setMembers(data)
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // 更改成员角色
  const handleChangeRole = async (memberId: string, newRole: 'OWNER' | 'MAINTAINER' | 'MEMBER' | 'VIEWER') => {
    if (!projectId) return

    if (!confirm(t.projects.settings.changeRole + '?')) return

    try {
      await api.projects.updateMemberRole(projectId, memberId, newRole)
      alert(t.projects.settings.removeSuccess)
      fetchMembers()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.projects.settings.removeFailed}: ${err.message}`)
      } else {
        alert(t.projects.settings.removeFailed)
      }
    }
  }

  // 移除成员
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!projectId) return

    if (!confirm(t.projects.settings.removeMemberConfirm)) return

    try {
      await api.projects.removeMember(projectId, memberId)
      alert(t.projects.settings.removeSuccess)
      fetchMembers()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.projects.settings.removeFailed}: ${err.message}`)
      } else {
        alert(t.projects.settings.removeFailed)
      }
    }
  }

  // 角色显示
  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      OWNER: { label: t.projects.settings.roleOwner, variant: 'default' },
      MAINTAINER: { label: t.projects.settings.roleMaintainer, variant: 'secondary' },
      MEMBER: { label: t.projects.settings.roleMember, variant: 'outline' },
      VIEWER: { label: t.projects.settings.roleViewer, variant: 'outline' },
    }
    const roleInfo = roleMap[role] || { label: role, variant: 'outline' }
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const isOwner = ownerId === user?.id
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const canManage = isOwner || isSuperAdmin

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t.projects.settings.membersList}</CardTitle>
            <CardDescription>
              {t.projects.settings.membersList} - {members.length} {t.projects.settings.members}
            </CardDescription>
          </div>
          {canManage && <AddMemberDialog projectId={projectId} onSuccess={fetchMembers} />}
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              {t.projects.settings.noMembers}
            </h3>
            <p className="text-muted-foreground mb-4">{t.projects.settings.noMembersDesc}</p>
            {canManage && <AddMemberDialog projectId={projectId} onSuccess={fetchMembers} />}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                    {t.projects.settings.memberName}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                    {t.projects.settings.memberRole}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                    {t.projects.settings.memberJoinedAt}
                  </th>
                  {canManage && (
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      {t.projects.settings.memberActions}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isCurrentUser = member.user.id === user?.id
                  const isMemberOwner = member.user.id === ownerId
                  return (
                    <tr key={member.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">
                        {member.user.username}
                        {isCurrentUser && (
                          <Badge variant="outline" className="ml-2">
                            You
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{member.user.email}</td>
                      <td className="py-3 px-4">
                        {canManage && !isMemberOwner ? (
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => handleChangeRole(member.user.id, newRole as 'OWNER' | 'MAINTAINER' | 'MEMBER' | 'VIEWER')}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="VIEWER">
                                👁️ {t.projects.settings.roleViewer}
                              </SelectItem>
                              <SelectItem value="MEMBER">
                                👤 {t.projects.settings.roleMember}
                              </SelectItem>
                              <SelectItem value="MAINTAINER">
                                🔧 {t.projects.settings.roleMaintainer}
                              </SelectItem>
                              <SelectItem value="OWNER">
                                👑 {t.projects.settings.roleOwner}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          getRoleBadge(member.role)
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          {!isMemberOwner && !isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.user.id, member.user.username)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              🗑️ {t.projects.settings.removeMember}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
