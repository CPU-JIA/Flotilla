'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import type { Notification } from '@/types/notification'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { isAuthenticated } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount()
      // Poll every 30 seconds for updates
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const fetchUnreadCount = async () => {
    try {
      const data = await apiRequest<{ notifications: Notification[]; total: number }>(
        '/notifications?read=false&pageSize=1'
      )
      setUnreadCount(data.total)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <Link href="/notifications" className={className}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        title="通知"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  )
}
