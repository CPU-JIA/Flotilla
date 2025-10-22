'use client'

/**
 * Danger Zone Page
 * ECP-A1: 单一职责 - 项目危险操作管理（归档、删除）
 * ECP-C1: 防御性编程 - 多重确认和权限验证
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { api, ApiError } from '@/lib/api'
import type { Project } from '@/types/project'

export default function DangerZonePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string
  const { user } = useAuth()
  const { t } = useLanguage()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [operating, setOperating] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  // 获取项目信息
  const fetchProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await api.projects.getById(projectId)
      setProject(data)
    } catch (err) {
      console.error('Failed to fetch project:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  // 归档项目
  const handleArchive = async () => {
    if (!projectId || !project) return

    if (!confirm(t.projects.settings.archiveDesc)) return

    setOperating(true)
    try {
      await api.projects.archive(projectId)
      alert(t.projects.settings.archiveSuccess)
      router.push('/projects')
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.projects.settings.archiveFailed}: ${err.message}`)
      } else {
        alert(t.projects.settings.archiveFailed)
      }
    } finally {
      setOperating(false)
    }
  }

  // 取消归档
  const handleUnarchive = async () => {
    if (!projectId || !project) return

    setOperating(true)
    try {
      await api.projects.unarchive(projectId)
      alert(t.projects.settings.unarchiveSuccess)
      fetchProject()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.projects.settings.unarchiveFailed}: ${err.message}`)
      } else {
        alert(t.projects.settings.unarchiveFailed)
      }
    } finally {
      setOperating(false)
    }
  }

  // 删除项目
  const handleDelete = async () => {
    if (!projectId || !project) return

    if (deleteConfirmName !== project.name) {
      alert(t.projects.settings.deleteNameMismatch)
      return
    }

    // 二次确认
    if (!confirm(t.projects.settings.deleteWarning)) return

    setOperating(true)
    try {
      await api.projects.delete(projectId)
      alert(t.projects.settings.deleteSuccess)
      router.push('/projects')
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.projects.settings.deleteFailed}: ${err.message}`)
      } else {
        alert(t.projects.settings.deleteFailed)
      }
    } finally {
      setOperating(false)
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
  const canManage = isOwner || isSuperAdmin

  if (!canManage) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-card-foreground mb-2">权限不足</h3>
          <p className="text-muted-foreground">只有项目所有者可以执行危险操作</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Warning Notice */}
      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            ⚠️ {t.projects.settings.dangerZone}
          </CardTitle>
          <CardDescription className="text-red-700 dark:text-red-300">
            {t.projects.settings.deleteWarning}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Archive Project */}
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="text-yellow-600 dark:text-yellow-400">
            📦 {t.projects.settings.archiveProject}
          </CardTitle>
          <CardDescription>{t.projects.settings.archiveDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              {t.projects.settings.archiveDesc}
            </p>
            {project.isArchived ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <span className="text-xl">✓</span>
                  <span className="font-medium">项目已归档</span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleUnarchive}
                  disabled={operating}
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                >
                  {operating ? t.projects.settings.unarchiving : t.projects.settings.unarchiveButton}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleArchive}
                disabled={operating}
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
              >
                {operating ? t.projects.settings.archiving : t.projects.settings.archiveButton}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Project */}
      <Card className="border-red-300 dark:border-red-700">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            🗑️ {t.projects.settings.deleteProject}
          </CardTitle>
          <CardDescription className="text-red-700 dark:text-red-300">
            {t.projects.settings.deleteDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t.projects.settings.deleteDesc}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                ⚠️ {t.projects.settings.deleteWarning}
              </p>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmName" className="text-card-foreground">
                {t.projects.settings.deleteConfirmPrompt}
              </Label>
              <Input
                id="confirmName"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={project.name}
                disabled={operating}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                请输入项目名称: <span className="font-mono font-medium">{project.name}</span>
              </p>
            </div>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={operating || deleteConfirmName !== project.name}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {operating ? t.projects.settings.deleting : t.projects.settings.deleteButton}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
