'use client'

/**
 * 创建团队对话框组件
 * ECP-A1: 单一职责 - 仅负责团队创建逻辑
 * ECP-C1: 防御性编程 - 完整的表单验证和slug格式检查
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useLanguage } from '@/contexts/language-context'
import { api, ApiError } from '@/lib/api'
import type { CreateTeamRequest } from '@/types/team'

const MAX_NAME_LENGTH = 100
const MAX_SLUG_LENGTH = 50
const MAX_DESCRIPTION_LENGTH = 500

interface CreateTeamDialogProps {
  organizationSlug: string
  onSuccess?: () => void
  trigger?: React.ReactNode
}

/**
 * 将名称转换为URL友好的slug
 * ECP-B1: DRY原则 - 提取slug生成逻辑
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // 移除非法字符
    .replace(/\s+/g, '-') // 空格转连字符
    .replace(/-+/g, '-') // 多个连字符合并
    .replace(/^-|-$/g, '') // 移除首尾连字符
}

/**
 * 验证slug格式
 * ECP-C1: 防御性编程 - 严格的格式验证
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && !slug.startsWith('-') && !slug.endsWith('-')
}

export function CreateTeamDialog({ organizationSlug, onSuccess, trigger }: CreateTeamDialogProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const [formData, setFormData] = useState<Omit<CreateTeamRequest, 'organizationSlug'>>({
    name: '',
    slug: '',
    description: '',
  })

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    })

    // 如果修改name且slug未手动编辑，自动生成slug
    if (field === 'name' && !slugManuallyEdited) {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: nameToSlug(value),
      }))
    }

    // 如果用户手动编辑slug，标记为已手动编辑
    if (field === 'slug') {
      setSlugManuallyEdited(true)
    }

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
    if (!trimmedName || trimmedName.length < 2) {
      setError(t.loading === t.loading ? '团队名称至少需要2个字符' : 'Team name requires at least 2 characters')
      return
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(t.loading === t.loading ? `团队名称最多${MAX_NAME_LENGTH}个字符` : `Team name max ${MAX_NAME_LENGTH} characters`)
      return
    }

    const trimmedSlug = formData.slug.trim()
    if (!trimmedSlug || trimmedSlug.length < 2) {
      setError(t.loading === t.loading ? '团队标识至少需要2个字符' : 'Team slug requires at least 2 characters')
      return
    }
    if (trimmedSlug.length > MAX_SLUG_LENGTH) {
      setError(t.loading === t.loading ? `团队标识最多${MAX_SLUG_LENGTH}个字符` : `Team slug max ${MAX_SLUG_LENGTH} characters`)
      return
    }
    if (!isValidSlug(trimmedSlug)) {
      setError(t.teams.slugHelper)
      return
    }

    const trimmedDescription = formData.description?.trim() || ''
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(t.loading === t.loading ? `描述最多${MAX_DESCRIPTION_LENGTH}个字符` : `Description max ${MAX_DESCRIPTION_LENGTH} characters`)
      return
    }

    setIsLoading(true)

    try {
      const team = await api.teams.create(organizationSlug, {
        organizationSlug,
        name: trimmedName,
        slug: trimmedSlug,
        description: trimmedDescription || undefined,
      })

      setOpen(false)
      setFormData({ name: '', slug: '', description: '' })
      setSlugManuallyEdited(false)

      // 先执行回调刷新列表
      onSuccess?.()

      // 延迟跳转以确保用户看到成功反馈
      setTimeout(() => {
        router.push(`/organizations/${organizationSlug}/teams/${team.slug}`)
      }, 500)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t.error)
      } else {
        setError(t.editor.networkError)
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
            <span className="mr-2">+</span> {t.teams.createNew}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t.teams.createNew}</DialogTitle>
            <DialogDescription>
              {t.loading === t.loading
                ? '填写团队信息以创建一个新的团队'
                : 'Fill in team details to create a new team'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="name">{t.teams.name} *</Label>
                <span className={`text-xs ${formData.name.length > MAX_NAME_LENGTH ? 'text-red-600' : 'text-gray-500'}`}>
                  {formData.name.length} / {MAX_NAME_LENGTH}
                </span>
              </div>
              <Input
                id="name"
                placeholder={t.loading === t.loading ? '请输入团队名称（2-100个字符）' : 'Enter team name (2-100 characters)'}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="slug">{t.teams.slug} *</Label>
                <span className={`text-xs ${
                  formData.slug.length > MAX_SLUG_LENGTH ? 'text-red-600' :
                  formData.slug && !isValidSlug(formData.slug) ? 'text-orange-600' :
                  'text-gray-500'
                }`}>
                  {formData.slug.length} / {MAX_SLUG_LENGTH}
                </span>
              </div>
              <Input
                id="slug"
                placeholder={t.loading === t.loading ? '团队URL标识（如：frontend-team）' : 'Team URL slug (e.g., frontend-team)'}
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value.toLowerCase())}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500">
                {t.teams.slugHelper}
              </p>
              {formData.slug && !isValidSlug(formData.slug) && (
                <p className="text-xs text-orange-600">
                  {t.loading === t.loading ? '⚠ 格式不正确，请检查' : '⚠ Invalid format'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">{t.teams.description}</Label>
                <span className={`text-xs ${(formData.description?.length || 0) > MAX_DESCRIPTION_LENGTH ? 'text-red-600' : 'text-gray-500'}`}>
                  {formData.description?.length || 0} / {MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <Textarea
                id="description"
                placeholder={t.loading === t.loading ? '请输入团队描述（可选，最多500字符）' : 'Enter team description (optional, max 500 characters)'}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isLoading}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name || !formData.slug || !isValidSlug(formData.slug)}
            >
              {isLoading ? (t.loading === t.loading ? '创建中...' : 'Creating...') : t.teams.createNew}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
