/**
 * Webhook Types
 * ECP-A1: SOLID - Single Responsibility - Webhook type definitions
 */

export interface Webhook {
  id: string
  projectId: string
  url: string
  secret?: string
  events: string[]
  active: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    deliveries: number
  }
}

export interface CreateWebhookDto {
  url: string
  events: string[]
  secret?: string
  active?: boolean
}

export interface UpdateWebhookDto {
  url?: string
  events?: string[]
  secret?: string
  active?: boolean
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  payload: Record<string, unknown>
  responseStatus?: number
  responseBody?: string
  deliveredAt: string
  success: boolean
}

// Available webhook events
export const WEBHOOK_EVENTS = [
  'push',
  'pull_request.opened',
  'pull_request.closed',
  'pull_request.merged',
  'issue.opened',
  'issue.closed',
  'issue.comment',
  'branch.created',
  'branch.deleted',
  'tag.created',
  'release.published',
] as const

export type WebhookEvent = typeof WEBHOOK_EVENTS[number]
