'use client'

/**
 * Branch Protection Rules Page
 * ECP-A1: 单一职责 - 分支保护规则配置
 * ECP-C1: 防御性编程 - 表单验证和错误处理
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, ApiError } from '@/lib/api'
import type { Project } from '@/types/project'

interface BranchProtectionRule {
  id: string
  projectId: string
  branchPattern: string
  requirePullRequest: boolean
  requiredApprovingReviews: number
  dismissStaleReviews: boolean
  requireCodeOwnerReview: boolean
  allowForcePushes: boolean
  allowDeletions: boolean
  requireStatusChecks: boolean
  requiredStatusChecks: string[]
  createdAt: string
  updatedAt: string
}

export default function BranchProtectionPage() {
  const params = useParams()
  const projectId = params?.id as string
  const { user } = useAuth()
  const { t } = useLanguage()

  const [project, setProject] = useState<Project | null>(null)
  const [rules, setRules] = useState<BranchProtectionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<BranchProtectionRule | null>(null)
  const [deletingRule, setDeletingRule] = useState<BranchProtectionRule | null>(null)

  // Form state
  const [branchPattern, setBranchPattern] = useState('')
  const [requirePullRequest, setRequirePullRequest] = useState(true)
  const [requiredApprovals, setRequiredApprovals] = useState(1)
  const [dismissStaleReviews, setDismissStaleReviews] = useState(false)
  const [requireCodeOwnerReview, setRequireCodeOwnerReview] = useState(false)
  const [allowForcePushes, setAllowForcePushes] = useState(false)
  const [allowDeletions, setAllowDeletions] = useState(false)
  const [requireStatusChecks, setRequireStatusChecks] = useState(false)
  const [requiredStatusChecks, setRequiredStatusChecks] = useState('')

  // Fetch project and rules
  const fetchData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [projectData, rulesData] = await Promise.all([
        api.projects.getById(projectId),
        api.projects.getBranchProtectionRules(projectId),
      ])
      setProject(projectData)
      setRules(rulesData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const isOwner = project?.ownerId === user?.id
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const canEdit = isOwner || isSuperAdmin

  // Reset form
  const resetForm = () => {
    setBranchPattern('')
    setRequirePullRequest(true)
    setRequiredApprovals(1)
    setDismissStaleReviews(false)
    setRequireCodeOwnerReview(false)
    setAllowForcePushes(false)
    setAllowDeletions(false)
    setRequireStatusChecks(false)
    setRequiredStatusChecks('')
  }

  // Open create dialog
  const handleCreate = () => {
    resetForm()
    setEditingRule(null)
    setCreateDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (rule: BranchProtectionRule) => {
    setBranchPattern(rule.branchPattern)
    setRequirePullRequest(rule.requirePullRequest)
    setRequiredApprovals(rule.requiredApprovingReviews)
    setDismissStaleReviews(rule.dismissStaleReviews)
    setRequireCodeOwnerReview(rule.requireCodeOwnerReview)
    setAllowForcePushes(rule.allowForcePushes)
    setAllowDeletions(rule.allowDeletions)
    setRequireStatusChecks(rule.requireStatusChecks)
    setRequiredStatusChecks(rule.requiredStatusChecks.join(', '))
    setEditingRule(rule)
    setCreateDialogOpen(true)
  }

  // Save (create or update) rule
  const handleSave = async () => {
    if (!projectId || !branchPattern.trim()) {
      alert(t.projects.settings.branchProtectionRules?.branchPatternLabel || 'Branch name is required')
      return
    }

    if (requiredApprovals < 0 || requiredApprovals > 10) {
      alert('Required approvals must be between 0-10')
      return
    }

    setSaving(true)
    try {
      const data = {
        branchPattern: branchPattern.trim(),
        requirePullRequest,
        requiredApprovingReviews: requiredApprovals,
        dismissStaleReviews,
        requireCodeOwnerReview,
        allowForcePushes,
        allowDeletions,
        requireStatusChecks,
        requiredStatusChecks: requiredStatusChecks
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0),
      }

      if (editingRule) {
        await api.projects.updateBranchProtectionRule(editingRule.id, data)
        alert(t.projects.settings.branchProtectionRules?.updateSuccess || 'Rule updated successfully')
      } else {
        await api.projects.createBranchProtectionRule(projectId, data)
        alert(t.projects.settings.branchProtectionRules?.createSuccess || 'Rule created successfully')
      }

      setCreateDialogOpen(false)
      resetForm()
      fetchData()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${editingRule ? t.projects.settings.branchProtectionRules?.updateFailed : t.projects.settings.branchProtectionRules?.createFailed}: ${err.message}`)
      } else {
        alert(editingRule ? t.projects.settings.branchProtectionRules?.updateFailed : t.projects.settings.branchProtectionRules?.createFailed)
      }
    } finally {
      setSaving(false)
    }
  }

  // Delete rule
  const handleDelete = async (rule: BranchProtectionRule) => {
    if (!confirm(t.projects.settings.branchProtectionRules?.confirmDelete || 'Are you sure?')) {
      return
    }

    setDeletingRule(rule)
    try {
      await api.projects.deleteBranchProtectionRule(rule.id)
      alert(t.projects.settings.branchProtectionRules?.deleteSuccess || 'Rule deleted successfully')
      fetchData()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.projects.settings.branchProtectionRules?.deleteFailed}: ${err.message}`)
      } else {
        alert(t.projects.settings.branchProtectionRules?.deleteFailed)
      }
    } finally {
      setDeletingRule(null)
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

  return (
    <div className="space-y-6">
      {/* Branch Protection Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t.projects.settings.branchProtectionRules?.title || 'Branch Protection Rules'}</CardTitle>
              <CardDescription>
                {t.projects.settings.branchProtectionRules?.description || 'Configure protection policies for important branches'}
              </CardDescription>
            </div>
            {canEdit && (
              <Button onClick={handleCreate}>
                {t.projects.settings.branchProtectionRules?.createRule || 'Create Rule'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛡️</div>
              <h3 className="text-lg font-semibold mb-2">
                {t.projects.settings.branchProtectionRules?.noBranchRules || 'No branch protection rules'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t.projects.settings.branchProtectionRules?.noBranchRulesDesc || 'Create protection rules to safeguard critical branches'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.projects.settings.branchProtectionRules?.branchPattern || 'Branch Name'}</TableHead>
                    <TableHead>{t.projects.settings.branchProtectionRules?.requirePullRequest || 'Require PR'}</TableHead>
                    <TableHead>{t.projects.settings.branchProtectionRules?.requiredApprovals || 'Required Approvals'}</TableHead>
                    <TableHead>{t.projects.settings.branchProtectionRules?.actions || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono">{rule.branchPattern}</TableCell>
                      <TableCell>
                        {rule.requirePullRequest ? (
                          <span className="text-green-600">✓ {t.yes || 'Yes'}</span>
                        ) : (
                          <span className="text-gray-400">✗ {t.no || 'No'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {rule.requiredApprovingReviews}
                        </span>
                      </TableCell>
                      <TableCell>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(rule)}
                            >
                              {t.projects.settings.branchProtectionRules?.editRule || 'Edit'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(rule)}
                              disabled={deletingRule?.id === rule.id}
                            >
                              {deletingRule?.id === rule.id
                                ? (t.projects.settings.branchProtectionRules?.deleting || 'Deleting...')
                                : (t.projects.settings.branchProtectionRules?.deleteRule || 'Delete')}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule
                ? (t.projects.settings.branchProtectionRules?.editRuleTitle || 'Edit Rule')
                : (t.projects.settings.branchProtectionRules?.createRuleTitle || 'Create Rule')}
            </DialogTitle>
            <DialogDescription>
              {t.projects.settings.branchProtectionRules?.description || 'Configure protection policies'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Branch Pattern */}
            <div className="space-y-2">
              <Label htmlFor="branchPattern">
                {t.projects.settings.branchProtectionRules?.branchPatternLabel || 'Branch Name'} *
              </Label>
              <Input
                id="branchPattern"
                value={branchPattern}
                onChange={(e) => setBranchPattern(e.target.value)}
                placeholder={t.projects.settings.branchProtectionRules?.branchPatternPlaceholder || 'e.g.: main, develop'}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                {t.projects.settings.branchProtectionRules?.branchPatternHelper || 'Exact matching only'}
              </p>
            </div>

            {/* Require Pull Request */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  id="requirePullRequest"
                  type="checkbox"
                  checked={requirePullRequest}
                  onChange={(e) => setRequirePullRequest(e.target.checked)}
                  disabled={saving}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <Label htmlFor="requirePullRequest" className="cursor-pointer">
                  {t.projects.settings.branchProtectionRules?.requirePullRequestLabel || 'Require Pull Request'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-7">
                {t.projects.settings.branchProtectionRules?.requirePullRequestDesc || 'Prevent direct pushes'}
              </p>
            </div>

            {/* Required Approvals */}
            <div className="space-y-2">
              <Label htmlFor="requiredApprovals">
                {t.projects.settings.branchProtectionRules?.requiredApprovalsLabel || 'Required Approvals'}
              </Label>
              <Input
                id="requiredApprovals"
                type="number"
                min={0}
                max={10}
                value={requiredApprovals}
                onChange={(e) => setRequiredApprovals(parseInt(e.target.value, 10) || 0)}
                disabled={saving}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                {t.projects.settings.branchProtectionRules?.requiredApprovalsDesc || 'Minimum approvals (0-10)'}
              </p>
            </div>

            {/* Dismiss Stale Reviews */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  id="dismissStaleReviews"
                  type="checkbox"
                  checked={dismissStaleReviews}
                  onChange={(e) => setDismissStaleReviews(e.target.checked)}
                  disabled={saving}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <Label htmlFor="dismissStaleReviews" className="cursor-pointer">
                  {t.projects.settings.branchProtectionRules?.dismissStaleReviewsLabel || 'Dismiss Stale Reviews'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-7">
                {t.projects.settings.branchProtectionRules?.dismissStaleReviewsDesc || 'Clear old approvals on new commits'}
              </p>
            </div>

            {/* Require Code Owner Review */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  id="requireCodeOwnerReview"
                  type="checkbox"
                  checked={requireCodeOwnerReview}
                  onChange={(e) => setRequireCodeOwnerReview(e.target.checked)}
                  disabled={saving}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <Label htmlFor="requireCodeOwnerReview" className="cursor-pointer">
                  {t.projects.settings.branchProtectionRules?.requireCodeOwnerReviewLabel || 'Require Code Owner Review'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-7">
                {t.projects.settings.branchProtectionRules?.requireCodeOwnerReviewDesc || 'Require code owner approval'}
              </p>
            </div>

            {/* Allow Force Pushes */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  id="allowForcePushes"
                  type="checkbox"
                  checked={allowForcePushes}
                  onChange={(e) => setAllowForcePushes(e.target.checked)}
                  disabled={saving}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <Label htmlFor="allowForcePushes" className="cursor-pointer text-orange-600">
                  {t.projects.settings.branchProtectionRules?.allowForcePushesLabel || 'Allow Force Pushes'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-7">
                {t.projects.settings.branchProtectionRules?.allowForcePushesDesc || 'Allow git push --force (dangerous)'}
              </p>
            </div>

            {/* Allow Deletions */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  id="allowDeletions"
                  type="checkbox"
                  checked={allowDeletions}
                  onChange={(e) => setAllowDeletions(e.target.checked)}
                  disabled={saving}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <Label htmlFor="allowDeletions" className="cursor-pointer text-orange-600">
                  {t.projects.settings.branchProtectionRules?.allowDeletionsLabel || 'Allow Branch Deletion'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-7">
                {t.projects.settings.branchProtectionRules?.allowDeletionsDesc || 'Allow deletion of this branch'}
              </p>
            </div>

            {/* Require Status Checks */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  id="requireStatusChecks"
                  type="checkbox"
                  checked={requireStatusChecks}
                  onChange={(e) => setRequireStatusChecks(e.target.checked)}
                  disabled={saving}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <Label htmlFor="requireStatusChecks" className="cursor-pointer">
                  {t.projects.settings.branchProtectionRules?.requireStatusChecksLabel || 'Require Status Checks'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-7">
                {t.projects.settings.branchProtectionRules?.requireStatusChecksDesc || 'Must pass CI/CD checks'}
              </p>
            </div>

            {/* Required Status Checks */}
            {requireStatusChecks && (
              <div className="space-y-2 ml-7">
                <Label htmlFor="requiredStatusChecks">
                  {t.projects.settings.branchProtectionRules?.requiredStatusChecksLabel || 'Required Checks'}
                </Label>
                <Input
                  id="requiredStatusChecks"
                  value={requiredStatusChecks}
                  onChange={(e) => setRequiredStatusChecks(e.target.value)}
                  placeholder={t.projects.settings.branchProtectionRules?.requiredStatusChecksPlaceholder || 'e.g.: ci, tests, build'}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of check names
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={saving}
            >
              {t.projects.settings.cancel || 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? (editingRule
                    ? (t.projects.settings.branchProtectionRules?.updating || 'Updating...')
                    : (t.projects.settings.branchProtectionRules?.creating || 'Creating...'))
                : (editingRule
                    ? (t.projects.settings.branchProtectionRules?.updateButton || 'Update')
                    : (t.projects.settings.branchProtectionRules?.createButton || 'Create'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
