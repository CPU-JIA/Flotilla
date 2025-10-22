'use client'

/**
 * 创建项目对话框组件
 * ECP-A1: 单一职责 - 仅负责项目创建逻辑
 * ECP-C1: 防御性编程 - 完整的表单验证和项目限制检查
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'
import { api, ApiError } from '@/lib/api'
import type { CreateProjectRequest } from '@/types/project'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500
const MAX_PROJECTS_USER = 10

interface CreateProjectDialogProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function CreateProjectDialog({ onSuccess, trigger }: CreateProjectDialogProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingLimit, setIsCheckingLimit] = useState(false)
  const [error, setError] = useState('')
  const [projectCount, setProjectCount] = useState(0)

  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    visibility: 'PRIVATE',
  })

  /**
   * 检查用户项目数量限制
   * ECP-C1: 防御性编程 - 用户限制检查
   * 优化：SUPER_ADMIN跳过检查，避免不必要的API调用和按钮延迟
   */
  useEffect(() => {
    if (open && user) {
      // SUPER_ADMIN无项目限制，跳过检查
      if (user.role === 'SUPER_ADMIN') {
        setIsCheckingLimit(false)
        setProjectCount(0)
        return
      }

      setIsCheckingLimit(true)
      api.projects
        .getAll({ page: 1, pageSize: 1 })
        .then((response) => {
          setProjectCount(response.total)
          // 检查是否达到限制
          if (response.total >= MAX_PROJECTS_USER) {
            setError(
              `普通用户最多创建${MAX_PROJECTS_USER}个项目。当前已有${response.total}个项目。`
            )
          }
        })
        .catch(() => {
          setError('无法获取项目数量，请稍后重试')
        })
        .finally(() => {
          setIsCheckingLimit(false)
        })
    }
  }, [open, user])

  const handleChange = (field: keyof CreateProjectRequest, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    })
    if (error) setError('')
  }

  /**
   * 表单提交处理
   * ECP-C1: 防御性编程 - 完整的客户端验证
   * ECP-C2: 系统化错误处理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 前端验证
    const trimmedName = formData.name.trim()
    if (!trimmedName || trimmedName.length < 3) {
      setError('项目名称至少需要3个字符')
      return
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`项目名称最多${MAX_NAME_LENGTH}个字符`)
      return
    }

    const trimmedDescription = formData.description?.trim() || ''
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(`项目描述最多${MAX_DESCRIPTION_LENGTH}个字符`)
      return
    }

    // 检查项目数量限制
    if (user?.role !== 'SUPER_ADMIN' && projectCount >= MAX_PROJECTS_USER) {
      setError(`普通用户最多创建${MAX_PROJECTS_USER}个项目`)
      return
    }

    setIsLoading(true)

    try {
      const project = await api.projects.create({
        ...formData,
        name: trimmedName,
        description: trimmedDescription || undefined,
      })

      // 立即跳转（在关闭对话框前），确保路由跳转不被打断
      router.push(`/projects/${project.id}`)

      // 清理状态并关闭对话框
      setFormData({ name: '', description: '', visibility: 'PRIVATE' })
      setOpen(false)

      // 执行回调（如果需要刷新列表）
      onSuccess?.()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '创建项目失败')
      } else {
        setError('网络错误，请稍后重试')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <span className="mr-2">+</span> 创建项目
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>创建新项目</DialogTitle>
            <DialogDescription>填写项目信息以创建一个新的开发项目</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 项目数量提示 */}
            {user && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-md text-sm">
                {user.role === 'SUPER_ADMIN' ? (
                  <p>✨ 您是超级管理员，可以创建无限个项目</p>
                ) : (
                  <p>
                    📊 当前已创建 {projectCount} / {MAX_PROJECTS_USER} 个项目
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="name">项目名称 *</Label>
                <span
                  className={`text-xs ${formData.name.length > MAX_NAME_LENGTH ? 'text-red-600' : 'text-gray-500'}`}
                >
                  {formData.name.length} / {MAX_NAME_LENGTH}
                </span>
              </div>
              <Input
                id="name"
                placeholder="请输入项目名称（3-100个字符）"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={isLoading || isCheckingLimit}
                required
              />
              <p className="text-xs text-gray-500">项目名称必须唯一且长度在3-100字符之间</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">项目描述</Label>
                <span
                  className={`text-xs ${(formData.description?.length || 0) > MAX_DESCRIPTION_LENGTH ? 'text-red-600' : 'text-gray-500'}`}
                >
                  {formData.description?.length || 0} / {MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <Textarea
                id="description"
                placeholder="请输入项目描述（可选，最多500字符）"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isLoading || isCheckingLimit}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">项目可见性 *</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => handleChange('visibility', value as 'PUBLIC' | 'PRIVATE')}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择可见性" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">私有 - 仅项目成员可见</SelectItem>
                  <SelectItem value="PUBLIC">公开 - 所有人可见</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading || isCheckingLimit}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                isCheckingLimit ||
                (user?.role !== 'SUPER_ADMIN' && projectCount >= MAX_PROJECTS_USER)
              }
            >
              {isCheckingLimit ? '检查中...' : isLoading ? '创建中...' : '创建项目'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
