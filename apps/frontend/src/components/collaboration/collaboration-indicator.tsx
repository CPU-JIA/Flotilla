'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { CollaborationUser } from '@/hooks/useCollaboration'

/**
 * CollaborationIndicator 组件属性
 */
export interface CollaborationIndicatorProps {
  activeUsers: CollaborationUser[]
  yourColor: string | null
  connected: boolean
  className?: string
}

/**
 * 协作用户指示器组件
 *
 * 显示当前协作编辑的用户列表
 *
 * ECP-B2: KISS - 简单直观的UI组件
 * ECP-D1: 可测试性 - 纯展示组件，易于测试
 */
export function CollaborationIndicator({
  activeUsers,
  yourColor,
  connected,
  className,
}: CollaborationIndicatorProps) {
  if (!connected || activeUsers.length === 0) {
    return null
  }

  return (
    <div
      className={cn('flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border', className)}
    >
      <div className="flex items-center gap-1">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          )}
        />
        <span className="text-xs text-muted-foreground">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="w-px h-4 bg-border" />

      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">
          {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'} editing
        </span>
      </div>

      <div className="flex -space-x-2">
        {activeUsers.slice(0, 5).map((user) => (
          <div key={user.id} className="relative" title={user.username}>
            <Avatar className="w-7 h-7 border-2" style={{ borderColor: user.color }}>
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback style={{ backgroundColor: user.color }}>
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        ))}
        {activeUsers.length > 5 && (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted border-2 border-background text-xs">
            +{activeUsers.length - 5}
          </div>
        )}
      </div>

      {yourColor && (
        <>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Your color:</span>
            <div
              className="w-4 h-4 rounded border-2 border-background shadow-sm"
              style={{ backgroundColor: yourColor }}
            />
          </div>
        </>
      )}
    </div>
  )
}
