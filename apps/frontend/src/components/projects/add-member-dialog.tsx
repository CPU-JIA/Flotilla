'use client'

/**
 * Add Member Dialog Component
 * ECP-A1: 单一职责 - 添加项目成员对话框
 * ECP-C1: 防御性编程 - 表单验证和错误处理
 */

import { useState } from 'react'
import { useLanguage } from '@/contexts/language-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { api, ApiError } from '@/lib/api'

interface AddMemberDialogProps {
  projectId: string
  onSuccess: () => void
}

export function AddMemberDialog({ projectId, onSuccess }: AddMemberDialogProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'OWNER' | 'MAINTAINER' | 'MEMBER' | 'VIEWER'>('MEMBER')
  const [adding, setAdding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!userId.trim()) {
      alert(t.projects.settings.userId + ' ' + t.validation.fieldRequired)
      return
    }

    setAdding(true)
    try {
      await api.projects.addMember(projectId, {
        userId: userId.trim(),
        role,
      })
      alert(t.projects.settings.addSuccess)
      setOpen(false)
      setUserId('')
      setRole('MEMBER')
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.projects.settings.addFailed}: ${err.message}`)
      } else {
        alert(t.projects.settings.addFailed)
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>➕ {t.projects.settings.addMember}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t.projects.settings.addMemberTitle}</DialogTitle>
            <DialogDescription>{t.projects.settings.addMemberDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User ID */}
            <div className="space-y-2">
              <Label htmlFor="userId">
                {t.projects.settings.userId} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={t.projects.settings.userIdPlaceholder}
                disabled={adding}
              />
              <p className="text-xs text-muted-foreground">
                {t.projects.settings.userId} (CUID格式)
              </p>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">{t.projects.settings.selectRole}</Label>
              <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                <SelectTrigger id="role" disabled={adding}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">
                    👁️ {t.projects.settings.roleViewer}
                  </SelectItem>
                  <SelectItem value="MEMBER">
                    👤 {t.projects.settings.roleMember}
                  </SelectItem>
                  <SelectItem value="MAINTAINER">
                    🔧 {t.projects.settings.roleMaintainer}
                  </SelectItem>
                  <SelectItem value="OWNER">
                    👑 {t.projects.settings.roleOwner}
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
              disabled={adding}
            >
              {t.projects.settings.cancel}
            </Button>
            <Button type="submit" disabled={adding}>
              {adding ? t.projects.settings.adding : t.projects.settings.addButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
