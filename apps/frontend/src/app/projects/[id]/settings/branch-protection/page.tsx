/**
 * Branch Protection Rules Page
 * ECP-A1: SOLID - Single Responsibility - Branch protection management
 * ECP-C1: Defensive Programming - Error handling and loading states
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Trash2, Shield, Check, X, Plus, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BranchProtectionDialog } from '@/components/branch-protection/BranchProtectionDialog'
import { useToast } from '@/hooks/use-toast'

interface BranchProtectionRule {
  id: string
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
}

export default function BranchProtectionPage() {
  const params = useParams()
  const projectId = params.id as string
  const [rules, setRules] = useState<BranchProtectionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<BranchProtectionRule | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const loadRules = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.projects.getBranchProtectionRules(projectId)
      setRules(data)
    } catch (error) {
      console.error('Failed to load branch protection rules:', error)
      toast({
        title: 'Error',
        description: 'Failed to load branch protection rules',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const handleCreate = () => {
    setEditingRule(null)
    setDialogOpen(true)
  }

  const handleEdit = (rule: BranchProtectionRule) => {
    setEditingRule(rule)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: any) => {
    try {
      setSubmitting(true)
      if (editingRule) {
        await api.projects.updateBranchProtectionRule(editingRule.id, data)
        toast({
          title: 'Success',
          description: 'Branch protection rule updated successfully',
        })
      } else {
        await api.projects.createBranchProtectionRule(projectId, data)
        toast({
          title: 'Success',
          description: 'Branch protection rule created successfully',
        })
      }
      await loadRules()
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to save branch protection rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to save branch protection rule',
        variant: 'destructive',
      })
      throw error
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (rule: BranchProtectionRule) => {
    if (!confirm(`Delete protection rule for '${rule.branchPattern}'?`)) return
    try {
      await api.projects.deleteBranchProtectionRule(rule.id)
      toast({
        title: 'Success',
        description: 'Branch protection rule deleted successfully',
      })
      await loadRules()
    } catch (error) {
      console.error('Failed to delete rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive',
      })
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">Loading protection rules...</div>
    </div>
  )

  return (
    <>
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Branch Protection Rules</h1>
            <p className="text-muted-foreground mt-1">
              {rules.length === 0
                ? 'Protect important branches from force pushes and deletion'
                : `${rules.length} rule${rules.length === 1 ? '' : 's'} configured`}
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No branch protection rules</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Branch protection rules help you enforce workflows by requiring status checks and reviews before merging.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="border rounded-lg p-6 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <code className="text-lg font-mono font-semibold">{rule.branchPattern}</code>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Pull Request Settings</h4>
                        <div className="flex items-center gap-2 text-sm">
                          {rule.requirePullRequest ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-400" />}
                          <span className={rule.requirePullRequest ? '' : 'text-muted-foreground'}>
                            Require pull request
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Required approvals:</span>
                          <Badge variant="outline">{rule.requiredApprovingReviews}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {rule.dismissStaleReviews ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-400" />}
                          <span className={rule.dismissStaleReviews ? '' : 'text-muted-foreground'}>
                            Dismiss stale reviews
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {rule.requireCodeOwnerReview ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-400" />}
                          <span className={rule.requireCodeOwnerReview ? '' : 'text-muted-foreground'}>
                            Require code owner review
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Advanced Settings</h4>
                        <div className="flex items-center gap-2 text-sm">
                          {rule.allowForcePushes ? <Check className="h-4 w-4 text-orange-500" /> : <X className="h-4 w-4 text-gray-400" />}
                          <span className={rule.allowForcePushes ? 'text-orange-600' : 'text-muted-foreground'}>
                            Allow force pushes
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {rule.allowDeletions ? <Check className="h-4 w-4 text-red-500" /> : <X className="h-4 w-4 text-gray-400" />}
                          <span className={rule.allowDeletions ? 'text-red-600' : 'text-muted-foreground'}>
                            Allow branch deletion
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Created {new Date(rule.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(rule)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Branch Protection Dialog */}
      <BranchProtectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editingRule || undefined}
        onSubmit={handleSubmit}
        isLoading={submitting}
      />
    </>
  )
}
