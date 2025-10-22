'use client'

/**
 * General Settings Page
 * ECP-A1: 单一职责 - 项目基本设置管理
 * ECP-C1: 防御性编程 - 表单验证和错误处理
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { api, ApiError } from '@/lib/api'
import type { Project } from '@/types/project'

export default function GeneralSettingsPage() {
  const params = useParams()
  const projectId = params?.id as string
  const { user } = useAuth()
  const { t } = useLanguage()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 表单状态
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE')
  const [defaultBranch, setDefaultBranch] = useState('main')

  // 获取项目信息
  const fetchProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await api.projects.getById(projectId)
      setProject(data)
      setName(data.name)
      setDescription(data.description || '')
      setVisibility(data.visibility)
      setDefaultBranch(data.defaultBranch || 'main')
    } catch (err) {
      console.error('Failed to fetch project:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  // 保存设置
  const handleSave = async () => {
    if (!projectId || !project) return

    // 表单验证
    if (!name.trim()) {
      alert(t.projects.settings.projectName + ' ' + t.validation.fieldRequired)
      return
    }

    setSaving(true)
    try {
      await api.projects.update(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      })
      alert(t.projects.settings.saveSuccess)
      fetchProject() // 刷新数据
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.projects.settings.saveFailed}: ${err.message}`)
      } else {
        alert(t.projects.settings.saveFailed)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!project) return null

  const isOwner = project.ownerId === user?.id
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const canEdit = isOwner || isSuperAdmin

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t.projects.settings.general}</CardTitle>
          <CardDescription>
            {t.projects.settings.projectName}, {t.projects.settings.projectDescription},{' '}
            {t.projects.settings.visibility}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t.projects.settings.projectName} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.projects.settings.projectNamePlaceholder}
              disabled={!canEdit || saving}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t.projects.settings.projectDescription}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.projects.settings.projectDescriptionPlaceholder}
              rows={4}
              disabled={!canEdit || saving}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>{t.projects.settings.visibility}</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(value) => setVisibility(value as 'PUBLIC' | 'PRIVATE')}
              disabled={!canEdit || saving}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PUBLIC" id="public" />
                <Label htmlFor="public" className="font-normal cursor-pointer">
                  🌍 {t.projects.settings.visibilityPublic}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PRIVATE" id="private" />
                <Label htmlFor="private" className="font-normal cursor-pointer">
                  🔒 {t.projects.settings.visibilityPrivate}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Default Branch */}
          <div className="space-y-2">
            <Label htmlFor="defaultBranch">{t.projects.settings.defaultBranch}</Label>
            <Input
              id="defaultBranch"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              placeholder="main"
              disabled={true}
              className="bg-gray-50 dark:bg-gray-900"
            />
            <p className="text-xs text-muted-foreground">
              {t.projects.settings.defaultBranch} (只读)
            </p>
          </div>

          {/* Save Button */}
          {canEdit && (
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? t.projects.settings.saving : t.projects.settings.saveChanges}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
