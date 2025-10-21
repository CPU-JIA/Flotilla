/**
 * Flotilla Design System - 2025
 * 设计系统核心配置
 *
 * 设计参考:
 * - GitLab Pajamas: 信息密度和组件规范
 * - Vercel Geist: 极简美学和色彩系统
 * - GitHub Primer: 简洁高效的布局
 *
 * ECP-A1: 单一职责 - 统一管理设计Token
 * ECP-D3: 避免魔法值 - 所有设计常量集中定义
 */

export const designSystem = {
  /**
   * 色彩系统
   */
  colors: {
    // 主品牌色 (Primary Blue)
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#3b82f6', // 主色
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#1e293b',
    },

    // 语义色
    semantic: {
      success: {
        light: '#10b981', // green-500
        dark: '#34d399', // green-400
      },
      warning: {
        light: '#f59e0b', // amber-500
        dark: '#fbbf24', // amber-400
      },
      danger: {
        light: '#ef4444', // red-500
        dark: '#f87171', // red-400
      },
      info: {
        light: '#3b82f6', // blue-500
        dark: '#60a5fa', // blue-400
      },
    },

    // 中性色系统 (深色模式友好)
    neutral: {
      light: {
        bg: '#ffffff', // 主背景
        bgSecondary: '#f9fafb', // gray-50 次级背景
        bgTertiary: '#f3f4f6', // gray-100 三级背景
        bgHover: '#f3f4f6', // gray-100 悬停背景
        border: '#e5e7eb', // gray-200 边框
        borderHover: '#d1d5db', // gray-300 悬停边框
        text: '#111827', // gray-900 主文字
        textSecondary: '#6b7280', // gray-500 次要文字
        textTertiary: '#9ca3af', // gray-400 三级文字
        textPlaceholder: '#9ca3af', // gray-400 占位文字
      },
      dark: {
        bg: '#18181b', // zinc-900 主背景
        bgSecondary: '#27272a', // zinc-800 次级背景
        bgTertiary: '#3f3f46', // zinc-700 三级背景
        bgHover: '#3f3f46', // zinc-700 悬停背景
        border: '#3f3f46', // zinc-700 边框
        borderHover: '#52525b', // zinc-600 悬停边框
        text: '#fafafa', // zinc-50 主文字
        textSecondary: '#a1a1aa', // zinc-400 次要文字
        textTertiary: '#71717a', // zinc-500 三级文字
        textPlaceholder: '#71717a', // zinc-500 占位文字
      },
    },
  },

  /**
   * 间距系统 (基于4px网格)
   */
  spacing: {
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    7: '1.75rem', // 28px
    8: '2rem', // 32px
    9: '2.25rem', // 36px
    10: '2.5rem', // 40px
    11: '2.75rem', // 44px
    12: '3rem', // 48px
    14: '3.5rem', // 56px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    28: '7rem', // 112px
    32: '8rem', // 128px
  },

  /**
   * 字体系统
   */
  typography: {
    // 字体家族
    fontFamily: {
      sans: 'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },

    // 字体大小
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
      base: ['1rem', { lineHeight: '1.5rem' }], // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
      '5xl': ['3rem', { lineHeight: '1' }], // 48px
      '6xl': ['3.75rem', { lineHeight: '1' }], // 60px
    },

    // 字重
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },

    // 字母间距
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  /**
   * 圆角系统
   */
  borderRadius: {
    none: '0',
    sm: '0.375rem', // 6px
    DEFAULT: '0.5rem', // 8px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem', // 32px
    full: '9999px',
  },

  /**
   * 阴影系统 (优雅层次)
   */
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    // 自定义优雅阴影
    elegant: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    'elegant-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    'elegant-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  },

  /**
   * 动画时长
   */
  transitionDuration: {
    fast: '150ms', // 微交互
    DEFAULT: '200ms', // 常规过渡
    slow: '300ms', // 页面切换
    slower: '500ms', // 复杂动画
  },

  /**
   * 动画缓动函数
   */
  transitionTimingFunction: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  /**
   * 布局断点
   */
  breakpoints: {
    xs: '480px', // 手机
    sm: '640px', // 手机横屏/小平板
    md: '768px', // 平板
    lg: '1024px', // 小桌面
    xl: '1280px', // 桌面
    '2xl': '1536px', // 大桌面
  },

  /**
   * 容器配置
   */
  container: {
    center: true,
    padding: {
      DEFAULT: '1rem', // 16px
      sm: '1.5rem', // 24px
      md: '1.5rem', // 24px
      lg: '2rem', // 32px
      xl: '2rem', // 32px
      '2xl': '2rem', // 32px
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1400px', // 对齐GitHub/GitLab
    },
  },

  /**
   * Z-index层级
   */
  zIndex: {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    auto: 'auto',
    // 语义化层级
    base: '0',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modalBackdrop: '1040',
    modal: '1050',
    popover: '1060',
    tooltip: '1070',
  },

  /**
   * 边框宽度
   */
  borderWidth: {
    DEFAULT: '1px',
    0: '0',
    2: '2px',
    4: '4px',
    8: '8px',
  },

  /**
   * 透明度
   */
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    25: '0.25',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    75: '0.75',
    80: '0.8',
    90: '0.9',
    95: '0.95',
    100: '1',
  },
} as const

/**
 * 导出类型定义
 */
export type DesignSystem = typeof designSystem
export type ColorPalette = typeof designSystem.colors
export type Spacing = typeof designSystem.spacing
export type Typography = typeof designSystem.typography
