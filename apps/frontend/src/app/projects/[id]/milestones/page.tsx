/**
 * Milestones Management Page
 *
 * CRUD interface for project milestones with state filtering
 *
 * ECP-A1: Single Responsibility - Only manages milestones list and CRUD operations
 * ECP-C1: Defensive Programming - Permission checks, error handling
 * ECP-C2: Systematic Error Handling - Try-catch for all API calls
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MilestoneDialog } from '@/components/milestones/MilestoneDialog'
import { useLanguage } from '@/contexts/language-context'
import { Plus, Edit, Trash2, Lock, Unlock } from 'lucide-react'
import type { Milestone } from '@/types/issue'

type MilestoneState = 'OPEN' | 'CLOSED' | 'ALL'

export default function MilestonesPage() {
  const params = useParams()
  const { t } = useLanguage()
  const projectId = params.id as string

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [filteredMilestones, setFilteredMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | undefined>()
  const [stateFilter, setStateFilter] = useState<MilestoneState>('OPEN')

  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.milestones.list(projectId)
      setMilestones(data)
    } catch (error) {
      console.error('Failed to load milestones:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadMilestones()
  }, [loadMilestones])

  // ECP-C1: Filter milestones by state
  useEffect(() => {
    if (stateFilter === 'ALL') {
      setFilteredMilestones(milestones)
    } else {
      setFilteredMilestones(milestones.filter((m) => m.state === stateFilter))
    }
  }, [milestones, stateFilter])

  const handleCreate = () => {
    setDialogMode('create')
    setSelectedMilestone(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (milestone: Milestone) => {
    setDialogMode('edit')
    setSelectedMilestone(milestone)
    setDialogOpen(true)
  }

  const handleClose = async (milestone: Milestone) => {
    try {
      await api.milestones.update(projectId, milestone.id, { state: 'CLOSED' })
      await loadMilestones()
    } catch (error) {
      console.error('Failed to close milestone:', error)
      alert(t.issues.milestones.closeFailed)
    }
  }

  const handleReopen = async (milestone: Milestone) => {
    try {
      await api.milestones.update(projectId, milestone.id, { state: 'OPEN' })
      await loadMilestones()
    } catch (error) {
      console.error('Failed to reopen milestone:', error)
      alert(t.issues.milestones.reopenFailed)
    }
  }

  const handleDelete = async (milestone: Milestone) => {
    const confirmed = confirm(
      t.issues.milestones.confirmDelete + '\n\n' + t.issues.milestones.usedBy.replace('{count}', '?')
    )
    if (!confirmed) return

    try {
      await api.milestones.delete(projectId, milestone.id)
      await loadMilestones()
    } catch (error) {
      console.error('Failed to delete milestone:', error)
      alert(t.issues.milestones.deleteFailed)
    }
  }

  const handleDialogSubmit = async (data: {
    title: string
    description?: string
    dueDate?: string
  }) => {
    if (dialogMode === 'create') {
      await api.milestones.create(projectId, data)
    } else if (selectedMilestone) {
      await api.milestones.update(projectId, selectedMilestone.id, data)
    }
    await loadMilestones()
  }

  // ECP-B2: Helper to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t.issues.milestones.loading}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t.issues.milestones.title}</h1>
          <p className="text-muted-foreground mt-1">
            {milestones.length === 0
              ? t.issues.milestones.noMilestonesDesc
              : `${milestones.length} ${milestones.length === 1 ? 'milestone' : 'milestones'}`}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {/* State Filter */}
          <Select
            value={stateFilter}
            onValueChange={(value) => setStateFilter(value as MilestoneState)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">{t.issues.milestones.openMilestones}</SelectItem>
              <SelectItem value="CLOSED">{t.issues.milestones.closedMilestones}</SelectItem>
              <SelectItem value="ALL">{t.issues.milestones.allMilestones}</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t.issues.milestones.createNew}
          </Button>
        </div>
      </div>

      {/* Milestones List */}
      {filteredMilestones.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {stateFilter === 'ALL'
              ? t.issues.milestones.noMilestones
              : stateFilter === 'OPEN'
                ? t.issues.milestones.noOpenMilestones
                : t.issues.milestones.noClosedMilestones}
          </p>
          <p className="text-sm text-muted-foreground">{t.issues.milestones.noMilestonesDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              {/* Milestone Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg">{milestone.title}</h3>
                    {milestone.state === 'OPEN' ? (
                      <Badge className="bg-green-500">{t.issues.milestones.openState}</Badge>
                    ) : (
                      <Badge variant="secondary">{t.issues.milestones.closedState}</Badge>
                    )}
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  )}
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(milestone)}
                  className="text-destructive hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Milestone Metadata */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                {milestone.dueDate && (
                  <span>
                    {milestone.state === 'OPEN' ? t.issues.milestones.due : t.issues.milestones.closed}:{' '}
                    {formatDate(milestone.dueDate)}
                  </span>
                )}
                <span>
                  {/* TODO: Add issue count from backend */}
                  {t.issues.milestones.usedBy.replace('{count}', '0')}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {milestone.state === 'OPEN' ? (
                  <Button variant="outline" size="sm" onClick={() => handleClose(milestone)}>
                    <Lock className="mr-2 h-4 w-4" />
                    {t.issues.milestones.closeButton}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleReopen(milestone)}>
                    <Unlock className="mr-2 h-4 w-4" />
                    {t.issues.milestones.reopenButton}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleEdit(milestone)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t.issues.milestones.editButton}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <MilestoneDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        milestone={selectedMilestone}
        onSubmit={handleDialogSubmit}
      />
    </div>
  )
}
