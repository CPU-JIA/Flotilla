'use client'

import { logger } from '@/lib/logger'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'
import { Notification, NotificationListResponse, NotificationType } from '@/types/notification'
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'

export default function NotificationsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { language } = useLanguage()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (filter === 'unread') {
        params.append('read', 'false')
      }

      const data = await apiRequest<NotificationListResponse>(`/notifications?${params.toString()}`)
      setNotifications(data.notifications)
      setTotal(data.total)
      setHasMore(data.hasMore)
    } catch (err) {
      logger.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filter])

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
    }
  }, [isAuthenticated, page, filter, fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, {
        method: 'PATCH',
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (err) {
      logger.error('Failed to mark as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', {
        method: 'PATCH',
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      logger.error('Failed to mark all as read:', err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}`, {
        method: 'DELETE',
      })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setTotal((prev) => prev - 1)
    } catch (err) {
      logger.error('Failed to delete notification:', err)
    }
  }

  const getNotificationIcon = () => {
    return <Bell className="h-5 w-5" />
  }

  const getNotificationColor = (type: NotificationType) => {
    if (type.startsWith('PR_')) return 'text-purple-600 dark:text-purple-400'
    if (type.startsWith('ISSUE_')) return 'text-blue-600 dark:text-blue-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div
        className="bg-card rounded-[14px] p-6"
        style={{ boxShadow: '10px 10px 15px rgba(0,0,0,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-7 w-7" />
              {language === 'zh' ? '通知中心' : 'Notifications'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'zh' ? `共 ${total} 条通知` : `${total} notifications`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
            >
              {filter === 'all'
                ? language === 'zh'
                  ? '仅未读'
                  : 'Unread Only'
                : language === 'zh'
                  ? '全部'
                  : 'All'}
            </Button>
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              {language === 'zh' ? '全部标记为已读' : 'Mark All Read'}
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === 'zh' ? '暂无通知' : 'No notifications'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                  group relative border rounded-lg p-4 transition-colors
                  ${notification.read ? 'bg-muted/30' : 'bg-accent/50 border-accent'}
                  hover:bg-accent/30
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{notification.title}</h3>
                        {notification.body && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: language === 'zh' ? zhCN : enUS,
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markAsRead(notification.id)}
                            title={language === 'zh' ? '标记为已读' : 'Mark as read'}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {notification.link && (
                          <Link href={notification.link}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={language === 'zh' ? '查看详情' : 'View details'}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteNotification(notification.id)}
                          title={language === 'zh' ? '删除' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && notifications.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {language === 'zh' ? '上一页' : 'Previous'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {language === 'zh' ? `第 ${page} 页` : `Page ${page}`}
            </span>
            <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!hasMore}>
              {language === 'zh' ? '下一页' : 'Next'}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
