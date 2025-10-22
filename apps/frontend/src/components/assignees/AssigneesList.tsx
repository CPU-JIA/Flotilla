/**
 * AssigneesList Component
 *
 * Display assigned users as avatar list
 *
 * ECP-A1: Single Responsibility - Only displays assignee avatars
 * ECP-B2: KISS - Simple horizontal avatar layout
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useLanguage } from '@/contexts/language-context'
import { User, Users } from 'lucide-react'
import type { Project } from '@/types/project'

interface AssigneesListProps {
  projectId: string
  assigneeIds: string[]
  maxDisplay?: number // Maximum avatars to display before showing "+N"
  size?: 'sm' | 'md' | 'lg'
}

export function AssigneesList({
  projectId,
  assigneeIds,
  maxDisplay = 5,
  size = 'md',
}: AssigneesListProps) {
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

  // ECP-C1: Filter members who are assignees
  const assignees = (project?.members || []).filter((member) =>
    assigneeIds.includes(member.userId)
  )

  // ECP-B2: Size configurations
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className={`${sizeClasses[size]} rounded-full bg-muted animate-pulse`} />
      </div>
    )
  }

  if (assigneeIds.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{t.issues.detail.noAssignees}</span>
      </div>
    )
  }

  const displayedAssignees = assignees.slice(0, maxDisplay)
  const remainingCount = assignees.length - maxDisplay

  return (
    <div className="flex items-center gap-1">
      {displayedAssignees.map((member) => (
        <div
          key={member.userId}
          className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center flex-shrink-0 border-2 border-background relative group`}
          title={`${member.user?.username || 'Unknown'} (${member.user?.email || ''})`}
        >
          {member.user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.user.avatar}
              alt={member.user.username}
              className={`${sizeClasses[size]} rounded-full object-cover`}
            />
          ) : (
            <User className={`${iconSizes[size]} text-muted-foreground`} />
          )}

          {/* Tooltip on hover */}
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {member.user?.username || 'Unknown'}
          </div>
        </div>
      ))}

      {/* "+N" indicator for remaining assignees */}
      {remainingCount > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center flex-shrink-0 border-2 border-background font-semibold text-muted-foreground`}
          title={`${remainingCount} more assignee${remainingCount > 1 ? 's' : ''}`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
