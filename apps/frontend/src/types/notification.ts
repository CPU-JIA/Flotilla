/**
 * Notification types for frontend
 * Maps to backend NotificationType enum
 */

export enum NotificationType {
  PR_CREATED = 'PR_CREATED',
  PR_MERGED = 'PR_MERGED',
  PR_CLOSED = 'PR_CLOSED',
  PR_REVIEWED = 'PR_REVIEWED',
  PR_COMMENTED = 'PR_COMMENTED',
  ISSUE_MENTIONED = 'ISSUE_MENTIONED',
  ISSUE_ASSIGNED = 'ISSUE_ASSIGNED',
  ISSUE_COMMENTED = 'ISSUE_COMMENTED',
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body?: string
  read: boolean
  link?: string
  metadata?: Record<string, any>
  createdAt: string
}

export interface NotificationPreference {
  id: string
  userId: string

  // PR notifications
  prCreated: boolean
  prMerged: boolean
  prReviewed: boolean
  prCommented: boolean

  // Issue notifications
  issueMentioned: boolean
  issueAssigned: boolean
  issueCommented: boolean

  // Email notifications
  emailNotifications: boolean

  createdAt: string
  updatedAt: string
}

export interface QueryNotificationsDto {
  read?: boolean
  page?: number
  pageSize?: number
}

export interface NotificationListResponse {
  notifications: Notification[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
