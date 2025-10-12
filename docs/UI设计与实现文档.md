# UI设计与实现文档

**项目名称：** 基于云计算的开发协作平台
**产品经理：** JIA
**版本：** v1.0
**编写日期：** 2025-10-10

---

## 1. 设计原则

### 1.1 核心设计理念

**简洁高效（Simplicity & Efficiency）**
- 减少用户认知负担
- 最短路径完成任务
- 信息层次清晰

**专业可靠（Professional & Reliable）**
- 面向开发者的专业工具
- 稳定一致的交互体验
- 清晰的视觉反馈

**现代美观（Modern & Aesthetic）**
- 遵循2025年设计趋势
- 精致的视觉细节
- 愉悦的使用体验

### 1.2 设计系统参考

- **参考对象：** GitHub, GitLab, Vercel
- **设计语言：** Material Design 3 + Tailwind Design System
- **组件库：** Shadcn/ui (基于Radix UI)

---

## 2. 色彩系统

### 2.1 主色调（Primary Colors）

```css
/* 品牌色 - 蓝色系 */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* 主色 */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;
```

### 2.2 中性色（Neutral Colors）

```css
/* 灰色系 - 用于文本、背景、边框 */
--neutral-50: #fafafa;
--neutral-100: #f5f5f5;
--neutral-200: #e5e5e5;
--neutral-300: #d4d4d4;
--neutral-400: #a3a3a3;
--neutral-500: #737373;
--neutral-600: #525252;
--neutral-700: #404040;
--neutral-800: #262626;
--neutral-900: #171717;
```

### 2.3 语义色（Semantic Colors）

```css
/* 成功 */
--success: #10b981;
--success-light: #d1fae5;

/* 警告 */
--warning: #f59e0b;
--warning-light: #fed7aa;

/* 错误 */
--error: #ef4444;
--error-light: #fecaca;

/* 信息 */
--info: #3b82f6;
--info-light: #dbeafe;
```

### 2.4 暗色模式（Dark Mode）

```css
/* 暗色背景 */
--dark-bg-primary: #0d1117;
--dark-bg-secondary: #161b22;
--dark-bg-tertiary: #1f2937;

/* 暗色文本 */
--dark-text-primary: #f9fafb;
--dark-text-secondary: #d1d5db;
--dark-text-tertiary: #9ca3af;
```

---

## 3. 排版系统

### 3.1 字体家族

```css
/* 主字体 */
font-family:
  'Inter',
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  sans-serif;

/* 代码字体 */
font-family:
  'JetBrains Mono',
  'Fira Code',
  'Courier New',
  monospace;

/* 中文字体 */
font-family:
  'Inter',
  'PingFang SC',
  'Microsoft YaHei',
  sans-serif;
```

### 3.2 字体大小

| 级别 | 大小 | 行高 | 用途 |
|------|------|------|------|
| text-xs | 12px | 16px | 辅助文字 |
| text-sm | 14px | 20px | 正文小字 |
| text-base | 16px | 24px | 正文 |
| text-lg | 18px | 28px | 小标题 |
| text-xl | 20px | 28px | 标题 |
| text-2xl | 24px | 32px | 大标题 |
| text-3xl | 30px | 36px | 页面标题 |
| text-4xl | 36px | 40px | Hero标题 |

### 3.3 字重（Font Weight）

- **Light (300):** 辅助信息
- **Regular (400):** 正文
- **Medium (500):** 强调文字
- **Semibold (600):** 小标题
- **Bold (700):** 标题

---

## 4. 间距系统

采用8px网格系统：

```css
--spacing-1: 4px;   /* 0.5rem */
--spacing-2: 8px;   /* 1rem */
--spacing-3: 12px;  /* 1.5rem */
--spacing-4: 16px;  /* 2rem */
--spacing-5: 20px;  /* 2.5rem */
--spacing-6: 24px;  /* 3rem */
--spacing-8: 32px;  /* 4rem */
--spacing-10: 40px; /* 5rem */
--spacing-12: 48px; /* 6rem */
--spacing-16: 64px; /* 8rem */
```

---

## 5. 组件设计

### 5.1 按钮（Button）

**主要按钮（Primary Button）**
```tsx
<Button variant="primary" size="md">
  创建项目
</Button>
```

**变体（Variants）:**
- `primary` - 主要操作（蓝色）
- `secondary` - 次要操作（灰色）
- `outline` - 边框按钮
- `ghost` - 透明按钮
- `destructive` - 危险操作（红色）

**尺寸（Sizes）:**
- `sm` - 高度32px，padding 8px 12px
- `md` - 高度40px，padding 10px 16px
- `lg` - 高度48px，padding 12px 24px

### 5.2 输入框（Input）

```tsx
<Input
  placeholder="输入项目名称"
  error={errors.name?.message}
/>
```

**状态：**
- Default（默认）
- Focus（聚焦）- 蓝色边框
- Error（错误）- 红色边框 + 错误提示
- Disabled（禁用）- 灰色背景

### 5.3 卡片（Card）

```tsx
<Card>
  <CardHeader>
    <CardTitle>项目名称</CardTitle>
    <CardDescription>项目描述</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 内容 */}
  </CardContent>
  <CardFooter>
    {/* 底部操作 */}
  </CardFooter>
</Card>
```

**样式：**
- 背景：white / dark-bg-secondary
- 边框：1px solid neutral-200
- 圆角：8px
- 阴影：subtle shadow
- Hover：轻微提升效果

### 5.4 导航栏（Navigation）

**顶部导航栏**
- 高度：64px
- Logo（左侧）
- 搜索框（中间）
- 用户菜单（右侧）

**侧边栏**
- 宽度：240px（可收起至60px）
- 导航项：40px高度
- Icon + 文字标签

### 5.5 表格（Table）

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>项目名称</TableHead>
      <TableHead>可见性</TableHead>
      <TableHead>更新时间</TableHead>
      <TableHead>操作</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {/* 数据行 */}
  </TableBody>
</Table>
```

**特性：**
- 斑马条纹（可选）
- Hover高亮
- 排序功能
- 分页器

### 5.6 代码编辑器

使用Monaco Editor：
```tsx
<Editor
  height="600px"
  language="typescript"
  theme="vs-dark"
  value={code}
  onChange={handleChange}
/>
```

---

## 6. 页面布局

### 6.1 整体布局结构

```
┌─────────────────────────────────────────┐
│        顶部导航栏 (64px)                  │
├──────────┬──────────────────────────────┤
│          │                              │
│  侧边栏  │        主内容区域              │
│ (240px)  │                              │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

### 6.2 关键页面设计

#### 6.2.1 登录页面

**布局：** 居中卡片式
- Logo和标题（顶部）
- 登录表单（用户名/邮箱、密码）
- "忘记密码"链接
- 登录按钮（主色）
- "还没有账号？注册"链接

#### 6.2.2 项目列表页

**布局：** 列表视图
- 页面标题 + 创建项目按钮（右上）
- 筛选器（标签栏）：全部 / 我的项目 / 参与的项目
- 搜索框
- 项目卡片网格（3列）
  - 项目图标
  - 项目名称
  - 描述（截断）
  - 可见性标签
  - 最后更新时间
  - Star数量
- 分页器（底部）

#### 6.2.3 仓库详情页

**布局：** 分栏式
- **顶部区域：**
  - 面包屑导航
  - 仓库名称
  - Star按钮 / Fork按钮
  - 设置按钮（Owner可见）

- **左侧主内容区：**
  - 分支选择器
  - 文件树（可折叠）
  - README预览

- **右侧信息栏：**
  - About（描述）
  - 最新提交信息
  - 贡献者列表
  - 使用的语言

#### 6.2.4 代码编辑器页

**布局：** 全屏式
- 顶部工具栏：
  - 文件路径
  - 保存按钮
  - 格式化按钮
- Monaco Editor（主区域）
- 底部状态栏：
  - 行列号
  - 文件编码
  - 文件类型

#### 6.2.5 项目设置页

**布局：** 侧边导航 + 内容区
- 左侧设置菜单：
  - 通用设置
  - 成员管理
  - 可见性
  - 危险操作
- 右侧设置表单

---

## 7. 响应式设计

### 7.1 断点（Breakpoints）

```css
/* Mobile */
@media (max-width: 640px) { /* sm */ }

/* Tablet */
@media (min-width: 768px) { /* md */ }

/* Laptop */
@media (min-width: 1024px) { /* lg */ }

/* Desktop */
@media (min-width: 1280px) { /* xl */ }
```

### 7.2 响应式布局策略

**移动端（< 768px）：**
- 隐藏侧边栏，改用汉堡菜单
- 单列布局
- 全宽卡片
- 简化导航栏

**平板端（768px - 1024px）：**
- 可收起侧边栏
- 2列网格布局
- 优化触控交互

**桌面端（> 1024px）：**
- 完整侧边栏
- 3列网格布局
- 支持键盘快捷键

---

## 8. 交互设计

### 8.1 加载状态

**骨架屏（Skeleton）**
```tsx
<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-3/4" />
```

**加载动画（Spinner）**
```tsx
<Spinner size="md" />
```

### 8.2 反馈提示

**Toast通知**
```tsx
toast.success("项目创建成功")
toast.error("操作失败，请重试")
toast.info("正在处理...")
```

**确认对话框**
```tsx
<AlertDialog>
  <AlertDialogTrigger>删除项目</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>确认删除？</AlertDialogTitle>
    <AlertDialogDescription>
      此操作不可撤销
    </AlertDialogDescription>
    <AlertDialogActions>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction>确认</AlertDialogAction>
    </AlertDialogActions>
  </AlertDialogContent>
</AlertDialog>
```

### 8.3 动画效果

**过渡动画**
```css
transition: all 200ms ease-in-out;
```

**Hover效果**
- 按钮：轻微变暗 + 阴影提升
- 卡片：阴影加深 + 轻微上移
- 链接：颜色变化

**页面切换**
- 淡入淡出（Fade）
- 滑动（Slide）

---

## 9. 可访问性（A11y）

### 9.1 键盘导航

- 所有交互元素支持Tab键导航
- 焦点状态清晰可见
- 快捷键支持（Ctrl+K打开搜索）

### 9.2 语义化HTML

```html
<nav aria-label="主导航">
<button aria-label="关闭对话框">
<img alt="项目图标" src="..." />
```

### 9.3 ARIA属性

```tsx
<button
  aria-expanded={isOpen}
  aria-controls="menu-content"
>
  菜单
</button>
```

### 9.4 对比度

- 正文：至少4.5:1
- 大文字：至少3:1
- UI组件：至少3:1

---

## 10. 图标系统

使用Lucide React图标库：

```tsx
import {
  Home,
  Folder,
  File,
  Settings,
  User,
  GitBranch,
  GitCommit
} from 'lucide-react'
```

**常用图标：**
- 主页：Home
- 项目：Folder
- 文件：File / FileCode
- 设置：Settings
- 用户：User / Users
- Git操作：GitBranch, GitCommit, GitPullRequest
- 操作：Plus, Edit, Trash, Search, MoreVertical

---

## 11. 实现技术栈

| 技术 | 用途 |
|------|------|
| **Tailwind CSS 4.0** | 原子化CSS |
| **Shadcn/ui** | 组件库基础 |
| **Radix UI** | 无障碍组件原语 |
| **Framer Motion** | 动画库（可选）|
| **Monaco Editor** | 代码编辑器 |
| **Lucide React** | 图标库 |
| **React Syntax Highlighter** | 代码高亮 |

---

## 12. 设计规范检查清单

- [ ] 所有按钮有Hover/Active/Disabled状态
- [ ] 所有表单有验证和错误提示
- [ ] 所有异步操作有Loading状态
- [ ] 所有破坏性操作有确认对话框
- [ ] 所有图片有alt属性
- [ ] 所有链接有下划线或清晰的视觉区分
- [ ] 支持暗色模式
- [ ] 移动端友好
- [ ] 键盘可导航
- [ ] 通过WCAG 2.1 AA标准

---

**文档作者：** JIA
**最后更新：** 2025-10-10

