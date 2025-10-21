/**
 * Mantine主题同步Hook
 * 将Mantine的colorScheme与next-themes同步
 * ECP-A1: 单一职责 - 专注于主题同步
 * ECP-B2: KISS - 简单直接的同步逻辑
 */

'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useMantineColorScheme } from '@mantine/core'

/**
 * 同步next-themes和Mantine的主题状态
 * 确保主题切换时两个系统同步更新
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useMantineThemeSync();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useMantineThemeSync() {
  const { theme, resolvedTheme } = useTheme()
  const { setColorScheme } = useMantineColorScheme()

  useEffect(() => {
    // 当theme为'system'时，使用resolvedTheme（浏览器实际主题）
    const effectiveTheme = theme === 'system' ? resolvedTheme : theme

    if (effectiveTheme === 'dark') {
      setColorScheme('dark')
    } else if (effectiveTheme === 'light') {
      setColorScheme('light')
    }
  }, [theme, resolvedTheme, setColorScheme])
}
