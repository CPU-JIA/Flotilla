'use client'

/**
 * SearchBar Component
 *
 * Features:
 * - Real-time search input
 * - Cmd+K / Ctrl+K keyboard shortcut
 * - Debounced search
 * - Clear button
 *
 * ECP-A1: Single Responsibility - 只负责搜索输入UI
 * ECP-D1: Testability - 使用受控组件模式
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  placeholder?: string
  autoFocus?: boolean
  debounceMs?: number
  className?: string
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search code...',
  autoFocus = false,
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value)

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim() && inputValue !== value) {
        onSearch(inputValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [inputValue, debounceMs, onSearch, value])

  // Sync external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Cmd+K / Ctrl+K shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('global-search-input')?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      onChange(newValue)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    setInputValue('')
    onChange('')
    onSearch('')
  }, [onChange, onSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        onSearch(inputValue)
      }
      if (e.key === 'Escape') {
        handleClear()
      }
    },
    [inputValue, onSearch, handleClear]
  )

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="global-search-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pl-10 pr-24"
          aria-label="Search code"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {inputValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
    </div>
  )
}
