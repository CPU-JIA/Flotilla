/**
 * ThemeToggle组件 - 主题切换按钮
 * 支持Light/Dark模式切换，带图标动画和工具提示
 * ECP-A1: 单一职责 - 专注于主题切换功能
 * ECP-B2: KISS - 简洁直观的实现
 */

'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  /** 按钮尺寸 */
  size?: 'sm' | 'default' | 'lg' | 'icon'
  /** 按钮变体 */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** 是否显示文字标签 */
  showLabel?: boolean
  /** 自定义className */
  className?: string
}

/**
 * 主题切换按钮组件
 *
 * 特性:
 * - 支持Light/Dark/System三种主题模式
 * - 带有平滑的图标切换动画
 * - 防止服务端渲染水合不匹配
 * - 支持多种尺寸和样式变体
 * - 完整的无障碍访问支持
 *
 * @example
 * ```tsx
 * // 基础用法
 * <ThemeToggle />
 *
 * // 带文字标签
 * <ThemeToggle showLabel />
 *
 * // 自定义样式
 * <ThemeToggle
 *   size="lg"
 *   variant="outline"
 *   className="custom-class"
 * />
 * ```
 */
export function ThemeToggle({
  size = 'icon',
  variant = 'outline',
  showLabel = false,
  className = '',
}: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 防止服务端渲染水合不匹配
  // ECP-B2: KISS - 简单的mounted状态管理
  useEffect(() => {
    setMounted(true)
  }, [])

  /**
   * 切换主题
   * 当前实现: Light <-> Dark 简单切换
   * 未来可扩展为: Light -> Dark -> System 循环切换
   */
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  // 服务端渲染或未挂载时显示占位按钮
  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={`
          ${!showLabel && size !== 'icon' ? 'w-9 h-9 p-0' : ''}
          ${className}
        `}
        aria-label="Loading theme"
      >
        <Sun className="h-4 w-4" />
        {showLabel && <span className="ml-2">主题</span>}
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'
  const Icon = isDark ? Sun : Moon
  const ariaLabel = isDark ? '切换到亮色模式' : '切换到深色模式'
  const tooltipText = isDark ? 'Light Mode' : 'Dark Mode'

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`
        group
        transition-all duration-200
        hover:scale-105
        active:scale-95
        ${!showLabel && size !== 'icon' ? 'w-9 h-9 p-0' : ''}
        ${className}
      `}
      title={tooltipText}
      aria-label={ariaLabel}
    >
      <Icon
        className={`
          h-4 w-4
          transition-transform duration-300
          group-hover:rotate-12
          ${isDark ? 'text-yellow-500' : 'text-gray-700 dark:text-gray-300'}
        `}
      />
      {showLabel && <span className="ml-2 text-sm font-medium">{isDark ? '亮色' : '深色'}</span>}
    </Button>
  )
}

/**
 * 带下拉菜单的高级主题切换器
 * 支持Light/Dark/System三种模式选择
 *
 * @example
 * ```tsx
 * <ThemeSelector />
 * ```
 */
export function ThemeSelector() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const themes = [
    { value: 'light', label: '亮色模式', icon: '☀️' },
    { value: 'dark', label: '深色模式', icon: '🌙' },
    { value: 'system', label: '跟随系统', icon: '💻' },
  ]

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {themes.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md
            text-sm font-medium
            transition-all duration-200
            ${
              theme === value
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-50'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50'
            }
          `}
          aria-label={label}
          aria-pressed={theme === value}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
