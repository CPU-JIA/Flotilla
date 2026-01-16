/**
 * LabelSelector Component
 *
 * Multi-select dropdown for choosing labels in Issue forms
 *
 * ECP-A1: Single Responsibility - Only handles label selection
 * ECP-B1: DRY - Reusable across create/edit forms
 */

'use client'

import { logger } from '@/lib/logger'
import { useState, useEffect, useCallback } from 'react'
import { MultiSelect } from '@mantine/core'
import { api } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'
import type { Label } from '@/types/issue'

interface LabelSelectorProps {
  projectId: string
  value: string[] // Array of label IDs
  onChange: (labelIds: string[]) => void
  disabled?: boolean
}

export function LabelSelector({
  projectId,
  value,
  onChange,
  disabled = false,
}: LabelSelectorProps) {
  const { t } = useLanguage()
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)

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

  // Convert labels to Mantine MultiSelect format
  const options = labels.map((label) => ({
    value: label.id,
    label: label.name,
    // Store color in data attribute for custom rendering
    color: label.color,
  }))

  return (
    <MultiSelect
      label={t.issues.create.labelsLabel}
      placeholder={t.issues.create.labelsPlaceholder}
      data={options}
      value={value}
      onChange={onChange}
      disabled={disabled || loading}
      searchable
      clearable
      nothingFoundMessage={t.issues.labels.noLabels}
      styles={{
        pill: {
          backgroundColor: 'var(--mantine-color-gray-1)',
          border: '1px solid var(--mantine-color-gray-3)',
        },
      }}
      // Custom item rendering with color badge
      renderOption={({ option }) => {
        const label = labels.find((l) => l.id === option.value)
        return (
          <div className="flex items-center gap-2">
            {label && (
              <div
                className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: label.color }}
              />
            )}
            <span>{option.label}</span>
          </div>
        )
      }}
    />
  )
}
