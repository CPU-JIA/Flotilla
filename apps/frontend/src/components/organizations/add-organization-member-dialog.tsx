'use client'

/**
 * 添加组织成员对话框
 * ECP-A1: 单一职责 - 处理成员添加
 * ECP-C1: 防御性编程 - 输入验证
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useLanguage } from '@/contexts/language-context'
import { api, ApiError } from '@/lib/api'
import type { OrgRole } from '@/types/organization'

interface AddOrganizationMemberDialogProps {
  organizationSlug: string
  onSuccess?: () => void
}

export function AddOrganizationMemberDialog({
  organizationSlug,
  onSuccess,
}: AddOrganizationMemberDialogProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<OrgRole>('MEMBER')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!userId || userId.trim().length === 0) {
      setError(t.loading === t.loading ? '请输入用户ID' : 'Please enter user ID')
      return
    }

    setIsLoading(true)
    try {
      await api.organizations.addMember(organizationSlug, {
        userId: userId.trim(),
        role,
      })
      setOpen(false)
      setUserId('')
      setRole('MEMBER')
      onSuccess?.()
      alert(t.loading === t.loading ? '成员添加成功' : 'Member added successfully')
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
        <Button className="bg-blue-500 hover:bg-blue-600 text-white">
          <span className="mr-2">+</span> {t.organizations.addMember}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t.organizations.addMember}</DialogTitle>
            <DialogDescription>
              {t.loading === t.loading
                ? '输入要添加的用户ID并选择角色'
                : 'Enter user ID and select role'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="userId">{t.organizations.selectUser} *</Label>
              <Input
                id="userId"
                placeholder={
                  t.loading === t.loading
                    ? '输入用户ID（如: cm...）'
                    : 'Enter user ID (e.g., cm...)'
                }
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.loading === t.loading
                  ? '提示：可以在用户管理页面查看用户ID'
                  : 'Tip: View user IDs in user management page'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t.organizations.selectRole} *</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as OrgRole)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    {t.organizations.roles.ADMIN} -{' '}
                    {t.loading === t.loading
                      ? '可以管理组织和成员'
                      : 'Can manage organization and members'}
                  </SelectItem>
                  <SelectItem value="MEMBER">
                    {t.organizations.roles.MEMBER} -{' '}
                    {t.loading === t.loading ? '普通成员' : 'Regular member'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t.loading === t.loading
                  ? '添加中...'
                  : 'Adding...'
                : t.organizations.addMember}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
