/**
 * AssigneesList Component
 *
 * Display assigned users as avatar list
 *
 * ECP-A1: Single Responsibility - Only displays assignee avatars
 * ECP-B2: KISS - Simple horizontal avatar layout
 * 🔒 REFACTOR: 支持新的 assignees 关联表结构
 */

'use client'

import { Users } from 'lucide-react'
import type { IssueAssignee } from '@/types/issue'

interface AssigneesListProps {
  // 🔒 REFACTOR: 支持新格式 (优先) 或旧格式 (兼容)
  assignees?: IssueAssignee[]; // 新格式: 包含完整用户信息
  assigneeIds?: string[]; // 旧格式: 仅ID数组 (已废弃)
  maxDisplay?: number; // Maximum avatars to display before showing "+N"
  size?: 'sm' | 'md' | 'lg';
}

export function AssigneesList({
  assignees,
  assigneeIds,
  maxDisplay = 5,
  size = 'md',
}: AssigneesListProps) {
  // 🔒 REFACTOR: 优先使用新格式，回退到旧格式
  const assigneeList = assignees || [];
  const hasAssignees = assigneeList.length > 0 || (assigneeIds && assigneeIds.length > 0);

  // ECP-B2: Size configurations
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  if (!hasAssignees) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>未分配</span>
      </div>
    )
  }

  // 🔒 REFACTOR: 如果是旧格式，显示占位符
  if (!assignees && assigneeIds) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{assigneeIds.length} 位被分配人</span>
      </div>
    )
  }

  const displayedAssignees = assigneeList.slice(0, maxDisplay)
  const remainingCount = assigneeList.length - maxDisplay

  return (
    <div className="flex items-center gap-1">
      {displayedAssignees.map((assignee) => (
        <div
          key={assignee.id}
          className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center flex-shrink-0 border-2 border-background relative group`}
          title={`${assignee.user.username} (${assignee.user.email})`}
        >
          {/* 暂时使用首字母头像，后续集成头像服务 */}
          <div className={`${sizeClasses[size]} rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold`}>
            {assignee.user.username[0].toUpperCase()}
          </div>

          {/* Tooltip on hover */}
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {assignee.user.username}
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
