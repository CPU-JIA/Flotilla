/**
 * AssigneesSelector Component
 *
 * Multi-select dropdown for choosing issue assignees
 *
 * ECP-A1: Single Responsibility - Only handles assignee selection
 * ECP-B1: DRY - Reusable across create/edit forms
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { MultiSelect } from '@mantine/core'
import { api } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'
import { User } from 'lucide-react'
import type { Project } from '@/types/project'

interface AssigneesSelectorProps {
  projectId: string
  value: string[] // Array of user IDs
  onChange: (assigneeIds: string[]) => void
  disabled?: boolean
}

export function AssigneesSelector({
  projectId,
  value,
  onChange,
  disabled = false,
}: AssigneesSelectorProps) {
  const { t } = useLanguage()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProject = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.projects.getById(projectId)
      setProject(data)
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  // ECP-C1: Convert project members to MultiSelect format
  const options = (project?.members || []).map((member) => ({
    value: member.userId,
    label: member.user?.username || member.userId,
    email: member.user?.email,
    avatar: member.user?.avatar,
  }))

  return (
    <MultiSelect
      label={t.issues.create.assigneesLabel}
      placeholder={t.issues.create.assigneesPlaceholder}
      data={options}
      value={value}
      onChange={onChange}
      disabled={disabled || loading}
      searchable
      clearable
      nothingFoundMessage={t.issues.create.noMembers}
      maxDropdownHeight={300}
      renderOption={({ option }) => {
        const member = (project?.members || []).find((m) => m.userId === option.value)
        return (
          <div className="flex items-center gap-2 py-1">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              {member?.user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.user.avatar}
                  alt={member.user.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{option.label}</div>
              {member?.user?.email && (
                <div className="text-xs text-muted-foreground truncate">{member.user.email}</div>
              )}
            </div>
          </div>
        )
      }}
    />
  )
}
