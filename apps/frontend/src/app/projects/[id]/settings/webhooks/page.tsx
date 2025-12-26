/**
 * Webhooks Management Page
 * ECP-A1: SOLID - Single Responsibility - Webhook management
 * ECP-C1: Defensive Programming - Error handling and loading states
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Trash2, ExternalLink, Check, X, Clock, Plus, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { WebhookDialog } from '@/components/webhooks/WebhookDialog'
import type { Webhook, CreateWebhookDto, UpdateWebhookDto } from '@/types/webhook'
import { useToast } from '@/hooks/use-toast'

export default function WebhooksPage() {
  const params = useParams()
  const projectId = params.id as string
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)
  const [_submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const loadWebhooks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.webhooks.list(projectId)
      setWebhooks(data)
    } catch (error) {
      console.error('Failed to load webhooks:', error)
      toast({
        title: 'Error',
        description: 'Failed to load webhooks',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => {
    loadWebhooks()
  }, [loadWebhooks])

  const handleCreate = () => {
    setEditingWebhook(null)
    setDialogOpen(true)
  }

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: CreateWebhookDto | UpdateWebhookDto) => {
    try {
      setSubmitting(true)
      if (editingWebhook) {
        await api.webhooks.update(editingWebhook.id, data)
        toast({
          title: 'Success',
          description: 'Webhook updated successfully',
        })
      } else {
        await api.webhooks.create(projectId, data as CreateWebhookDto)
        toast({
          title: 'Success',
          description: 'Webhook created successfully',
        })
      }
      await loadWebhooks()
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to save webhook:', error)
      toast({
        title: 'Error',
        description: 'Failed to save webhook',
        variant: 'destructive',
      })
      throw error
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (webhook: Webhook) => {
    if (!confirm(`Delete webhook?

URL: ${webhook.url}`)) return
    try {
      await api.webhooks.delete(webhook.id)
      toast({
        title: 'Success',
        description: 'Webhook deleted successfully',
      })
      await loadWebhooks()
    } catch (error) {
      console.error('Failed to delete webhook:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive',
      })
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">Loading webhooks...</div>
    </div>
  )

  return (
    <>
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Webhooks</h1>
            <p className="text-muted-foreground mt-1">
              {webhooks.length === 0
                ? 'Manage webhook endpoints to receive real-time events'
                : `${webhooks.length} webhook${webhooks.length === 1 ? '' : 's'} configured`}
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        </div>

        {webhooks.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">No webhooks configured</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Webhooks allow external services to be notified when events happen in your project.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="border rounded-lg p-6 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <code className="text-sm bg-muted px-2 py-1 rounded font-mono break-all">
                        {webhook.url}
                      </code>
                      <Badge variant={webhook.active ? "default" : "secondary"}>
                        {webhook.active ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        {webhook.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Events:</span>
                      <div className="flex flex-wrap gap-2">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="font-normal">{event}</Badge>
                        ))}
                      </div>
                    </div>
                    {webhook._count && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{webhook._count.deliveries} deliveries</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(webhook.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(webhook)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(webhook)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook Dialog */}
      <WebhookDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editingWebhook ? 'edit' : 'create'}
        webhook={editingWebhook || undefined}
        onSubmit={handleSubmit}
      />
    </>
  )
}
