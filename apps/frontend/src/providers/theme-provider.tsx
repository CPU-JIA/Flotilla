'use client'

/**
 * ThemeProvider - 主题管理提供者
 * ECP-A1: 单一职责 - 专注于主题管理
 * 使用next-themes库实现Light/Dark主题切换
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
