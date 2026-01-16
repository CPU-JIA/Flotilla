/**
 * Labels Management Page
 *
 * CRUD interface for project labels
 *
 * ECP-A1: Single Responsibility - Only manages labels list and CRUD operations
 * ECP-C1: Defensive Programming - Permission checks, error handling
 * ECP-C2: Systematic Error Handling - Try-catch for all API calls
 */

'use client'

import { logger } from '@/lib/logger'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { LabelDialog } from '@/components/labels/LabelDialog'
import { useLanguage } from '@/contexts/language-context'
import { Plus, Edit, Trash2 } from 'lucide-react'
import type { Label } from '@/types/issue'

export default function LabelsPage() {
  const params = useParams()
  const { t } = useLanguage()
  const projectId = params.id as string

  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedLabel, setSelectedLabel] = useState<Label | undefined>()

  const loadLabels = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.labels.list(projectId)
      setLabels(data)
    } catch (error) {
      logger.error('Failed to load labels:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadLabels()
  }, [loadLabels])

  const handleCreate = () => {
    setDialogMode('create')
    setSelectedLabel(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (label: Label) => {
    setDialogMode('edit')
    setSelectedLabel(label)
    setDialogOpen(true)
  }

  const handleDelete = async (label: Label) => {
    const confirmed = confirm(
      t.issues.labels.confirmDelete + '\n\n' + t.issues.labels.usedBy.replace('{count}', '?')
    )
    if (!confirmed) return

    try {
      await api.labels.delete(projectId, label.id)
      await loadLabels()
    } catch (error) {
      logger.error('Failed to delete label:', error)
      alert(t.issues.labels.deleteFailed)
    }
  }

  const handleDialogSubmit = async (data: {
    name: string
    color: string
    description?: string
  }) => {
    if (dialogMode === 'create') {
      await api.labels.create(projectId, data)
    } else if (selectedLabel) {
      await api.labels.update(projectId, selectedLabel.id, data)
    }
    await loadLabels()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t.issues.labels.title}...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t.issues.labels.title}</h1>
          <p className="text-muted-foreground mt-1">
            {labels.length === 0
              ? t.issues.labels.noLabelsDesc
              : `${labels.length} ${labels.length === 1 ? 'label' : 'labels'}`}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t.issues.labels.createNew}
        </Button>
      </div>

      {/* Labels List */}
      {labels.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">{t.issues.labels.noLabels}</p>
          <p className="text-sm text-muted-foreground">{t.issues.labels.noLabelsDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {labels.map((label) => (
            <div
              key={label.id}
              className="border rounded-lg p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors"
            >
              {/* Color Preview */}
              <div
                className="w-16 h-16 rounded-md border flex-shrink-0"
                style={{ backgroundColor: label.color }}
                aria-label={`Color: ${label.color}`}
              />

              {/* Label Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">{label.name}</h3>
                {label.description && (
                  <p className="text-sm text-muted-foreground mt-1">{label.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {t.issues.labels.usedBy.replace(
                    '{count}',
                    String(label._count?.issueLabels || 0)
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleEdit(label)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(label)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <LabelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        label={selectedLabel}
        onSubmit={handleDialogSubmit}
      />
    </div>
  )
}
