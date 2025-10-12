'use client'

/**
 * 邀请成员对话框
 * ECP-A1: 单一职责 - 处理成员邀请
 * ECP-C1: 防御性编程 - 输入验证
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { api, ApiError } from '@/lib/api'

interface InviteMemberDialogProps {
  projectId: string
  onSuccess?: () => void
}

export function InviteMemberDialog({ projectId, onSuccess }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'MEMBER' | 'VIEWER'>('MEMBER')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!userId || userId.trim().length === 0) {
      setError('请输入用户ID')
      return
    }

    setIsLoading(true)
    try {
      await api.projects.addMember(projectId, {
        userId: userId.trim(),
        role
      })
      setOpen(false)
      setUserId('')
      setRole('MEMBER')
      onSuccess?.()
      alert('成员添加成功')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '添加成员失败')
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
        <Button className="bg-blue-500 hover:bg-blue-600 text-white">
          <span className="mr-2">+</span> 邀请成员
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>邀请成员加入项目</DialogTitle>
            <DialogDescription>
              输入要邀请的用户ID并选择角色
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="userId">用户ID *</Label>
              <Input
                id="userId"
                placeholder="输入用户ID（如: cm...）"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                提示：可以在用户管理页面查看用户ID
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">成员角色 *</Label>
              <Select value={role} onValueChange={(value) => setRole(value as 'MEMBER' | 'VIEWER')} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">成员 - 可以查看和编辑项目</SelectItem>
                  <SelectItem value="VIEWER">观察者 - 只能查看项目</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '邀请中...' : '邀请成员'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
