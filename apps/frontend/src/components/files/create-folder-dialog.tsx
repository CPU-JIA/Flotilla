'use client'

/**
 * 创建文件夹对话框
 * ECP-A1: 单一职责 - 仅负责文件夹创建
 * ECP-C1: 防御性编程 - 文件夹名称验证
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { api, ApiError } from '@/lib/api'

interface CreateFolderDialogProps {
  projectId: string
  parentPath: string
  onSuccess: () => void
}

export function CreateFolderDialog({ projectId, parentPath, onSuccess }: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [folderName, setFolderName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = folderName.trim()
    if (!trimmedName || trimmedName.length === 0) {
      setError('文件夹名称不能为空')
      return
    }

    if (trimmedName.length > 100) {
      setError('文件夹名称最多100个字符')
      return
    }

    // 验证文件夹名称只包含字母、数字、下划线、中划线和中文
    if (!/^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/.test(trimmedName)) {
      setError('文件夹名称只能包含字母、数字、下划线、中划线和中文')
      return
    }

    setIsLoading(true)

    try {
      await api.files.createFolder({
        projectId,
        name: trimmedName,
        parentPath,
      })

      setOpen(false)
      setFolderName('')
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '创建文件夹失败')
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
        <Button variant="outline" className="bg-white">
          <span className="mr-2">📁</span> 新建文件夹
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>创建新文件夹</DialogTitle>
            <DialogDescription>
              在当前目录下创建一个新文件夹
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="folderName">文件夹名称 *</Label>
              <Input
                id="folderName"
                placeholder="请输入文件夹名称"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value)
                  if (error) setError('')
                }}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500">
                只能包含字母、数字、下划线、中划线和中文，最多100个字符
              </p>
            </div>

            <div className="text-sm text-gray-600">
              <p>当前路径: <span className="font-mono">{parentPath}</span></p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '创建中...' : '创建文件夹'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
