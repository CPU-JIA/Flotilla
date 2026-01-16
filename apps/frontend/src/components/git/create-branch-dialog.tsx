'use client'

/**
 * Create Branch Dialog
 * ECP-A1: 单一职责 - 创建新分支
 * ECP-C1: 防御性编程 - 表单验证
 */

import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/contexts/language-context'
import { api, ApiError } from '@/lib/api'
import type { Branch } from '@/types/project'

interface CreateBranchDialogProps {
  projectId: string
  baseBranchId?: string
  onSuccess: () => void
  children?: React.ReactNode
}

export function CreateBranchDialog({
  projectId,
  baseBranchId,
  onSuccess,
  children,
}: CreateBranchDialogProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [selectedBaseBranch, setSelectedBaseBranch] = useState(baseBranchId || '')
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')

  // 获取分支列表
  useEffect(() => {
    if (open) {
      const fetchBranches = async () => {
        try {
          const data = await api.repositories.getBranches(projectId)
          setBranches(data)
          // 如果没有指定基础分支，选择 main 或第一个分支
          if (!selectedBaseBranch && data.length > 0) {
            const defaultBranch = data.find((b) => b.name === 'main') || data[0]
            setSelectedBaseBranch(defaultBranch.id)
          }
        } catch (err) {
          logger.error('Failed to fetch branches:', err)
        }
      }
      fetchBranches()
    }
  }, [open, projectId, selectedBaseBranch])

  // 验证分支名
  const validateBranchName = (name: string): string => {
    if (!name.trim()) {
      return t.git.branch.nameRequired
    }
    // Git 分支名规则：只能包含字母、数字、连字符、下划线、斜杠
    const branchNameRegex = /^[a-zA-Z0-9/_-]+$/
    if (!branchNameRegex.test(name)) {
      return t.git.branch.nameInvalid
    }
    // 不能以斜杠开头或结尾
    if (name.startsWith('/') || name.endsWith('/')) {
      return t.git.branch.nameInvalidSlash
    }
    // 不能包含连续斜杠
    if (name.includes('//')) {
      return t.git.branch.nameInvalidDoubleSlash
    }
    return ''
  }

  // 处理分支名变化
  const handleBranchNameChange = (value: string) => {
    setBranchName(value)
    setValidationError('')
    setError('')
  }

  // 处理创建分支
  const handleCreate = async () => {
    // 验证分支名
    const validation = validateBranchName(branchName)
    if (validation) {
      setValidationError(validation)
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.repositories.createBranch(projectId, {
        name: branchName.trim(),
        baseBranchId: selectedBaseBranch,
      })
      // 成功后关闭对话框并回调
      setOpen(false)
      setBranchName('')
      setValidationError('')
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t.git.branch.createFailed)
      } else {
        setError(t.git.branch.createFailed)
      }
    } finally {
      setLoading(false)
    }
  }

  // 重置表单
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // 关闭时重置表单
      setBranchName('')
      setValidationError('')
      setError('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <span className="mr-2">➕</span>
            {t.git.branch.createNew}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🌿</span>
            <span>{t.git.branch.createNew}</span>
          </DialogTitle>
          <DialogDescription>{t.git.branch.createDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 分支名输入 */}
          <div className="space-y-2">
            <Label htmlFor="branch-name">{t.git.branch.branchName}</Label>
            <Input
              id="branch-name"
              placeholder={t.git.branch.branchNamePlaceholder}
              value={branchName}
              onChange={(e) => handleBranchNameChange(e.target.value)}
              className={validationError ? 'border-red-500' : ''}
            />
            {validationError && <p className="text-sm text-red-600">{validationError}</p>}
          </div>

          {/* 基础分支选择 */}
          <div className="space-y-2">
            <Label htmlFor="base-branch">{t.git.branch.baseBranch}</Label>
            <Select value={selectedBaseBranch} onValueChange={setSelectedBaseBranch}>
              <SelectTrigger id="base-branch">
                <SelectValue placeholder={t.git.branch.selectBaseBranch} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    <span className="flex items-center gap-2">
                      <span>🌿</span>
                      <span>{branch.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t.git.branch.baseBranchHint}</p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t.cancel}
          </Button>
          <Button onClick={handleCreate} disabled={loading || !branchName.trim()}>
            {loading ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                {t.git.branch.creating}
              </>
            ) : (
              <>
                <span className="mr-2">✅</span>
                {t.git.branch.create}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
