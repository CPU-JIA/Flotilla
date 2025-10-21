/**
 * Design System Showcase Page
 * 展示Flotilla设计系统的所有组件、颜色、字体和设计规范
 * ECP-A1: 单一职责 - 设计系统文档和展示
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { ThemeToggle, ThemeSelector } from '@/components/theme/theme-toggle'
import {
  LanguageToggle,
  LanguageSelector,
  CompactLanguageToggle,
} from '@/components/language/language-toggle'
import { useMantineThemeSync } from '@/hooks/use-mantine-theme-sync'
import { notifications } from '@mantine/notifications'
import { Sparkles, Palette, Type, Layout, Zap } from 'lucide-react'

// 示例数据
interface ExampleUser {
  id: number
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
}

const sampleData: ExampleUser[] = [
  { id: 1, name: 'Alice Chen', email: 'alice@flotilla.dev', role: 'Admin', status: 'active' },
  { id: 2, name: 'Bob Smith', email: 'bob@flotilla.dev', role: 'Developer', status: 'active' },
  { id: 3, name: 'Carol Wang', email: 'carol@flotilla.dev', role: 'Designer', status: 'inactive' },
  { id: 4, name: 'David Lee', email: 'david@flotilla.dev', role: 'Developer', status: 'active' },
  {
    id: 5,
    name: 'Emma Brown',
    email: 'emma@flotilla.dev',
    role: 'Product Manager',
    status: 'active',
  },
]

export default function DesignSystemPage() {
  // 同步Mantine主题
  useMantineThemeSync()

  const [page, setPage] = useState(1)

  // DataTable列配置
  const columns: DataTableColumn<ExampleUser>[] = [
    { accessor: 'name', title: '姓名', width: '25%' },
    { accessor: 'email', title: '邮箱', width: '35%' },
    {
      accessor: 'role',
      title: '角色',
      width: '20%',
      render: (record) => (
        <Badge variant={record.role === 'Admin' ? 'default' : 'secondary'}>{record.role}</Badge>
      ),
    },
    {
      accessor: 'status',
      title: '状态',
      width: '20%',
      render: (record) => (
        <Badge variant={record.status === 'active' ? 'default' : 'outline'}>
          {record.status === 'active' ? '活跃' : '停用'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 space-y-12">
        {/* 页面标题 */}
        <header className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="h-10 w-10 text-primary-600 dark:text-primary-400" />
            <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-50">
              Flotilla Design System
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            基于GitLab Pajamas、Vercel Geist和GitHub Primer的企业级设计系统
          </p>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline">Tailwind CSS 4</Badge>
            <Badge variant="outline">Shadcn/ui</Badge>
            <Badge variant="outline">Mantine 7.15</Badge>
            <Badge variant="outline">Radix UI</Badge>
          </div>
        </header>

        {/* 导航标签页 */}
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="colors">
              <Palette className="h-4 w-4 mr-2" />
              色彩系统
            </TabsTrigger>
            <TabsTrigger value="typography">
              <Type className="h-4 w-4 mr-2" />
              字体排版
            </TabsTrigger>
            <TabsTrigger value="components">
              <Layout className="h-4 w-4 mr-2" />
              组件库
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Zap className="h-4 w-4 mr-2" />
              高级组件
            </TabsTrigger>
            <TabsTrigger value="utilities">
              <Sparkles className="h-4 w-4 mr-2" />
              实用工具
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: 色彩系统 */}
          <TabsContent value="colors" className="space-y-8">
            <SectionTitle title="色彩系统" description="Flotilla品牌色彩和语义色彩规范" />

            {/* 主品牌色 */}
            <Card>
              <CardHeader>
                <CardTitle>主品牌色 - Blue</CardTitle>
                <CardDescription>用于主要操作、链接和重要提示</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-11 gap-4">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => (
                    <ColorSwatch
                      key={shade}
                      color={`primary-${shade}`}
                      label={`${shade}`}
                      isPrimary={shade === 500}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 语义色彩 */}
            <Card>
              <CardHeader>
                <CardTitle>语义色彩</CardTitle>
                <CardDescription>用于状态提示和用户反馈</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <SemanticColorCard
                    name="Success"
                    color="bg-success"
                    lightColor="#10b981"
                    darkColor="#34d399"
                    description="成功操作、完成状态"
                  />
                  <SemanticColorCard
                    name="Warning"
                    color="bg-warning"
                    lightColor="#f59e0b"
                    darkColor="#fbbf24"
                    description="警告信息、需要注意"
                  />
                  <SemanticColorCard
                    name="Danger"
                    color="bg-danger"
                    lightColor="#ef4444"
                    darkColor="#f87171"
                    description="错误、删除操作"
                  />
                  <SemanticColorCard
                    name="Info"
                    color="bg-info"
                    lightColor="#3b82f6"
                    darkColor="#60a5fa"
                    description="信息提示、帮助文档"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: 字体排版 */}
          <TabsContent value="typography" className="space-y-8">
            <SectionTitle title="字体排版" description="Geist字体家族和排版规范" />

            <Card>
              <CardHeader>
                <CardTitle>字体家族</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Sans-serif (UI)</p>
                  <p className="text-2xl font-sans">
                    Geist Sans - The quick brown fox jumps over the lazy dog
                  </p>
                  <p className="text-2xl font-sans">极简优雅的现代UI字体 1234567890</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Monospace (Code)</p>
                  <p className="text-2xl font-mono">
                    Geist Mono - The quick brown fox jumps over the lazy dog
                  </p>
                  <p className="text-2xl font-mono">{`function hello() { return "world"; }`}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>字体大小层级</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TypeScale size="text-xs" label="Extra Small (12px)" />
                <TypeScale size="text-sm" label="Small (14px)" />
                <TypeScale size="text-base" label="Base (16px)" />
                <TypeScale size="text-lg" label="Large (18px)" />
                <TypeScale size="text-xl" label="XL (20px)" />
                <TypeScale size="text-2xl" label="2XL (24px)" />
                <TypeScale size="text-3xl" label="3XL (30px)" />
                <TypeScale size="text-4xl" label="4XL (36px)" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: 基础组件 */}
          <TabsContent value="components" className="space-y-8">
            <SectionTitle title="基础组件" description="基于Shadcn/ui的可复用组件" />

            {/* 按钮组件 */}
            <Card>
              <CardHeader>
                <CardTitle>Button 按钮</CardTitle>
                <CardDescription>不同变体和尺寸的按钮组件</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">变体</p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">尺寸</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon">
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 徽章组件 */}
            <Card>
              <CardHeader>
                <CardTitle>Badge 徽章</CardTitle>
                <CardDescription>用于标签和状态指示</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </CardContent>
            </Card>

            {/* 表单组件 */}
            <Card>
              <CardHeader>
                <CardTitle>Form 表单组件</CardTitle>
                <CardDescription>输入框、标签等表单元素</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="name">用户名</Label>
                  <Input id="name" placeholder="请输入用户名" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <Button className="w-full">提��</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: 高级组件 */}
          <TabsContent value="advanced" className="space-y-8">
            <SectionTitle title="高级组件" description="基于Mantine的企业级组件" />

            {/* DataTable */}
            <Card>
              <CardHeader>
                <CardTitle>DataTable 数据表格</CardTitle>
                <CardDescription>支持分页、排序、自定义渲染的高级数据表格</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable<ExampleUser>
                  columns={columns}
                  data={sampleData}
                  pagination={{
                    page,
                    total: sampleData.length,
                    recordsPerPage: 3,
                    onPageChange: setPage,
                  }}
                  striped
                  highlightOnHover
                />
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Notifications 通知系统</CardTitle>
                <CardDescription>Mantine通知组件，支持多种类型</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
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
                    variant="secondary"
                    onClick={() =>
                      notifications.show({
                        title: '警告',
                        message: '请注意此操作的影响。',
                        color: 'yellow',
                      })
                    }
                  >
                    警告通知
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      notifications.show({
                        title: '错误',
                        message: '操作失败，请重试。',
                        color: 'red',
                      })
                    }
                  >
                    错误通知
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      notifications.show({
                        title: '信息',
                        message: '这是一条普通信息。',
                        color: 'blue',
                      })
                    }
                  >
                    信息通知
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: 实用工具 */}
          <TabsContent value="utilities" className="space-y-8">
            <SectionTitle title="实用工具" description="主题切换、语言切换等实用组件" />

            {/* 主题切换 */}
            <Card>
              <CardHeader>
                <CardTitle>ThemeToggle 主题切换</CardTitle>
                <CardDescription>支持Light/Dark/System三种模式</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                    ��础切换按钮
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <ThemeToggle size="sm" />
                    <ThemeToggle size="default" showLabel />
                    <ThemeToggle size="lg" showLabel />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                    主题选择器
                  </p>
                  <ThemeSelector />
                </div>
              </CardContent>
            </Card>

            {/* 语言切换 */}
            <Card>
              <CardHeader>
                <CardTitle>LanguageToggle 语言切换</CardTitle>
                <CardDescription>支持中文/英文切换</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                    基础切换按钮
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <LanguageToggle size="sm" />
                    <LanguageToggle size="default" showFullName />
                    <CompactLanguageToggle />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                    语言选择器
                  </p>
                  <LanguageSelector />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 页脚信息 */}
        <footer className="text-center py-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400">
            Flotilla Design System v1.0.0 • Last Updated: 2025-10-21
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            &quot;We don&apos;t just host code. We build consensus.&quot; 🎨
          </p>
        </footer>
      </div>
    </div>
  )
}

// ========== 辅助组件 ==========

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{title}</h2>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

function ColorSwatch({
  color,
  label,
  isPrimary = false,
}: {
  color: string
  label: string
  isPrimary?: boolean
}) {
  return (
    <div className="text-center">
      <div
        className={`
          w-full h-20 rounded-lg shadow-md
          bg-${color}
          ${isPrimary ? 'ring-2 ring-offset-2 ring-primary-500' : ''}
          transition-transform hover:scale-105
        `}
      />
      <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-50">{label}</p>
      {isPrimary && (
        <Badge variant="default" className="mt-1">
          Primary
        </Badge>
      )}
    </div>
  )
}

function SemanticColorCard({
  name,
  color,
  lightColor,
  darkColor,
  description,
}: {
  name: string
  color: string
  lightColor: string
  darkColor: string
  description: string
}) {
  return (
    <div className="space-y-3">
      <div className={`${color} h-24 rounded-lg shadow-md`} />
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-50">{name}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        <div className="flex gap-2 mt-2">
          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            Light: {lightColor}
          </span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            Dark: {darkColor}
          </span>
        </div>
      </div>
    </div>
  )
}

function TypeScale({ size, label }: { size: string; label: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-gray-200 dark:border-gray-800 pb-2">
      <span className={`${size} font-semibold text-gray-900 dark:text-gray-50`}>
        The quick brown fox jumps over the lazy dog
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">{label}</span>
    </div>
  )
}
