/**
 * LanguageToggle组件 - 语言切换按钮
 * 支持中文/英文切换，带图标和文字标签
 * ECP-A1: 单一职责 - 专注于语言切换功能
 * ECP-B2: KISS - 简洁直观的实现
 */

'use client'

import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Languages, Globe } from 'lucide-react'

interface LanguageToggleProps {
  /** 按钮尺寸 */
  size?: 'sm' | 'default' | 'lg' | 'icon'
  /** 按钮变体 */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** 是否显示完整语言名称 */
  showFullName?: boolean
  /** 自定义className */
  className?: string
}

/**
 * 语言切换按钮组件
 *
 * 特性:
 * - 支持中文/英文切换
 * - 带有语言图标
 * - 支持多种尺寸和样式变体
 * - 完整的无障碍访问支持
 * - 平滑的切换动画
 *
 * @example
 * ```tsx
 * // 基础用法（仅显示语言缩写）
 * <LanguageToggle />
 *
 * // 显示完整语言名称
 * <LanguageToggle showFullName />
 *
 * // 自定义样式
 * <LanguageToggle
 *   size="lg"
 *   variant="outline"
 *   className="custom-class"
 * />
 * ```
 */
export function LanguageToggle({
  size = 'sm',
  variant = 'outline',
  showFullName = false,
  className = '',
}: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  const currentLangLabel = language === 'zh' ? 'CN' : 'EN'
  const currentLangFullName = language === 'zh' ? '中文' : 'English'
  const nextLangFullName = language === 'zh' ? 'English' : '中文'
  const ariaLabel = `切换到${nextLangFullName}`

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleLanguage}
      className={`
        group
        gap-1.5
        transition-all duration-200
        hover:scale-105
        active:scale-95
        ${className}
      `}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      <Languages
        className="
          h-4 w-4
          transition-transform duration-300
          group-hover:rotate-12
        "
      />
      <span className="text-xs font-medium">
        {showFullName ? currentLangFullName : currentLangLabel}
      </span>
    </Button>
  )
}

/**
 * 语言选择器 - 带下拉菜单的高级语言切换器
 * 支持多语言选择（可扩展）
 *
 * @example
 * ```tsx
 * <LanguageSelector />
 * ```
 */
export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  const languages = [
    { value: 'zh' as const, label: '简体中文', flag: '🇨🇳' },
    { value: 'en' as const, label: 'English', flag: '🇺🇸' },
    // 未来可扩展更多语言:
    // { value: 'ja' as const, label: '日本語', flag: '🇯🇵' },
    // { value: 'ko' as const, label: '한국어', flag: '🇰🇷' },
  ]

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {languages.map(({ value, label, flag }) => (
        <button
          key={value}
          onClick={() => setLanguage(value)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md
            text-sm font-medium
            transition-all duration-200
            ${
              language === value
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-50'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50'
            }
          `}
          aria-label={label}
          aria-pressed={language === value}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * 紧凑型语言切换器 - 仅显示国旗图标
 * 适用于空间受限的场景
 *
 * @example
 * ```tsx
 * <CompactLanguageToggle />
 * ```
 */
export function CompactLanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  const flag = language === 'zh' ? '🇨🇳' : '🇺🇸'
  const ariaLabel = language === 'zh' ? '切换到English' : '切换到中文'

  return (
    <button
      onClick={toggleLanguage}
      className="
        flex items-center justify-center
        w-9 h-9
        rounded-lg
        text-2xl
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        transition-all duration-200
        hover:scale-110
        active:scale-95
      "
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      {flag}
    </button>
  )
}

/**
 * 语言菜单组件 - 下拉菜单形式的语言选择器
 * 适用于需要支持更多语言的场景
 *
 * @example
 * ```tsx
 * <LanguageMenu />
 * ```
 */
export function LanguageMenu() {
  const { language, setLanguage } = useLanguage()

  const languages = [
    { value: 'zh' as const, label: '简体中文', nativeName: '简体中文', flag: '🇨🇳' },
    { value: 'en' as const, label: 'English', nativeName: 'English', flag: '🇺🇸' },
  ]

  const currentLang = languages.find((lang) => lang.value === language)

  return (
    <div className="relative group">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        aria-label={language === 'zh' ? '语言' : 'Language'}
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium">{currentLang?.flag}</span>
        <span className="text-xs">{currentLang?.label}</span>
      </Button>

      {/* 下拉菜单（简化版本，实际应该使用 Dropdown 组件） */}
      <div
        className="
          absolute top-full right-0 mt-2
          hidden group-hover:block
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg
          py-1
          min-w-[160px]
          z-50
        "
      >
        {languages.map(({ value, nativeName, flag }) => (
          <button
            key={value}
            onClick={() => setLanguage(value)}
            className={`
              w-full px-4 py-2
              flex items-center gap-3
              text-sm
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
              ${
                language === value
                  ? 'text-primary-600 dark:text-primary-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300'
              }
            `}
          >
            <span className="text-lg">{flag}</span>
            <span>{nativeName}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
