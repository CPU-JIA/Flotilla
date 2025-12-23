'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface PipelineFormProps {
  projectId: string
  pipeline?: any
  onSuccess?: () => void
}

export function PipelineForm({ projectId, pipeline, onSuccess }: PipelineFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: pipeline?.name || '',
    configYaml: pipeline?.config
      ? JSON.stringify(pipeline.config, null, 2)
      : `{
  "steps": [
    {
      "name": "Checkout",
      "run": "git checkout"
    },
    {
      "name": "Install Dependencies",
      "run": "pnpm install"
    },
    {
      "name": "Build",
      "run": "pnpm build"
    },
    {
      "name": "Test",
      "run": "pnpm test"
    }
  ]
}`,
    triggers: {
      push: pipeline?.triggers?.includes('push') ?? true,
      pull_request: pipeline?.triggers?.includes('pull_request') ?? false,
      manual: pipeline?.triggers?.includes('manual') ?? true,
    },
    active: pipeline?.active ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 解析配置 JSON
      const config = JSON.parse(formData.configYaml)

      // 构建触发器数组
      const triggers = Object.entries(formData.triggers)
        .filter(([_, enabled]) => enabled)
        .map(([trigger]) => trigger)

      const payload = {
        name: formData.name,
        config,
        triggers,
        active: formData.active,
      }

      if (pipeline) {
        // 更新
        await api.put(`/pipelines/${pipeline.id}`, payload)
      } else {
        // 创建
        await api.post(`/projects/${projectId}/pipelines`, payload)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/projects/${projectId}/pipelines`)
      }
    } catch (error: any) {
      console.error('Failed to save pipeline:', error)
      alert(error.response?.data?.message || '保存失败，请检查配置格式是否正确')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">基本信息</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">流水线名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: Build and Test"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, active: checked as boolean })
              }
            />
            <Label htmlFor="active" className="cursor-pointer">
              激活流水线
            </Label>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">触发条件</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="trigger-push"
              checked={formData.triggers.push}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  triggers: { ...formData.triggers, push: checked as boolean },
                })
              }
            />
            <Label htmlFor="trigger-push" className="cursor-pointer">
              Push 事件（代码推送时触发）
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trigger-pr"
              checked={formData.triggers.pull_request}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  triggers: {
                    ...formData.triggers,
                    pull_request: checked as boolean,
                  },
                })
              }
            />
            <Label htmlFor="trigger-pr" className="cursor-pointer">
              Pull Request 事件（PR创建或更新时触发）
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trigger-manual"
              checked={formData.triggers.manual}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  triggers: { ...formData.triggers, manual: checked as boolean },
                })
              }
            />
            <Label htmlFor="trigger-manual" className="cursor-pointer">
              手动触发
            </Label>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">流水线配置</h2>
        <div>
          <Label htmlFor="config">配置（JSON格式）*</Label>
          <p className="text-sm text-gray-600 mb-2">
            定义流水线的执行步骤，兼容 GitHub Actions 格式
          </p>
          <Textarea
            id="config"
            value={formData.configYaml}
            onChange={(e) => setFormData({ ...formData, configYaml: e.target.value })}
            rows={15}
            className="font-mono text-sm"
            placeholder="请输入流水线配置（JSON格式）"
            required
          />
        </div>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : pipeline ? '更新流水线' : '创建流水线'}
        </Button>
      </div>
    </form>
  )
}
