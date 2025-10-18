'use client'

/**
 * 团队设置Tab
 * ECP-A1: 单一职责 - 管理团队基本信息和删除操作
 * ECP-C1: 防御性编程 - 完整的表单验证
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'
import { api, ApiError } from '@/lib/api'
import type { Team, UpdateTeamRequest } from '@/types/team'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

interface SettingsTabProps {
  organizationSlug: string
  team: Team
  onUpdate: () => void
}

export function SettingsTab({ organizationSlug, team, onUpdate }: SettingsTabProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<UpdateTeamRequest>({
    name: team.name,
    description: team.description || '',
  })

  const handleChange = (field: keyof UpdateTeamRequest, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    })
    if (error) setError('')
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 前端验证
    const trimmedName = formData.name?.trim() || ''
    if (!trimmedName || trimmedName.length < 2) {
      setError(t.loading === t.loading ? '团队名称至少需要2个字符' : 'Team name requires at least 2 characters')
      return
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(t.loading === t.loading ? `团队名称最多${MAX_NAME_LENGTH}个字符` : `Team name max ${MAX_NAME_LENGTH} characters`)
      return
    }

    const trimmedDescription = formData.description?.trim() || ''
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(t.loading === t.loading ? `描述最多${MAX_DESCRIPTION_LENGTH}个字符` : `Description max ${MAX_DESCRIPTION_LENGTH} characters`)
      return
    }

    setIsUpdating(true)

    try {
      await api.teams.update(organizationSlug, team.slug, {
        name: trimmedName !== team.name ? trimmedName : undefined,
        description: trimmedDescription !== (team.description || '') ? (trimmedDescription || undefined) : undefined,
      })
      alert(t.teams.updateSuccess)
      onUpdate()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t.error)
      } else {
        setError(t.editor.networkError)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    const confirmMessage = t.loading === t.loading
      ? `确定要删除团队 "${team.name}" 吗？此操作无法撤销。`
      : `Delete team "${team.name}"? This action cannot be undone.`
    if (!confirm(confirmMessage)) return

    const doubleConfirmMessage = t.loading === t.loading
      ? '再次确认：删除后所有团队数据将丢失，是否继续？'
      : 'Confirm again: All team data will be lost. Continue?'
    if (!confirm(doubleConfirmMessage)) return

    setIsDeleting(true)

    try {
      await api.teams.delete(organizationSlug, team.slug)
      alert(t.teams.deleteSuccess)
      router.push(`/organizations/${organizationSlug}/teams`)
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || t.error)
      } else {
        alert(t.editor.networkError)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 基本信息编辑 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.loading === t.loading ? '基本信息' : 'Basic Information'}</CardTitle>
          <CardDescription>
            {t.loading === t.loading ? '更新团队的基本信息' : 'Update team basic information'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="name">{t.teams.name} *</Label>
                <span className={`text-xs ${(formData.name?.length || 0) > MAX_NAME_LENGTH ? 'text-red-600' : 'text-gray-500'}`}>
                  {formData.name?.length || 0} / {MAX_NAME_LENGTH}
                </span>
              </div>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={isUpdating}
                placeholder={t.loading === t.loading ? '请输入团队名称' : 'Enter team name'}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">{t.teams.description}</Label>
                <span className={`text-xs ${(formData.description?.length || 0) > MAX_DESCRIPTION_LENGTH ? 'text-red-600' : 'text-gray-500'}`}>
                  {formData.description?.length || 0} / {MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isUpdating}
                placeholder={t.loading === t.loading ? '请输入团队描述（可选）' : 'Enter team description (optional)'}
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (t.loading === t.loading ? '更新中...' : 'Updating...') : t.save}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    name: team.name,
                    description: team.description || '',
                  })
                  setError('')
                }}
                disabled={isUpdating}
              >
                {t.loading === t.loading ? '重置' : 'Reset'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 团队标识（只读） */}
      <Card>
        <CardHeader>
          <CardTitle>{t.teams.slug}</CardTitle>
          <CardDescription>
            {t.loading === t.loading ? '团队的唯一标识符（不可修改）' : 'Team unique identifier (read-only)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={team.slug}
            disabled
            className="font-mono bg-gray-50 dark:bg-gray-800"
          />
        </CardContent>
      </Card>

      {/* 危险区域 - 删除团队 */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            {t.loading === t.loading ? '危险区域' : 'Danger Zone'}
          </CardTitle>
          <CardDescription>
            {t.loading === t.loading ? '删除团队操作无法撤销，请谨慎操作' : 'Deleting a team is irreversible'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between p-4 border border-red-200 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-950/20">
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t.loading === t.loading ? '删除此团队' : 'Delete this team'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.loading === t.loading
                  ? '删除后，所有团队成员和权限配置将永久丢失'
                  : 'All team members and permissions will be permanently lost'}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="ml-4"
            >
              {isDeleting ? (t.loading === t.loading ? '删除中...' : 'Deleting...') : t.delete}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
