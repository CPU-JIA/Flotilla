'use client'

/**
 * Pull Request Approval Settings Page
 * ECP-A1: 单一职责 - PR审批规则配置
 * ECP-C1: 防御性编程 - 表单验证和错误处理
 */

import { logger } from '@/lib/logger'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, ApiError } from '@/lib/api'
import type { Project } from '@/types/project'

export default function PullRequestSettingsPage() {
  const params = useParams()
  const projectId = params?.id as string
  const { user } = useAuth()
  const { t } = useLanguage()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [requireApprovals, setRequireApprovals] = useState(1)
  const [allowSelfMerge, setAllowSelfMerge] = useState(true)
  const [requireReviewFromOwner, setRequireReviewFromOwner] = useState(false)

  // Fetch project information
  const fetchProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await api.projects.getById(projectId)
      setProject(data)
      setRequireApprovals(data.requireApprovals ?? 1)
      setAllowSelfMerge(data.allowSelfMerge ?? true)
      setRequireReviewFromOwner(data.requireReviewFromOwner ?? false)
    } catch (err) {
      logger.error('Failed to fetch project:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  // Save settings
  const handleSave = async () => {
    if (!projectId || !project) return

    // Form validation
    if (requireApprovals < 0 || requireApprovals > 10) {
      alert(
        t.projects.settings.prApproval?.requireApprovalsValidation ||
          'Required approvals must be between 0-10'
      )
      return
    }

    setSaving(true)
    try {
      await api.projects.update(projectId, {
        requireApprovals,
        allowSelfMerge,
        requireReviewFromOwner,
      })
      alert(t.projects.settings.saveSuccess)
      fetchProject() // Refresh data
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
      {/* PR Approval Rules */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t.projects.settings.prApproval?.title || 'Pull Request Approval Rules'}
          </CardTitle>
          <CardDescription>
            {t.projects.settings.prApproval?.description ||
              'Configure merge validation rules for pull requests'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Required Approvals */}
          <div className="space-y-2">
            <Label htmlFor="requireApprovals">
              {t.projects.settings.prApproval?.requireApprovals || 'Required Approvals'}
            </Label>
            <Input
              id="requireApprovals"
              type="number"
              min={0}
              max={10}
              value={requireApprovals}
              onChange={(e) => setRequireApprovals(parseInt(e.target.value, 10) || 0)}
              disabled={!canEdit || saving}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              {t.projects.settings.prApproval?.requireApprovalsDesc ||
                'Minimum number of approvals required before merging (0-10)'}
            </p>
          </div>

          {/* Allow Self Merge */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                id="allowSelfMerge"
                type="checkbox"
                checked={allowSelfMerge}
                onChange={(e) => setAllowSelfMerge(e.target.checked)}
                disabled={!canEdit || saving}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <Label htmlFor="allowSelfMerge" className="cursor-pointer">
                {t.projects.settings.prApproval?.allowSelfMerge || 'Allow Self-Merge'}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-7">
              {t.projects.settings.prApproval?.allowSelfMergeDesc ||
                'Allow PR authors to merge their own pull requests'}
            </p>
          </div>

          {/* Require Review from Owner */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                id="requireReviewFromOwner"
                type="checkbox"
                checked={requireReviewFromOwner}
                onChange={(e) => setRequireReviewFromOwner(e.target.checked)}
                disabled={!canEdit || saving}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <Label htmlFor="requireReviewFromOwner" className="cursor-pointer">
                {t.projects.settings.prApproval?.requireReviewFromOwner || 'Require Owner Approval'}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-7">
              {t.projects.settings.prApproval?.requireReviewFromOwnerDesc ||
                'At least one approval must come from the project owner'}
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

      {/* Current Policy Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t.projects.settings.prApproval?.policySummary || 'Current Policy'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {t.projects.settings.prApproval?.requireApprovals || 'Required Approvals'}:
            </span>
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
              {requireApprovals}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {t.projects.settings.prApproval?.allowSelfMerge || 'Allow Self-Merge'}:
            </span>
            <span className={allowSelfMerge ? 'text-green-600' : 'text-red-600'}>
              {allowSelfMerge ? '✓ ' + (t.yes || 'Yes') : '✗ ' + (t.no || 'No')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {t.projects.settings.prApproval?.requireReviewFromOwner || 'Require Owner Approval'}:
            </span>
            <span className={requireReviewFromOwner ? 'text-green-600' : 'text-red-600'}>
              {requireReviewFromOwner ? '✓ ' + (t.yes || 'Yes') : '✗ ' + (t.no || 'No')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
