'use client'

/**
 * 团队项目权限管理Tab
 * ECP-A1: 单一职责 - 管理团队的项目访问权限
 * ECP-C1: 防御性编程 - 权限级别验证
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/language-context'
import { api, ApiError } from '@/lib/api'
import type { TeamProjectPermission } from '@/types/team'

type PermissionLevel = 'READ' | 'WRITE' | 'ADMIN'

interface PermissionsTabProps {
  organizationSlug: string
  teamSlug: string
  canManage: boolean // MAINTAINER才能管理
}

export function PermissionsTab({ organizationSlug, teamSlug, canManage }: PermissionsTabProps) {
  const { t } = useLanguage()
  const [permissions, setPermissions] = useState<TeamProjectPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  // 添加权限表单状态
  const [showAddForm, setShowAddForm] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [newProjectId, setNewProjectId] = useState('')
  const [newPermission, setNewPermission] = useState<PermissionLevel>('READ')
  const [addError, setAddError] = useState('')

  const fetchPermissions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.teams.getPermissions(organizationSlug, teamSlug)
      setPermissions(data)
    } catch (err) {
      console.error('Failed to fetch permissions:', err)
      alert(err instanceof ApiError ? err.message : t.error)
    } finally {
      setLoading(false)
    }
  }, [organizationSlug, teamSlug, t.error])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const handleAssignPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')

    // 前端验证
    const trimmedProjectId = newProjectId.trim()
    if (!trimmedProjectId) {
      setAddError(t.loading === t.loading ? '请输入项目ID' : 'Please enter project ID')
      return
    }

    setAssigning(true)
    try {
      await api.teams.assignPermission(organizationSlug, teamSlug, {
        projectId: trimmedProjectId,
        permission: newPermission,
      })
      await fetchPermissions()
      setNewProjectId('')
      setNewPermission('READ')
      setShowAddForm(false)
      alert(t.loading === t.loading ? '权限分配成功' : 'Permission assigned successfully')
    } catch (err) {
      if (err instanceof ApiError) {
        setAddError(err.message || t.error)
      } else {
        setAddError(t.editor.networkError)
      }
    } finally {
      setAssigning(false)
    }
  }

  const handleUpdatePermission = async (projectId: string, newPermission: PermissionLevel) => {
    setUpdating(projectId)
    try {
      await api.teams.updatePermission(organizationSlug, teamSlug, projectId, {
        permission: newPermission,
      })
      await fetchPermissions()
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

  const handleRevokePermission = async (projectId: string, projectName: string) => {
    const confirmMessage =
      t.loading === t.loading
        ? `确定要撤销项目 "${projectName}" 的访问权限吗？`
        : `Revoke access to project "${projectName}"?`
    if (!confirm(confirmMessage)) return

    setRevoking(projectId)
    try {
      await api.teams.revokePermission(organizationSlug, teamSlug, projectId)
      await fetchPermissions()
      alert(t.loading === t.loading ? '权限已撤销' : 'Permission revoked')
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || t.error)
      } else {
        alert(t.editor.networkError)
      }
    } finally {
      setRevoking(null)
    }
  }

  const getPermissionBadge = (permission: PermissionLevel) => {
    const permissionConfig = {
      READ: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', icon: '👁️' },
      WRITE: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '✏️' },
      ADMIN: {
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        icon: '🔑',
      },
    }
    const config = permissionConfig[permission]
    return (
      <Badge variant="outline" className={config.color}>
        <span className="mr-1">{config.icon}</span>
        {t.teams.permissionLevels[permission]}
      </Badge>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t.teams.permissions}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {t.loading === t.loading
              ? `共 ${permissions.length} 个项目权限`
              : `${permissions.length} project permissions`}
          </p>
        </div>
        {canManage && !showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <span className="mr-2">+</span> {t.teams.assignPermission}
          </Button>
        )}
      </div>

      {/* 添加权限表单 */}
      {showAddForm && canManage && (
        <Card className="mb-6 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <form onSubmit={handleAssignPermission} className="space-y-4">
              <div>
                <Label>{t.loading === t.loading ? '项目ID' : 'Project ID'} *</Label>
                <Input
                  type="text"
                  placeholder={
                    t.loading === t.loading
                      ? '请输入项目ID（如：123e4567-e89b-12d3-a456-426614174000）'
                      : 'Enter project ID (e.g., 123e4567-e89b-12d3-a456-426614174000)'
                  }
                  value={newProjectId}
                  onChange={(e) => {
                    setNewProjectId(e.target.value)
                    setAddError('')
                  }}
                  disabled={assigning}
                  className="mt-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t.loading === t.loading
                    ? '提示：项目必须属于当前组织'
                    : 'Note: Project must belong to current organization'}
                </p>
              </div>

              <div>
                <Label>{t.loading === t.loading ? '权限级别' : 'Permission Level'} *</Label>
                <Select
                  value={newPermission}
                  onValueChange={(v) => setNewPermission(v as PermissionLevel)}
                  disabled={assigning}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="READ">
                      👁️ {t.teams.permissionLevels.READ} -{' '}
                      {t.loading === t.loading ? '只读访问' : 'Read-only access'}
                    </SelectItem>
                    <SelectItem value="WRITE">
                      ✏️ {t.teams.permissionLevels.WRITE} -{' '}
                      {t.loading === t.loading ? '读写访问' : 'Read and write access'}
                    </SelectItem>
                    <SelectItem value="ADMIN">
                      🔑 {t.teams.permissionLevels.ADMIN} -{' '}
                      {t.loading === t.loading ? '完全控制' : 'Full control'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {addError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                  {addError}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={assigning || !newProjectId.trim()}>
                  {assigning
                    ? t.loading === t.loading
                      ? '分配中...'
                      : 'Assigning...'
                    : t.teams.assignPermission}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewProjectId('')
                    setNewPermission('READ')
                    setAddError('')
                  }}
                  disabled={assigning}
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
      ) : permissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🔑</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t.loading === t.loading ? '暂无项目权限' : 'No project permissions'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t.loading === t.loading
                ? '为团队分配项目访问权限'
                : 'Assign project access permissions to the team'}
            </p>
            {canManage && !showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>{t.teams.assignPermission}</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {permissions.map((perm) => {
            if (!perm.project) return null

            return (
              <Card key={perm.projectId} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                        📁
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {perm.project.name}
                          </p>
                          {getPermissionBadge(perm.permission)}
                        </div>
                        {perm.project.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                            {perm.project.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          🔖 ID: <span className="font-mono">{perm.projectId.slice(0, 8)}...</span>
                          {' · '}
                          📅 {t.loading === t.loading ? '授权于' : 'Granted'}{' '}
                          {new Date(perm.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-3">
                        <Select
                          value={perm.permission}
                          onValueChange={(value) =>
                            handleUpdatePermission(perm.projectId, value as PermissionLevel)
                          }
                          disabled={updating === perm.projectId}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="READ">👁️ {t.teams.permissionLevels.READ}</SelectItem>
                            <SelectItem value="WRITE">
                              ✏️ {t.teams.permissionLevels.WRITE}
                            </SelectItem>
                            <SelectItem value="ADMIN">
                              🔑 {t.teams.permissionLevels.ADMIN}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          onClick={() => handleRevokePermission(perm.projectId, perm.project!.name)}
                          disabled={revoking === perm.projectId}
                        >
                          {revoking === perm.projectId
                            ? t.loading === t.loading
                              ? '撤销中...'
                              : 'Revoking...'
                            : t.teams.revokePermission}
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
