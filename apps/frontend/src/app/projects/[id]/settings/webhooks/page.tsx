'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button, TextInput, MultiSelect, Switch, Table, Badge, Modal, Loader } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'

interface Webhook {
  id: string
  projectId: string
  url: string
  secret: string
  events: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  statusCode: number | null
  success: boolean
  duration: number | null
  deliveredAt: string
  error: string | null
}

const EVENT_OPTIONS = [
  { value: 'push', label: 'Push - 代码推送' },
  { value: 'pull_request.*', label: 'Pull Request - 所有 PR 事件' },
  { value: 'pull_request.opened', label: 'Pull Request Opened - PR 创建' },
  { value: 'pull_request.closed', label: 'Pull Request Closed - PR 关闭' },
  { value: 'pull_request.merged', label: 'Pull Request Merged - PR 合并' },
  { value: 'issue.*', label: 'Issue - 所有 Issue 事件' },
  { value: 'issue.opened', label: 'Issue Opened - Issue 创建' },
  { value: 'issue.closed', label: 'Issue Closed - Issue 关闭' },
  { value: 'comment.created', label: 'Comment Created - 评论创建' },
]

export default function WebhooksPage() {
  const params = useParams()
  const projectId = params.id as string

  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deliveriesModalOpen, setDeliveriesModalOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])

  // 创建表单状态
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [active, setActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 加载 Webhooks
  const loadWebhooks = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/projects/${projectId}/webhooks`)
      setWebhooks(response.data)
    } catch (error: any) {
      notifications.show({
        title: '加载失败',
        message: error.response?.data?.message || '加载 Webhook 列表失败',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // 创建 Webhook
  const handleCreate = async () => {
    if (!url || selectedEvents.length === 0) {
      notifications.show({
        title: '表单验证失败',
        message: '请填写 URL 并选择至少一个事件',
        color: 'yellow',
      })
      return
    }

    try {
      setSubmitting(true)
      await api.post(`/projects/${projectId}/webhooks`, {
        url,
        events: selectedEvents,
        active,
      })
      notifications.show({
        title: '创建成功',
        message: 'Webhook 已创建',
        color: 'green',
      })
      setCreateModalOpen(false)
      setUrl('')
      setSelectedEvents([])
      setActive(true)
      await loadWebhooks()
    } catch (error: any) {
      notifications.show({
        title: '创建失败',
        message: error.response?.data?.message || '创建 Webhook 失败',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // 删除 Webhook
  const handleDelete = async (webhookId: string) => {
    if (!confirm('确定要删除这个 Webhook 吗？')) return

    try {
      await api.delete(`/projects/${projectId}/webhooks/${webhookId}`)
      notifications.show({
        title: '删除成功',
        message: 'Webhook 已删除',
        color: 'green',
      })
      await loadWebhooks()
    } catch (error: any) {
      notifications.show({
        title: '删除失败',
        message: error.response?.data?.message || '删除 Webhook 失败',
        color: 'red',
      })
    }
  }

  // 切换激活状态
  const handleToggleActive = async (webhook: Webhook) => {
    try {
      await api.put(`/projects/${projectId}/webhooks/${webhook.id}`, {
        active: !webhook.active,
      })
      notifications.show({
        title: '更新成功',
        message: `Webhook 已${!webhook.active ? '激活' : '禁用'}`,
        color: 'green',
      })
      await loadWebhooks()
    } catch (error: any) {
      notifications.show({
        title: '更新失败',
        message: error.response?.data?.message || '更新 Webhook 失败',
        color: 'red',
      })
    }
  }

  // 查看投递历史
  const handleViewDeliveries = async (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setDeliveriesModalOpen(true)
    try {
      const response = await api.get(`/projects/${projectId}/webhooks/${webhook.id}/deliveries`)
      setDeliveries(response.data.deliveries)
    } catch (error: any) {
      notifications.show({
        title: '加载失败',
        message: error.response?.data?.message || '加载投递历史失败',
        color: 'red',
      })
    }
  }

  // 重试投递
  const handleRetry = async (deliveryId: string) => {
    try {
      await api.post(
        `/projects/${projectId}/webhooks/${selectedWebhook?.id}/deliveries/${deliveryId}/retry`
      )
      notifications.show({
        title: '重试成功',
        message: '投递已重新发送',
        color: 'green',
      })
      if (selectedWebhook) {
        await handleViewDeliveries(selectedWebhook)
      }
    } catch (error: any) {
      notifications.show({
        title: '重试失败',
        message: error.response?.data?.message || '重试投递失败',
        color: 'red',
      })
    }
  }

  useEffect(() => {
    loadWebhooks()
  }, [projectId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-gray-500">配置 Webhook 以接收项目事件通知</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>创建 Webhook</Button>
      </div>

      {webhooks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">还没有配置 Webhook</p>
          <Button onClick={() => setCreateModalOpen(true)}>创建第一个 Webhook</Button>
        </div>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>URL</Table.Th>
              <Table.Th>事件</Table.Th>
              <Table.Th>状态</Table.Th>
              <Table.Th>创建时间</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {webhooks.map((webhook) => (
              <Table.Tr key={webhook.id}>
                <Table.Td>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{webhook.url}</code>
                </Table.Td>
                <Table.Td>
                  <div className="flex gap-1 flex-wrap">
                    {webhook.events.map((event) => (
                      <Badge key={event} size="sm" variant="light">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </Table.Td>
                <Table.Td>
                  <Switch
                    checked={webhook.active}
                    onChange={() => handleToggleActive(webhook)}
                    label={webhook.active ? '激活' : '禁用'}
                  />
                </Table.Td>
                <Table.Td>{new Date(webhook.createdAt).toLocaleString('zh-CN')}</Table.Td>
                <Table.Td>
                  <div className="flex gap-2">
                    <Button size="xs" variant="light" onClick={() => handleViewDeliveries(webhook)}>
                      投递历史
                    </Button>
                    <Button size="xs" color="red" variant="light" onClick={() => handleDelete(webhook.id)}>
                      删除
                    </Button>
                  </div>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* 创建 Webhook Modal */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="创建 Webhook"
        size="lg"
      >
        <div className="space-y-4">
          <TextInput
            label="Payload URL"
            placeholder="https://example.com/webhook"
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
            required
          />
          <MultiSelect
            label="订阅事件"
            placeholder="选择事件类型"
            data={EVENT_OPTIONS}
            value={selectedEvents}
            onChange={setSelectedEvents}
            required
            searchable
          />
          <Switch label="激活 Webhook" checked={active} onChange={(e) => setActive(e.currentTarget.checked)} />
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="light" onClick={() => setCreateModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              创建
            </Button>
          </div>
        </div>
      </Modal>

      {/* 投递历史 Modal */}
      <Modal
        opened={deliveriesModalOpen}
        onClose={() => setDeliveriesModalOpen(false)}
        title={`投递历史 - ${selectedWebhook?.url}`}
        size="xl"
      >
        {deliveries.length === 0 ? (
          <p className="text-gray-500 text-center py-8">还没有投递记录</p>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>事件</Table.Th>
                <Table.Th>状态</Table.Th>
                <Table.Th>响应码</Table.Th>
                <Table.Th>耗时</Table.Th>
                <Table.Th>时间</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {deliveries.map((delivery) => (
                <Table.Tr key={delivery.id}>
                  <Table.Td>
                    <Badge size="sm">{delivery.event}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={delivery.success ? 'green' : 'red'}>
                      {delivery.success ? '成功' : '失败'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{delivery.statusCode || '-'}</Table.Td>
                  <Table.Td>{delivery.duration ? `${delivery.duration}ms` : '-'}</Table.Td>
                  <Table.Td>{new Date(delivery.deliveredAt).toLocaleString('zh-CN')}</Table.Td>
                  <Table.Td>
                    {!delivery.success && (
                      <Button size="xs" variant="light" onClick={() => handleRetry(delivery.id)}>
                        重试
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>
    </div>
  )
}
