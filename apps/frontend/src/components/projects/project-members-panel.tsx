'use client'

/**
 * 项目成员管理面板
 * ECP-A1: 单一职责 - 显示和管理项目成员
 * ECP-C1: 防御性编程 - 权限检查
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InviteMemberDialog } from './invite-member-dialog'
import { api, ApiError } from '@/lib/api'
import type { ProjectMember } from '@/types/project'

interface ProjectMembersPanelProps {
  projectId: string
  members: ProjectMember[]
  canManageMembers: boolean
  onMembersChange: () => void
}

export function ProjectMembersPanel({
  projectId,
  members,
  canManageMembers,
  onMembersChange,
}: ProjectMembersPanelProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      await api.projects.updateMemberRole(
        projectId,
        userId,
        newRole as 'OWNER' | 'MEMBER' | 'VIEWER'
      )
      onMembersChange()
      alert('成员角色已更新')
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || '更新角色失败')
      } else {
        alert('网络错误，请稍后重试')
      }
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveMember = async (userId: string, username: string) => {
    if (!confirm(`确定要移除成员 ${username} 吗？`)) return

    setRemoving(userId)
    try {
      await api.projects.removeMember(projectId, userId)
      onMembersChange()
      alert('成员已移除')
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || '移除成员失败')
      } else {
        alert('网络错误，请稍后重试')
      }
    } finally {
      setRemoving(null)
    }
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      OWNER: {
        label: '所有者',
        color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400',
      },
      MEMBER: {
        label: '成员',
        color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400',
      },
      VIEWER: {
        label: '观察者',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
      },
    }
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.VIEWER
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">项目成员</h2>
          <p className="text-muted-foreground text-sm mt-1">共 {members.length} 名成员</p>
        </div>
        {canManageMembers && (
          <InviteMemberDialog projectId={projectId} onSuccess={onMembersChange} />
        )}
      </div>

      <div className="space-y-4">
        {members.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">暂无成员</h3>
              <p className="text-muted-foreground mb-4">邀请团队成员加入项目开始协作</p>
              {canManageMembers && (
                <InviteMemberDialog projectId={projectId} onSuccess={onMembersChange} />
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {members.map((member) => {
              if (!member.user) return null
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
                            <p className="font-semibold text-card-foreground">
                              {member.user.username}
                            </p>
                            {getRoleBadge(member.role)}
                          </div>
                          <p className="text-sm text-muted-foreground">📧 {member.user.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            📅 加入于 {new Date(member.joinedAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>

                      {canManageMembers && member.role !== 'OWNER' && (
                        <div className="flex items-center gap-3">
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleUpdateRole(member.userId, value)}
                            disabled={updating === member.userId}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">成员</SelectItem>
                              <SelectItem value="VIEWER">观察者</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleRemoveMember(member.userId, member.user!.username)}
                            disabled={removing === member.userId}
                          >
                            {removing === member.userId ? '移除中...' : '移除'}
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
    </div>
  )
}
