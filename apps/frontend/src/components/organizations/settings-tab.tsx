'use client'

/**
 * 组织设置Tab
 * ECP-A1: 单一职责 - 组织设置管理
 * ECP-C1: 防御性编程 - 权限检查和输入验证
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
import type { Organization } from '@/types/organization'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

interface SettingsTabProps {
  organization: Organization
  onUpdate: () => void
}

export function SettingsTab({ organization, onUpdate }: SettingsTabProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: organization.name,
    description: organization.description || '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    })
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // 验证
    const trimmedName = formData.name.trim()
    if (!trimmedName || trimmedName.length < 2) {
      setError(
        t.loading === t.loading
          ? '组织名称至少需要2个字符'
          : 'Organization name requires at least 2 characters'
      )
      return
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(
        t.loading === t.loading
          ? `组织名称最多${MAX_NAME_LENGTH}个字符`
          : `Organization name max ${MAX_NAME_LENGTH} characters`
      )
      return
    }

    const trimmedDescription = formData.description.trim()
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(
        t.loading === t.loading
          ? `描述最多${MAX_DESCRIPTION_LENGTH}个字符`
          : `Description max ${MAX_DESCRIPTION_LENGTH} characters`
      )
      return
    }

    setIsUpdating(true)
    try {
      await api.organizations.update(organization.slug, {
        name: trimmedName,
        description: trimmedDescription || undefined,
      })
      setSuccess(t.organizations.updateSuccess)
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
    if (organization.isPersonal) {
      alert(t.loading === t.loading ? '不能删除个人组织' : 'Cannot delete personal organization')
      return
    }

    const confirmMessage =
      t.loading === t.loading
        ? `${t.organizations.deleteConfirm}\n\n此操作不可撤销！请输入组织名称 "${organization.name}" 确认删除：`
        : `${t.organizations.deleteConfirm}\n\nThis action cannot be undone! Enter organization name "${organization.name}" to confirm:`

    const userInput = prompt(confirmMessage)
    if (userInput !== organization.name) {
      if (userInput !== null) {
        alert(
          t.loading === t.loading
            ? '组织名称不匹配，删除已取消'
            : 'Organization name mismatch, deletion cancelled'
        )
      }
      return
    }

    setIsDeleting(true)
    try {
      await api.organizations.delete(organization.slug)
      alert(t.organizations.deleteSuccess)
      router.push('/organizations')
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
            {t.loading === t.loading
              ? '更新组织的名称和描述'
              : 'Update organization name and description'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-md text-sm">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="name">{t.organizations.name} *</Label>
                <span
                  className={`text-xs ${formData.name.length > MAX_NAME_LENGTH ? 'text-red-600' : 'text-gray-500'}`}
                >
                  {formData.name.length} / {MAX_NAME_LENGTH}
                </span>
              </div>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={isUpdating || organization.isPersonal}
                placeholder={t.loading === t.loading ? '组织名称' : 'Organization name'}
              />
              {organization.isPersonal && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.loading === t.loading
                    ? '个人组织名称不可修改'
                    : 'Personal organization name cannot be changed'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">{t.organizations.description}</Label>
                <span
                  className={`text-xs ${formData.description.length > MAX_DESCRIPTION_LENGTH ? 'text-red-600' : 'text-gray-500'}`}
                >
                  {formData.description.length} / {MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isUpdating}
                placeholder={
                  t.loading === t.loading
                    ? '组织描述（可选）'
                    : 'Organization description (optional)'
                }
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (t.loading === t.loading ? '保存中...' : 'Saving...') : t.save}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 组织标识（只读） */}
      <Card>
        <CardHeader>
          <CardTitle>{t.organizations.slug}</CardTitle>
          <CardDescription>
            {t.loading === t.loading
              ? '组织的URL标识（创建后不可修改）'
              : 'Organization URL slug (cannot be changed after creation)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4">
            <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
              {organization.slug}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* 危险操作区 */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            {t.loading === t.loading ? '危险操作' : 'Danger Zone'}
          </CardTitle>
          <CardDescription>
            {t.loading === t.loading
              ? '这些操作不可撤销，请谨慎操作'
              : 'These actions are irreversible, proceed with caution'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-950/20">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {t.loading === t.loading ? '删除组织' : 'Delete Organization'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {organization.isPersonal
                    ? t.loading === t.loading
                      ? '个人组织不能删除'
                      : 'Personal organization cannot be deleted'
                    : t.loading === t.loading
                      ? '永久删除此组织及其所有数据'
                      : 'Permanently delete this organization and all its data'}
                </p>
              </div>
              <Button
                variant="outline"
                className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 dark:text-red-400 dark:hover:bg-red-950 dark:border-red-800"
                onClick={handleDelete}
                disabled={isDeleting || organization.isPersonal}
              >
                {isDeleting ? (t.loading === t.loading ? '删除中...' : 'Deleting...') : t.delete}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
