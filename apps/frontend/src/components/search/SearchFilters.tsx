'use client'

/**
 * SearchFilters Component
 *
 * 搜索过滤器面板：
 * - 语言过滤（多选）
 * - 文件扩展名过滤（多选）
 * - 排序选项（相关性/日期/大小）
 *
 * ECP-A2: 高内聚 - 所有过滤逻辑集中在一个组件
 * ECP-D1: 使用受控组件模式便于测试
 */

import React, { useState } from 'react'
import { Filter, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { SUPPORTED_LANGUAGES, EXTENSION_GROUPS } from '@/types/search'
import type { SearchFilters as SearchFiltersType } from '@/types/search'
import { cn } from '@/lib/utils'

interface SearchFiltersProps {
  filters: SearchFiltersType
  onChange: (filters: SearchFiltersType) => void
  onReset: () => void
  className?: string
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Last Modified' },
  { value: 'size', label: 'File Size' },
] as const

export function SearchFilters({
  filters,
  onChange,
  onReset,
  className,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const handleLanguageToggle = (language: string) => {
    const newLanguages = filters.languages.includes(language)
      ? filters.languages.filter(l => l !== language)
      : [...filters.languages, language]

    onChange({ ...filters, languages: newLanguages })
  }

  const handleExtensionToggle = (extension: string) => {
    const newExtensions = filters.extensions.includes(extension)
      ? filters.extensions.filter(e => e !== extension)
      : [...filters.extensions, extension]

    onChange({ ...filters, extensions: newExtensions })
  }

  const handleSortChange = (sort: 'relevance' | 'date' | 'size') => {
    onChange({ ...filters, sort })
  }

  const hasActiveFilters =
    filters.languages.length > 0 ||
    filters.extensions.length > 0 ||
    filters.sort !== 'relevance'

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">Filters</CardTitle>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {filters.languages.length + filters.extensions.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded ? 'rotate-180' : ''
                )}
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Sort */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Sort by
            </Label>
            <div className="flex gap-2">
              {SORT_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant={filters.sort === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSortChange(option.value)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Languages */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Languages
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_LANGUAGES.slice(0, 12).map(lang => {
                const isActive = filters.languages.includes(lang)
                return (
                  <Button
                    key={lang}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageToggle(lang)}
                    className="text-xs h-7 px-2"
                  >
                    {lang}
                  </Button>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* File Extensions */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">
              File Extensions
            </Label>
            {Object.entries(EXTENSION_GROUPS).map(([groupName, extensions]) => (
              <div key={groupName} className="space-y-1.5">
                <p className="text-xs text-muted-foreground">{groupName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {extensions.map(ext => {
                    const isActive = filters.extensions.includes(ext)
                    return (
                      <Button
                        key={ext}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleExtensionToggle(ext)}
                        className="text-xs h-7 px-2 font-mono"
                      >
                        {ext}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
