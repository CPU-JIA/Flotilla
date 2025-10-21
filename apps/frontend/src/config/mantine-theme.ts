/**
 * Mantine主题配置
 * 与Tailwind CSS和next-themes集成
 * ECP-A1: 单一职责 - 专注于主题配置
 */

import { createTheme, MantineColorsTuple } from '@mantine/core'

// 自定义品牌色(与Tailwind对齐)
const brandBlue: MantineColorsTuple = [
  '#f0f9ff', // 50
  '#e0f2fe', // 100
  '#bae6fd', // 200
  '#7dd3fc', // 300
  '#38bdf8', // 400
  '#3b82f6', // 500 - 主色
  '#2563eb', // 600
  '#1d4ed8', // 700
  '#1e40af', // 800
  '#1e3a8a', // 900
  '#1e293b', // 950
]

export const mantineTheme = createTheme({
  /** 主色配置 */
  primaryColor: 'brand',

  /** 色彩系统 */
  colors: {
    brand: brandBlue,
  },

  /** 字体配置(使用Geist字体) */
  fontFamily:
    'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
  fontFamilyMonospace:
    'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',

  /** 标题字体 */
  headings: {
    fontFamily:
      'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '2.5rem' }, // 36px
      h2: { fontSize: '1.875rem', lineHeight: '2.25rem' }, // 30px
      h3: { fontSize: '1.5rem', lineHeight: '2rem' }, // 24px
      h4: { fontSize: '1.25rem', lineHeight: '1.75rem' }, // 20px
      h5: { fontSize: '1.125rem', lineHeight: '1.75rem' }, // 18px
      h6: { fontSize: '1rem', lineHeight: '1.5rem' }, // 16px
    },
  },

  /** 圆角配置(对齐Tailwind) */
  radius: {
    xs: '0.25rem', // 4px
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
  },

  /** 默认圆角 */
  defaultRadius: 'md',

  /** 阴影系统 */
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },

  /** 间距配置 */
  spacing: {
    xs: '0.5rem', // 8px
    sm: '0.75rem', // 12px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
  },

  /** 断点配置(对齐Tailwind) */
  breakpoints: {
    xs: '30em', // 480px
    sm: '40em', // 640px
    md: '48em', // 768px
    lg: '64em', // 1024px
    xl: '80em', // 1280px
  },

  /** 组件默认配置 */
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    Input: {
      defaultProps: {
        radius: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },
  },

  /** 其他配置 */
  other: {
    // 深色模式背景色(对齐Tailwind)
    darkBg: '#18181b', // Tailwind gray-900
    darkBgSecondary: '#27272a', // Tailwind gray-800
    darkBgTertiary: '#3f3f46', // Tailwind gray-700
    // 亮色模式背景色
    lightBg: '#ffffff',
    lightBgSecondary: '#f9fafb', // Tailwind gray-50
    lightBgTertiary: '#f3f4f6', // Tailwind gray-100
  },
})
