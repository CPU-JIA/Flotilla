'use client'

/**
 * Branch Selector Component
 * ECP-A1: 单一职责 - 分支选择和切换
 * ECP-C2: 系统化错误处理 - API 调用错误处理
 */

import { useState, useEffect } from 'react'
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

interface BranchSelectorProps {
  projectId: string
  currentBranchId?: string
  onBranchChange: (branchId: string, branchName: string) => void
  className?: string
}

export function BranchSelector({
  projectId,
  currentBranchId,
  onBranchChange,
  className = '',
}: BranchSelectorProps) {
  const { t } = useLanguage()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 获取分支列表
  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await api.repositories.getBranches(projectId)
        setBranches(data)

        // 如果没有指定当前分支，默认选择第一个分支
        if (!currentBranchId && data.length > 0) {
          const defaultBranch = data.find((b) => b.name === 'main') || data[0]
          onBranchChange(defaultBranch.id, defaultBranch.name)
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || t.git.branch.error)
        } else {
          setError(t.git.branch.error)
        }
        console.error('Failed to fetch branches:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBranches()
  }, [projectId, currentBranchId, onBranchChange, t])

  // 处理分支切换
  const handleChange = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId)
    if (branch) {
      onBranchChange(branch.id, branch.name)
    }
  }

  // 获取当前分支名称
  const getCurrentBranchName = () => {
    const branch = branches.find((b) => b.id === currentBranchId)
    return branch?.name || t.git.branch.select
  }

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 text-sm ${className}`}>
        <span className="animate-spin">⏳</span>
        <span className="text-muted-foreground">{t.git.branch.loading}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 ${className}`}>
        <span>⚠️</span>
        <span>{error}</span>
      </div>
    )
  }

  if (branches.length === 0) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground ${className}`}>
        <span>🌿</span>
        <span>{t.git.branch.noBranches}</span>
      </div>
    )
  }

  return (
    <Select value={currentBranchId} onValueChange={handleChange}>
      <SelectTrigger className={`w-[200px] ${className}`}>
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>🌿</span>
            <span>{getCurrentBranchName()}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            <span className="flex items-center gap-2">
              <span>🌿</span>
              <span>{branch.name}</span>
              {branch.name === 'main' && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded">
                  {t.git.branch.default}
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
