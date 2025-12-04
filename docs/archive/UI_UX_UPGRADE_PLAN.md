# 🎨 Flotilla UI/UX 升级执行计划

**文档版本**: v1.0
**创建日期**: 2025-10-20
**预计完成**: 2025-10-27 (7天)
**状态**: 🟡 待开始

---

## 📊 现状评估

### ✅ 优秀的现有基础
- **主题系统**: next-themes已配置，支持light/dark/system
- **语言系统**: zh/en双语完整，500+翻译条目(覆盖率100%)
- **组件库**: Shadcn/ui + Radix UI + Tailwind CSS 4
- **现有组件**: 34个React组件已实现
- **字体系统**: Geist Sans + Geist Mono (Vercel官方字体)

### ⚠️ 需要改进的点
1. ❌ 缺少高级数据展示组件(DataTable/Charts/DatePicker)
2. ⚠️ 主题切换在部分组件上不流畅
3. ❌ 缺少统一的设计规范文档
4. ❌ 没有组件展示页面(Storybook/Showcase)
5. ⚠️ 部分页面深色模式支持不完整

---

## 🎯 升级策略

### 核心原则
**"保守增强，而非全盘替换"**

### 技术选型
```yaml
保持不变:
  - Shadcn/ui (基础组件,80%)
  - Tailwind CSS 4 (CSS框架)
  - Radix UI (无障碍访问底层)
  - next-themes (主题管理)

新增补充:
  - Mantine 7.15 (企业级组件,20%)
  - @tabler/icons-react (图标增强)
  - Recharts (已有,保持)
  - React Flow (已有,保持)
```

### 设计参考
- **GitLab Pajamas**: 信息密度和组件规范
- **Vercel Geist**: 极简美学和色彩系统
- **GitHub Primer**: 简洁高效的布局

---

## 📅 详细执行计划 (7天)

### 📍 Day 1-2: Phase 1 - Mantine集成与配置

#### Day 1上午: 依赖安装
```bash
cd apps/frontend

# 核心包
pnpm add @mantine/core@7.15.0 @mantine/hooks@7.15.0

# 高级组件
pnpm add @mantine/form@7.15.0 @mantine/notifications@7.15.0

# 数据组件
pnpm add @mantine/dates@7.15.0 dayjs
pnpm add @mantine/charts@7.15.0

# 图标库
pnpm add @tabler/icons-react
```

#### Day 1下午: Mantine主题配置

**任务1**: 创建`apps/frontend/src/config/mantine-theme.ts`
```typescript
import { createTheme, MantineColorsTuple } from '@mantine/core';

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
];

export const mantineTheme = createTheme({
  primaryColor: 'brand',

  colors: {
    brand: brandBlue,
  },

  // 字体配置(使用Geist字体)
  fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  fontFamilyMonospace: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',

  // 圆角配置
  radius: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },

  // 深色模式配置
  other: {
    darkBg: '#18181b',        // Tailwind gray-900
    darkBgSecondary: '#27272a', // Tailwind gray-800
  }
});
```

**任务2**: 更新`apps/frontend/src/app/layout.tsx`
```typescript
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { mantineTheme } from '@/config/mantine-theme';

// 导入Mantine CSS
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <MantineProvider theme={mantineTheme}>
            <Notifications position="top-right" limit={5} />
            <QueryProvider>
              <LanguageProvider translations={translations}>
                <AuthProvider>
                  {children}
                </AuthProvider>
              </LanguageProvider>
            </QueryProvider>
          </MantineProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### Day 2: 主题同步与测试

**任务3**: 创建`apps/frontend/src/hooks/use-mantine-theme-sync.ts`
```typescript
'use client'
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useMantineColorScheme } from '@mantine/core';

/**
 * 同步next-themes和Mantine的主题状态
 * 确保主题切换时两个系统同步更新
 */
export function useMantineThemeSync() {
  const { theme, resolvedTheme } = useTheme();
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const effectiveTheme = theme === 'system' ? resolvedTheme : theme;

    if (effectiveTheme === 'dark') {
      setColorScheme('dark');
    } else if (effectiveTheme === 'light') {
      setColorScheme('light');
    }
  }, [theme, resolvedTheme, setColorScheme]);
}
```

**任务4**: 在`apps/frontend/src/components/layout/AppLayout.tsx`中使用
```typescript
import { useMantineThemeSync } from '@/hooks/use-mantine-theme-sync';

export function AppLayout({ children }) {
  // 同步主题
  useMantineThemeSync();

  return (
    // ...existing layout
  );
}
```

**任务5**: 测试Mantine组件
- 创建测试页面验证Button/Modal/Notification
- 测试深色模式切换
- 验证字体正确加载

---

### 📍 Day 3-4: Phase 2 - 设计系统建立

#### Day 3: 设计Token与Tailwind配置

**任务6**: 创建`apps/frontend/src/config/design-system.ts`
```typescript
/**
 * Flotilla Design System - 2025
 * 参考: GitLab Pajamas + Vercel Geist + GitHub Primer
 */

export const designSystem = {
  // 色彩系统
  colors: {
    // 主品牌色
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#3b82f6',  // 主色
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#1e293b',
    },

    // 语义色
    semantic: {
      success: {
        light: '#10b981',
        dark: '#34d399',
      },
      warning: {
        light: '#f59e0b',
        dark: '#fbbf24',
      },
      danger: {
        light: '#ef4444',
        dark: '#f87171',
      },
      info: {
        light: '#3b82f6',
        dark: '#60a5fa',
      },
    },

    // 中性色(深色模式友好)
    neutral: {
      light: {
        bg: '#ffffff',
        bgSecondary: '#f9fafb',
        bgTertiary: '#f3f4f6',
        border: '#e5e7eb',
        borderHover: '#d1d5db',
        text: '#111827',
        textSecondary: '#6b7280',
        textTertiary: '#9ca3af',
      },
      dark: {
        bg: '#18181b',
        bgSecondary: '#27272a',
        bgTertiary: '#3f3f46',
        border: '#3f3f46',
        borderHover: '#52525b',
        text: '#fafafa',
        textSecondary: '#a1a1aa',
        textTertiary: '#71717a',
      }
    }
  },

  // 间距系统(基于4px网格)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },

  // 字体系统
  typography: {
    fontFamily: {
      sans: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
      mono: 'var(--font-geist-mono), ui-monospace, monospace',
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },

  // 圆角系统
  borderRadius: {
    none: '0',
    sm: '0.375rem',
    DEFAULT: '0.5rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },

  // 阴影系统(优雅层次)
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    elegant: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    'elegant-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },

  // 动画时长
  transitionDuration: {
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms',
  },

  // 容器配置
  container: {
    center: true,
    padding: {
      DEFAULT: '1rem',
      sm: '1.5rem',
      lg: '2rem',
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1400px', // 对齐GitHub
    },
  },
} as const;
```

**任务7**: 更新`apps/frontend/tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';
import { designSystem } from './src/config/design-system';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: designSystem.colors.primary,
        // 语义色
        success: {
          DEFAULT: designSystem.colors.semantic.success.light,
          dark: designSystem.colors.semantic.success.dark,
        },
        warning: {
          DEFAULT: designSystem.colors.semantic.warning.light,
          dark: designSystem.colors.semantic.warning.dark,
        },
        danger: {
          DEFAULT: designSystem.colors.semantic.danger.light,
          dark: designSystem.colors.semantic.danger.dark,
        },
      },
      fontFamily: designSystem.typography.fontFamily,
      fontSize: designSystem.typography.fontSize,
      fontWeight: designSystem.typography.fontWeight,
      spacing: designSystem.spacing,
      borderRadius: designSystem.borderRadius,
      boxShadow: designSystem.boxShadow,
      transitionDuration: designSystem.transitionDuration,
      container: designSystem.container,
    }
  },
  plugins: [],
};

export default config;
```

#### Day 4: 设计规范文档与组件优化

**任务8**: 创建`apps/frontend/DESIGN_SYSTEM.md`
```markdown
# Flotilla Design System

## 设计理念

**简洁优雅**: 参考GitLab Pajamas的信息密度
**视觉舒适**: 参考Vercel Geist的极简美学
**一致性**: 统一的色彩/字体/间距系统

## 色彩使用指南

### 主色(Primary Blue)
- 用途: 主要操作按钮、链接文字、重要提示
- Light: `#3b82f6`
- Dark: `#60a5fa`

### 语义色
- **成功(Success)**: `#10b981` - 操作成功提示
- **警告(Warning)**: `#f59e0b` - 需要注意的信息
- **危险(Danger)**: `#ef4444` - 删除/错误操作
- **信息(Info)**: `#3b82f6` - 一般提示信息

### 深色模式
- **背景色**: `#18181b` (gray-900)
- **次级背景**: `#27272a` (gray-800)
- **三级背景**: `#3f3f46` (gray-700)
- **边框色**: `#3f3f46`
- **文字色**: `#fafafa`
- **次要文字**: `#a1a1aa`

## 布局规范

### 页面容器
- 最大宽度: 1400px
- 内边距: 16px (移动) → 24px (平板) → 32px (桌面)

### 卡片组件
```tsx
<Card className="group hover:shadow-elegant-lg transition-all duration-300">
  <CardHeader className="border-b border-gray-200 dark:border-gray-800">
    <CardTitle className="text-2xl font-semibold">标题</CardTitle>
    <CardDescription className="text-gray-500 dark:text-gray-400">
      描述文字
    </CardDescription>
  </CardHeader>
  <CardContent className="pt-6">
    {/* 内容 */}
  </CardContent>
  <CardFooter className="border-t border-gray-200 dark:border-gray-800 justify-between">
    <Button variant="ghost">取消</Button>
    <Button variant="default">确认</Button>
  </CardFooter>
</Card>
```

### 表单组件
- Input高度: 40px
- Button高度: 40px (medium), 36px (small), 44px (large)
- Label字体: 14px, font-medium
- 间距: 每个字段间隔16px

## 组件使用建议

### 何时使用Shadcn/ui
- 基础组件(Button/Input/Card/Dialog等)
- 需要完全自定义样式
- 轻量级交互组件

### 何时使用Mantine
- 复杂数据展示(DataTable/DatePicker)
- 图表和可视化(Charts)
- 高级表单(MultiSelect/TransferList)
- 通知系统(Notifications)

## 深色模式最佳实践

### 文字颜色
```tsx
// 主文字
className="text-gray-900 dark:text-gray-50"

// 次要文字
className="text-gray-600 dark:text-gray-400"

// 三级文字
className="text-gray-500 dark:text-gray-500"
```

### 背景颜色
```tsx
// 主背景
className="bg-white dark:bg-gray-900"

// 次级背景
className="bg-gray-50 dark:bg-gray-800"

// 三级背景
className="bg-gray-100 dark:bg-gray-700"
```

### 边框颜色
```tsx
// 默认边框
className="border-gray-200 dark:border-gray-800"

// 悬停边框
className="hover:border-gray-300 dark:hover:border-gray-700"
```

## 响应式断点

- **sm**: 640px (手机横屏/小平板)
- **md**: 768px (平板)
- **lg**: 1024px (小桌面)
- **xl**: 1280px (桌面)
- **2xl**: 1536px (大桌面)

## 动画和过渡

- **快速**: 150ms (微交互)
- **默认**: 200ms (常规过渡)
- **慢速**: 300ms (页面切换)

使用示例:
```tsx
className="transition-all duration-200 hover:scale-105"
```

## 无障碍访问(a11y)

- 所有交互元素必须有`aria-label`或可见文本
- 使用语义化HTML标签
- 键盘导航支持
- 颜色对比度符合WCAG 2.1 AA标准
```

**任务9**: 优化所有现有组件的深色模式
- 审查34个现有组件
- 统一className模式
- 确保深色模式完整支持

---

### 📍 Day 5-6: Phase 3 - 高级组件实现

#### Day 5: DataTable与增强组件

**任务10**: 创建`apps/frontend/src/components/common/data-table.tsx`
```typescript
'use client'
import { DataTable as MantineDataTable } from '@mantine/datatable';
import { useTheme } from 'next-themes';
import type { DataTableColumn } from '@mantine/datatable';

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    page: number;
    total: number;
    recordsPerPage?: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (record: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  pagination,
  onRowClick,
  emptyMessage = '暂无数据',
}: DataTableProps<T>) {
  const { theme } = useTheme();

  return (
    <MantineDataTable
      columns={columns}
      records={data}
      fetching={loading}
      withBorder
      borderRadius="md"
      withColumnBorders
      striped
      highlightOnHover
      onRowClick={onRowClick}
      noRecordsText={emptyMessage}
      // 深色模式自适应
      className={theme === 'dark' ? 'mantine-dark-table' : ''}
      {...(pagination && {
        page: pagination.page,
        onPageChange: pagination.onPageChange,
        totalRecords: pagination.total,
        recordsPerPage: pagination.recordsPerPage || 10,
        recordsPerPageOptions: [10, 20, 50, 100],
      })}
    />
  );
}
```

**任务11**: 创建`apps/frontend/src/components/theme/theme-toggle.tsx`
```tsx
'use client'
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <IconSun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="transition-transform hover:scale-110"
      aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到深色模式'}
    >
      {theme === 'dark' ? (
        <IconSun className="h-5 w-5 text-yellow-500" />
      ) : (
        <IconMoon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      )}
    </Button>
  );
}
```

**任务12**: 创建`apps/frontend/src/components/language/language-toggle.tsx`
```tsx
'use client'
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { IconLanguage } from '@tabler/icons-react';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
      className="gap-2"
      aria-label={`切换到${language === 'zh' ? 'English' : '中文'}`}
    >
      <IconLanguage className="h-4 w-4" />
      <span className="font-medium">
        {language === 'zh' ? '中文' : 'English'}
      </span>
    </Button>
  );
}
```

#### Day 6: 组件展示页面

**任务13**: 创建`apps/frontend/src/app/design-system/page.tsx`
```tsx
'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/common/data-table';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

// 示例数据
const sampleData = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User' },
];

export default function DesignSystemPage() {
  const [page, setPage] = useState(1);

  return (
    <div className="container mx-auto py-8 space-y-12">
      {/* 标题 */}
      <div>
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-50">
          Flotilla Design System
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          组件库展示和设计规范参考
        </p>
      </div>

      {/* 色彩系统 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-50">
          色彩系统
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch color="primary-500" label="Primary" hex="#3b82f6" />
          <ColorSwatch color="success" label="Success" hex="#10b981" />
          <ColorSwatch color="warning" label="Warning" hex="#f59e0b" />
          <ColorSwatch color="danger" label="Danger" hex="#ef4444" />
        </div>
      </section>

      {/* 按钮组件 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-50">
          按钮
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>

        <h3 className="text-lg font-medium mt-6 mb-4 text-gray-900 dark:text-gray-50">
          按钮尺寸
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      {/* Badge组件 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-50">
          徽章
        </h2>
        <div className="flex flex-wrap gap-4">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </section>

      {/* 表单组件 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-50">
          表单
        </h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>示例表单</CardTitle>
            <CardDescription>展示输入组件样式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">用户名</Label>
              <Input id="name" placeholder="请输入用户名" />
            </div>
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" placeholder="请输入邮箱" />
            </div>
            <Button className="w-full">提交</Button>
          </CardContent>
        </Card>
      </section>

      {/* 数据表格 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-50">
          数据表格
        </h2>
        <DataTable
          columns={[
            { accessor: 'name', title: '姓名' },
            { accessor: 'email', title: '邮箱' },
            {
              accessor: 'role',
              title: '角色',
              render: (record) => (
                <Badge variant={record.role === 'Admin' ? 'default' : 'secondary'}>
                  {record.role}
                </Badge>
              ),
            },
          ]}
          data={sampleData}
          pagination={{
            page,
            total: sampleData.length,
            onPageChange: setPage,
          }}
        />
      </section>

      {/* 通知系统 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-50">
          通知系统
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={() =>
              notifications.show({
                title: '成功',
                message: '操作成功完成！',
                color: 'green',
              })
            }
          >
            成功通知
          </Button>
          <Button
            onClick={() =>
              notifications.show({
                title: '错误',
                message: '操作失败，请重试。',
                color: 'red',
              })
            }
            variant="destructive"
          >
            错误通知
          </Button>
          <Button
            onClick={() =>
              notifications.show({
                title: '警告',
                message: '请注意此操作的影响。',
                color: 'yellow',
              })
            }
            variant="secondary"
          >
            警告通知
          </Button>
        </div>
      </section>
    </div>
  );
}

// 辅助组件：色卡
function ColorSwatch({ color, label, hex }: { color: string; label: string; hex: string }) {
  return (
    <div className="text-center">
      <div className={`w-full h-20 rounded-lg bg-${color} shadow-md`} />
      <p className="mt-2 font-medium text-gray-900 dark:text-gray-50">{label}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{hex}</p>
    </div>
  );
}
```

**任务14**: 更新`apps/frontend/src/components/layout/AppLayout.tsx`
```tsx
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LanguageToggle } from '@/components/language/language-toggle';
import { useMantineThemeSync } from '@/hooks/use-mantine-theme-sync';

export function AppLayout({ children }) {
  // 同步Mantine主题
  useMantineThemeSync();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo />

          {/* 右侧控制 */}
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            {/* ...existing user menu */}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
```

---

### 📍 Day 7: 测试与优化

#### Day 7上午: 全面测试

**任务15**: E2E测试
```bash
cd apps/frontend

# 测试主题切换
pnpm test tests/theme/theme-toggle.spec.ts

# 测试语言切换
pnpm test tests/language/language-toggle.spec.ts

# 测试深色模式
pnpm test tests/theme/dark-mode.spec.ts
```

**任务16**: 创建测试文件`tests/theme/theme-toggle.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    // 初始应该是light模式
    await expect(page.locator('html')).not.toHaveClass('dark');

    // 点击主题切换按钮
    await page.click('[aria-label*="切换"]');

    // 应该切换到dark模式
    await expect(page.locator('html')).toHaveClass(/dark/);

    // 再次点击
    await page.click('[aria-label*="切换"]');

    // 应该切换回light模式
    await expect(page.locator('html')).not.toHaveClass('dark');
  });

  test('should persist theme preference', async ({ page, context }) => {
    // 切换到dark模式
    await page.click('[aria-label*="切换"]');
    await expect(page.locator('html')).toHaveClass(/dark/);

    // 刷新页面
    await page.reload();

    // 主题应该保持dark
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
```

#### Day 7下午: 性能优化与文档

**任务17**: 性能检查
- 检查CSS包体积（目标<15KB）
- 测试主题切换延迟（目标<50ms）
- 验证组件渲染性能

**任务18**: 更新项目文档
- 更新CLAUDE.md中的UI/UX部分
- 更新README.md添加Design System链接
- 创建CHANGELOG.md记录变更

**任务19**: 代码清理
- 移除未使用的imports
- 统一代码格式（Prettier）
- 添加必要的注释

---

## 📊 验收标准

### 功能完整性
- ✅ Mantine成功集成，所有组件可用
- ✅ 主题系统(light/dark)完美切换，无闪烁
- ✅ 语言系统(zh/en)保持100%覆盖
- ✅ 设计系统配置完整，文档清晰
- ✅ 所有现有组件支持深色模式
- ✅ 组件展示页面(/design-system)完整

### 性能指标
- ✅ CSS包体积<15KB
- ✅ 主题切换延迟<50ms
- ✅ 首屏加载时间无明显增加
- ✅ Lighthouse Performance Score≥90

### 代码质量
- ✅ TypeScript类型完整
- ✅ 无ESLint错误
- ✅ Prettier格式化通过
- ✅ 代码注释清晰

### 用户体验
- ✅ 深色模式视觉舒适，无刺眼元素
- ✅ 主题切换流畅，无布局抖动
- ✅ 响应式设计完整(移动/平板/桌面)
- ✅ 无障碍访问WCAG 2.1 AA级

---

## 🎯 最终交付物

### 代码文件
1. ✅ `apps/frontend/src/config/mantine-theme.ts`
2. ✅ `apps/frontend/src/config/design-system.ts`
3. ✅ `apps/frontend/src/hooks/use-mantine-theme-sync.ts`
4. ✅ `apps/frontend/src/components/common/data-table.tsx`
5. ✅ `apps/frontend/src/components/theme/theme-toggle.tsx`
6. ✅ `apps/frontend/src/components/language/language-toggle.tsx`
7. ✅ `apps/frontend/src/app/design-system/page.tsx`
8. ✅ 所有34个现有组件深色模式优化

### 文档文件
1. ✅ `apps/frontend/DESIGN_SYSTEM.md`
2. ✅ `apps/frontend/CHANGELOG.md`
3. ✅ 更新`apps/frontend/README.md`
4. ✅ 更新`CLAUDE.md`

### 测试文件
1. ✅ `tests/theme/theme-toggle.spec.ts`
2. ✅ `tests/language/language-toggle.spec.ts`
3. ✅ `tests/theme/dark-mode.spec.ts`

---

## 📝 执行日志

### 2025-10-20 (创建)
- ✅ 完成执行计划文档
- [ ] 待开始实施

---

**文档结束**

*"简洁优雅，一致流畅"* 🎨
