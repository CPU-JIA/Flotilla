/**
 * MilestoneSelector Component
 *
 * Single-select dropdown for choosing milestone in Issue forms
 *
 * ECP-A1: Single Responsibility - Only handles milestone selection
 * ECP-B1: DRY - Reusable across create/edit forms
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Select } from '@mantine/core'
import { api } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'
import type { Milestone } from '@/types/issue'

interface MilestoneSelectorProps {
  projectId: string
  value: string | null // Milestone ID
  onChange: (milestoneId: string | null) => void
  disabled?: boolean
}

export function MilestoneSelector({
  projectId,
  value,
  onChange,
  disabled = false,
}: MilestoneSelectorProps) {
  const { t } = useLanguage()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.milestones.list(projectId)
      // ECP-C1: Only show OPEN milestones for selection
      setMilestones(data.filter((m) => m.state === 'OPEN'))
    } catch (error) {
      console.error('Failed to load milestones:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadMilestones()
  }, [loadMilestones])

  // Convert milestones to Mantine Select format
  const options = milestones.map((milestone) => ({
    value: milestone.id,
    label: milestone.title,
  }))

  return (
    <Select
      label={t.issues.create.milestoneLabel}
      placeholder={t.issues.create.milestonePlaceholder}
      data={options}
      value={value}
      onChange={onChange}
      disabled={disabled || loading}
      searchable
      clearable
      nothingFoundMessage={t.issues.milestones.noOpenMilestones}
      styles={{
        dropdown: {
          maxHeight: '300px',
          overflowY: 'auto',
        },
      }}
    />
  )
}
