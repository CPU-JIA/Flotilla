'use client'

/**
 * 团队成员管理Tab
 * ECP-A1: 单一职责 - 显示和管理团队成员
 * ECP-C1: 防御性编程 - 权限检查和email验证
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/language-context'
import { api, ApiError } from '@/lib/api'
import type { TeamMember, TeamRole } from '@/types/team'

interface MembersTabProps {
  organizationSlug: string
  teamSlug: string
  canManage: boolean // MAINTAINER才能管理
  currentUserRole?: TeamRole
}

/**
 * 验证email格式
 * ECP-C1: 防御性编程
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function MembersTab({ organizationSlug, teamSlug, canManage }: MembersTabProps) {
  const { t } = useLanguage()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  // 添加成员表单状态
  const [showAddForm, setShowAddForm] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<TeamRole>('MEMBER')
  const [addError, setAddError] = useState('')

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const data = await api.teams.getMembers(organizationSlug, teamSlug)
      setMembers(data)
    } catch (err) {
      console.error('Failed to fetch members:', err)
      alert(err instanceof ApiError ? err.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [organizationSlug, teamSlug])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')

    // 前端验证
    const trimmedEmail = newMemberEmail.trim()
    if (!trimmedEmail) {
      setAddError(t.loading === t.loading ? '请输入邮箱地址' : 'Please enter email address')
      return
    }
    if (!isValidEmail(trimmedEmail)) {
      setAddError(t.loading === t.loading ? '邮箱格式不正确' : 'Invalid email format')
      return
    }

    setAddingMember(true)
    try {
      await api.teams.addMember(organizationSlug, teamSlug, {
        email: trimmedEmail,
        role: newMemberRole,
      })
      await fetchMembers()
      setNewMemberEmail('')
      setNewMemberRole('MEMBER')
      setShowAddForm(false)
      alert(t.loading === t.loading ? '成员添加成功' : 'Member added successfully')
    } catch (err) {
      if (err instanceof ApiError) {
        setAddError(err.message || t.error)
      } else {
        setAddError(t.editor.networkError)
      }
    } finally {
      setAddingMember(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: TeamRole) => {
    setUpdating(userId)
    try {
      await api.teams.updateMemberRole(organizationSlug, teamSlug, userId, { role: newRole })
      await fetchMembers()
      alert(t.teams.updateSuccess)
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
    const confirmMessage = t.loading === t.loading
      ? `确定要移除成员 ${username} 吗？`
      : `Remove member ${username}?`
    if (!confirm(confirmMessage)) return

    setRemoving(userId)
    try {
      await api.teams.removeMember(organizationSlug, teamSlug, userId)
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

  const getRoleBadge = (role: TeamRole) => {
    const roleConfig = {
      MAINTAINER: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      MEMBER: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' }
    }
    const config = roleConfig[role]
    return (
      <Badge variant="outline" className={config.color}>
        {t.teams.roles[role]}
      </Badge>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t.teams.members}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {t.loading === t.loading ? `共 ${members.length} 名成员` : `${members.length} members`}
          </p>
        </div>
        {canManage && !showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <span className="mr-2">+</span> {t.teams.addMember}
          </Button>
        )}
      </div>

      {/* 添加成员表单 */}
      {showAddForm && canManage && (
        <Card className="mb-6 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <Label>{t.loading === t.loading ? '成员邮箱' : 'Member Email'} *</Label>
                <Input
                  type="email"
                  placeholder={t.loading === t.loading ? '请输入组织成员的邮箱地址' : 'Enter organization member email'}
                  value={newMemberEmail}
                  onChange={(e) => {
                    setNewMemberEmail(e.target.value)
                    setAddError('')
                  }}
                  disabled={addingMember}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t.loading === t.loading
                    ? '注意：该用户必须已是组织成员'
                    : 'Note: User must already be an organization member'}
                </p>
              </div>

              <div>
                <Label>{t.teams.role} *</Label>
                <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as TeamRole)} disabled={addingMember}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAINTAINER">{t.teams.roles.MAINTAINER}</SelectItem>
                    <SelectItem value="MEMBER">{t.teams.roles.MEMBER}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {addError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                  {addError}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={addingMember || !newMemberEmail.trim()}>
                  {addingMember ? (t.loading === t.loading ? '添加中...' : 'Adding...') : t.teams.addMember}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewMemberEmail('')
                    setNewMemberRole('MEMBER')
                    setAddError('')
                  }}
                  disabled={addingMember}
                >
                  {t.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
              {t.teams.noMembers}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t.loading === t.loading ? '添加成员开始协作' : 'Add members to start collaboration'}
            </p>
            {canManage && !showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                {t.teams.addMember}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {members.map((member) => {
            if (!member.user) return null
            const isMaintainer = member.role === 'MAINTAINER'

            return (
              <Card key={member.userId} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
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

                    {canManage && (
                      <div className="flex items-center gap-3">
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateRole(member.userId, value as TeamRole)}
                          disabled={updating === member.userId}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MAINTAINER">{t.teams.roles.MAINTAINER}</SelectItem>
                            <SelectItem value="MEMBER">{t.teams.roles.MEMBER}</SelectItem>
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
                            ? (t.loading === t.loading ? '移除中...' : 'Removing...')
                            : t.teams.removeMember
                          }
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
