# UI设计与实现文档

**项目名称：** 基于云计算的开发协作平台（Flotilla）
**产品经理：** JIA
**版本：** v2.0（基于实现状态更新）
**编写日期：** 2025-10-10
**最后更新：** 2025-12-22

---

> **实现状态说明**: ✅ 已实现 | ⚠️ 部分实现 | ❌ 未实现
>
> 本文档已根据实际前端实现更新，当前包含 **25+ 页面** 和 **50+ 组件**。

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
--primary-500: #3b82f6; /* 主色 */
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
font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;

/* 中文字体 */
font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

### 3.2 字体大小

| 级别      | 大小 | 行高 | 用途     |
| --------- | ---- | ---- | -------- |
| text-xs   | 12px | 16px | 辅助文字 |
| text-sm   | 14px | 20px | 正文小字 |
| text-base | 16px | 24px | 正文     |
| text-lg   | 18px | 28px | 小标题   |
| text-xl   | 20px | 28px | 标题     |
| text-2xl  | 24px | 32px | 大标题   |
| text-3xl  | 30px | 36px | 页面标题 |
| text-4xl  | 36px | 40px | Hero标题 |

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
--spacing-1: 4px; /* 0.5rem */
--spacing-2: 8px; /* 1rem */
--spacing-3: 12px; /* 1.5rem */
--spacing-4: 16px; /* 2rem */
--spacing-5: 20px; /* 2.5rem */
--spacing-6: 24px; /* 3rem */
--spacing-8: 32px; /* 4rem */
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
<Input placeholder="输入项目名称" error={errors.name?.message} />
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
  <CardContent>{/* 内容 */}</CardContent>
  <CardFooter>{/* 底部操作 */}</CardFooter>
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
  <TableBody>{/* 数据行 */}</TableBody>
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
<Editor height="600px" language="typescript" theme="vs-dark" value={code} onChange={handleChange} />
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

#### 6.2.1 认证页面 ✅

**登录页面**

- **布局：** 居中卡片式
- Logo和标题（顶部）
- 登录表单（用户名/邮箱、密码）
- "忘记密码"链接
- 登录按钮（主色）
- "还没有账号？注册"链接

**注册页面** ✅

- **布局：** 居中卡片式
- 用户名、邮箱、密码输入
- 密码强度指示器（PasswordStrengthIndicator组件）
- 实时验证反馈
- 服务条款和隐私政策同意勾选

**忘记密码页面** ✅

- **路径：** `/auth/forgot-password`
- 邮箱输入表单
- 发送重置邮件按钮
- 返回登录链接

**重置密码页面** ✅

- **路径：** `/auth/reset-password/[token]`
- Token验证
- 新密码输入（含强度指示器）
- 确认密码输入

#### 6.2.2 仪表板页面 ✅

**路径：** `/dashboard`

- 欢迎消息 + 用户统计
- 快速操作卡片（创建项目、浏览组织）
- 最近项目列表
- 系统状态组件（SystemStatus）

#### 6.2.3 项目列表页 ✅

**路径：** `/projects`

- **布局：** 列表视图
- 页面标题 + 创建项目按钮（右上）
- 创建项目对话框（CreateProjectDialog）
- 项目卡片网格（响应式）
  - 项目图标
  - 项目名称
  - 描述（截断）
  - 可见性标签
  - 最后更新时间

#### 6.2.4 项目详情页 ✅

**路径：** `/projects/[id]`

**文件浏览页面** ✅ `/projects/[id]/files`

- 分支选择器（BranchSelector组件）
- 创建分支对话框
- 文件列表组件（FileList）
- 文件上传组件（FileUpload）
- 创建文件夹对话框
- 面包屑导航

**代码编辑器页** ✅ `/projects/[id]/editor`

- **布局：** 全屏式
- 顶部工具栏：文件路径、保存按钮、格式化按钮
- Monaco Editor（主区域）
- 底部状态栏：行列号、文件编码、文件类型

**提交历史页面** ✅ `/projects/[id]/history`

- 提交列表（时间线展示）
- 每条提交显示：hash、消息、作者、时间
- 分支筛选

#### 6.2.5 Issue追踪页面 ✅

**Issue列表页** ✅ `/projects/[id]/issues`

- 页面标题 + 新建Issue按钮
- 筛选器：状态（Open/Closed）、标签、里程碑
- Issue列表
  - 编号、标题、状态标签
  - 标签（彩色Badge）
  - 被分配人头像
  - 评论数
  - 创建时间

**Issue详情页** ✅ `/projects/[id]/issues/[number]`

- Issue标题 + 编号 + 状态
- Markdown内容渲染（MarkdownPreview组件）
- 侧边栏：
  - 被分配人（AssigneesSelector）
  - 标签（LabelSelector）
  - 里程碑（MilestoneSelector）
- 评论列表（CommentsList组件）
- 评论表单（CommentForm组件，Markdown编辑）
- 关闭/重新打开按钮

**创建Issue页** ✅ `/projects/[id]/issues/new`

- 标题输入
- Markdown编辑器（MarkdownEditor组件）
- 标签选择器
- 被分配人选择器
- 里程碑选择器
- 提交按钮

**标签管理页** ✅ `/projects/[id]/labels`

- 标签列表（名称、颜色、描述、Issue数量）
- 创建标签对话框（LabelDialog）
- 颜色选择器（ColorPicker）
- 编辑/删除操作

**里程碑管理页** ✅ `/projects/[id]/milestones`

- 里程碑列表
  - 标题、描述、截止日期
  - 进度条（完成的Issue百分比）
  - Open/Closed Issue数量
- 创建里程碑对话框（MilestoneDialog）
- 关闭/重新打开里程碑

#### 6.2.6 Pull Request页面 ✅

**PR列表页** ✅ `/projects/[id]/pulls`

- 页面标题 + 新建PR按钮
- 筛选器：状态（Open/Merged/Closed）
- PR列表
  - 编号、标题、状态
  - 源分支 → 目标分支
  - 作者、创建时间

**PR详情页** ✅ `/projects/[id]/pulls/[number]`

- PR标题 + 编号 + 状态
- 描述（Markdown渲染）
- 标签页切换：
  - Conversation（讨论）
  - Files Changed（文件差异）
  - Commits（提交列表）
- 审查摘要卡片（ReviewSummaryCard）
- Diff文件视图（DiffFileView组件）
- 合并按钮（含策略选择：merge/squash/rebase）
- 关闭PR按钮

**创建PR页** ✅ `/projects/[id]/pulls/new`

- 源分支选择
- 目标分支选择
- 标题输入
- 描述（Markdown编辑器）
- 提交按钮

#### 6.2.7 项目设置页 ✅

**路径：** `/projects/[id]/settings`

- **布局：** 侧边导航 + 内容区

**通用设置** ✅ `/settings/general`

- 项目名称
- 描述
- 可见性切换

**成员管理** ✅ `/settings/members`

- 成员列表（DataTable）
- 角色标签（OWNER/MAINTAINER/MEMBER/VIEWER）
- 邀请成员对话框（AddMemberDialog）
- 角色修改
- 移除成员

**Pull Request设置** ✅ `/settings/pull-requests`

- 合并策略配置
- 默认审查者设置

**分支保护** ✅ `/settings/branch-protection`

- 保护规则列表
- 创建规则表单：
  - 分支模式（如：main, release/\*）
  - 必须通过PR
  - 最少审批人数
  - 禁止强制推送
  - 禁止删除
- 编辑/删除规则

**危险操作** ✅ `/settings/danger`

- 归档项目（黄色警告区）
- 删除项目（红色警告区，需确认）

#### 6.2.8 项目内搜索页 ✅

**路径：** `/projects/[id]/search`

- 搜索输入框（SearchBar组件）
- 搜索结果列表（SearchResultItem）
- 文件路径、匹配行号、代码上下文高亮

#### 6.2.9 组织与团队页面 ✅

**组织列表页** ✅ `/organizations`

- 我的组织列表
- 创建组织对话框（CreateOrganizationDialog）
- 组织卡片：名称、成员数、项目数

**组织详情页** ✅ `/organizations/[slug]`

- **标签页布局：**
  - Overview（概览）
  - Teams（团队列表）
  - Members（成员列表）
  - Settings（设置，仅Admin可见）
- 组织成员管理（MembersTab组件）
- 添加成员对话框（AddOrganizationMemberDialog）
- 团队列表（TeamsTab组件）
- 创建团队对话框（CreateTeamDialog）
- 组织设置（SettingsTab组件）

**团队详情页** ✅ `/organizations/[slug]/teams/[teamSlug]`

- **标签页布局：**
  - Overview（概览，OverviewTab）
  - Members（成员列表，MembersTab）
  - Permissions（项目权限，PermissionsTab）
  - Settings（设置，仅Maintainer可见，SettingsTab）
- 团队成员管理
- 项目权限分配

#### 6.2.10 全局搜索页 ✅

**路径：** `/search`

- 搜索栏（SearchBar组件）
- 搜索过滤器（SearchFilters组件）
  - 项目筛选
  - 语言筛选
- 搜索结果列表
- 代码上下文高亮显示

#### 6.2.11 通知中心 ✅

**通知图标** ✅ 全局导航栏

- 通知铃铛（NotificationBell组件）
- 未读数量Badge
- 下拉预览

**通知页面** ✅ `/notifications`

- 通知列表
- 类型图标（PR、Issue、评论等）
- 已读/未读状态
- 标记全部已读按钮
- 通知偏好设置入口

#### 6.2.12 管理员页面 ✅

**管理员首页** ✅ `/admin`

- 系统统计卡片
- 用户统计
- 项目统计
- 快速导航

**用户管理** ✅ `/admin/users`

- 用户列表（DataTable）
- 角色筛选
- 添加用户对话框（AddUserDialog）
- 编辑用户角色
- 封禁/解封用户

**项目管理** ✅ `/admin/projects`

- 项目列表
- 按可见性筛选
- 归档/删除操作

**集群管理** ✅ `/admin/cluster`

- Raft集群状态
- 节点健康检查

#### 6.2.13 Raft集群可视化页面 ✅

**路径：** `/raft`

- 集群拓扑图（ClusterTopology组件）
  - 节点状态（Leader/Follower/Candidate）
  - 节点连接线
  - 实时心跳动画
- 控制面板（ControlPanel组件）
  - 启动/停止集群
  - 触发选举
  - 发送命令
- 性能指标图表（MetricsChart组件）
  - 命令处理速率
  - 响应时间
- 日志实时显示

#### 6.2.14 设计系统预览页 ✅

**路径：** `/design-system`

- 颜色系统展示
- 排版规范展示
- 组件库预览
- 交互状态演示

---

## 7. 响应式设计

### 7.1 断点（Breakpoints）

```css
/* Mobile */
@media (max-width: 640px) {
  /* sm */
}

/* Tablet */
@media (min-width: 768px) {
  /* md */
}

/* Laptop */
@media (min-width: 1024px) {
  /* lg */
}

/* Desktop */
@media (min-width: 1280px) {
  /* xl */
}
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
toast.success('项目创建成功')
toast.error('操作失败，请重试')
toast.info('正在处理...')
```

**确认对话框**

```tsx
<AlertDialog>
  <AlertDialogTrigger>删除项目</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>确认删除？</AlertDialogTitle>
    <AlertDialogDescription>此操作不可撤销</AlertDialogDescription>
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
  </button>
</nav>
```

### 9.3 ARIA属性

```tsx
<button aria-expanded={isOpen} aria-controls="menu-content">
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
import { Home, Folder, File, Settings, User, GitBranch, GitCommit } from 'lucide-react'
```

**常用图标：**

- 主页：Home
- 项目：Folder
- 文件：File / FileCode
- 设置：Settings
- 用户：User / Users
- Git操作：GitBranch, GitCommit, GitPullRequest
- 操作：Plus, Edit, Trash, Search, MoreVertical
- Issue：CircleDot, CircleCheck
- PR：GitMerge, GitPullRequestClosed
- 通知：Bell, BellRing
- 组织：Building, Users

---

## 11. 组件库详细清单

### 11.1 UI基础组件（Shadcn/ui） ✅

| 组件         | 文件                   | 说明                        |
| ------------ | ---------------------- | --------------------------- |
| Button       | `ui/button.tsx`        | 按钮（多变体、多尺寸）      |
| Input        | `ui/input.tsx`         | 输入框                      |
| Textarea     | `ui/textarea.tsx`      | 多行文本输入                |
| Select       | `ui/select.tsx`        | 下拉选择                    |
| Label        | `ui/label.tsx`         | 表单标签                    |
| Form         | `ui/form.tsx`          | 表单封装（react-hook-form） |
| Card         | `ui/card.tsx`          | 卡片容器                    |
| Dialog       | `ui/dialog.tsx`        | 对话框/模态框               |
| Alert        | `ui/alert.tsx`         | 警告提示                    |
| Badge        | `ui/badge.tsx`         | 标签徽章                    |
| Table        | `ui/table.tsx`         | 表格                        |
| Tabs         | `ui/tabs.tsx`          | 标签页                      |
| Separator    | `ui/separator.tsx`     | 分隔线                      |
| Avatar       | `ui/avatar.tsx`        | 用户头像                    |
| AvatarUpload | `ui/avatar-upload.tsx` | 头像上传组件                |

### 11.2 业务功能组件 ✅

#### 认证相关

| 组件                      | 文件                                 | 说明           |
| ------------------------- | ------------------------------------ | -------------- |
| PasswordStrengthIndicator | `auth/PasswordStrengthIndicator.tsx` | 密码强度指示器 |

#### 文件管理

| 组件               | 文件                             | 说明             |
| ------------------ | -------------------------------- | ---------------- |
| FileList           | `files/file-list.tsx`            | 文件列表展示     |
| FileUpload         | `files/file-upload.tsx`          | 文件上传组件     |
| CreateFolderDialog | `files/create-folder-dialog.tsx` | 创建文件夹对话框 |

#### Git相关

| 组件               | 文件                           | 说明           |
| ------------------ | ------------------------------ | -------------- |
| BranchSelector     | `git/branch-selector.tsx`      | 分支选择器     |
| CreateBranchDialog | `git/create-branch-dialog.tsx` | 创建分支对话框 |

#### 项目管理

| 组件                | 文件                                 | 说明           |
| ------------------- | ------------------------------------ | -------------- |
| CreateProjectDialog | `projects/create-project-dialog.tsx` | 创建项目对话框 |
| ProjectMembersPanel | `projects/project-members-panel.tsx` | 项目成员面板   |
| InviteMemberDialog  | `projects/invite-member-dialog.tsx`  | 邀请成员对话框 |
| AddMemberDialog     | `projects/add-member-dialog.tsx`     | 添加成员对话框 |

#### 组织管理

| 组件                        | 文件                                               | 说明           |
| --------------------------- | -------------------------------------------------- | -------------- |
| CreateOrganizationDialog    | `organizations/create-organization-dialog.tsx`     | 创建组织对话框 |
| AddOrganizationMemberDialog | `organizations/add-organization-member-dialog.tsx` | 添加组织成员   |
| MembersTab                  | `organizations/members-tab.tsx`                    | 成员列表标签页 |
| TeamsTab                    | `organizations/teams-tab.tsx`                      | 团队列表标签页 |
| SettingsTab                 | `organizations/settings-tab.tsx`                   | 设置标签页     |

#### 团队管理

| 组件             | 文件                           | 说明           |
| ---------------- | ------------------------------ | -------------- |
| CreateTeamDialog | `teams/create-team-dialog.tsx` | 创建团队对话框 |
| OverviewTab      | `teams/overview-tab.tsx`       | 团队概览标签页 |
| MembersTab       | `teams/members-tab.tsx`        | 团队成员标签页 |
| PermissionsTab   | `teams/permissions-tab.tsx`    | 项目权限标签页 |
| SettingsTab      | `teams/settings-tab.tsx`       | 团队设置标签页 |

#### Issue追踪

| 组件              | 文件                               | 说明             |
| ----------------- | ---------------------------------- | ---------------- |
| LabelSelector     | `labels/LabelSelector.tsx`         | 标签选择器       |
| LabelDialog       | `labels/LabelDialog.tsx`           | 标签编辑对话框   |
| ColorPicker       | `labels/ColorPicker.tsx`           | 颜色选择器       |
| MilestoneSelector | `milestones/MilestoneSelector.tsx` | 里程碑选择器     |
| MilestoneDialog   | `milestones/MilestoneDialog.tsx`   | 里程碑编辑对话框 |
| AssigneesSelector | `assignees/AssigneesSelector.tsx`  | 被分配人选择器   |
| CommentForm       | `comments/CommentForm.tsx`         | 评论表单         |
| CommentsList      | `comments/CommentsList.tsx`        | 评论列表         |

#### Markdown

| 组件            | 文件                           | 说明           |
| --------------- | ------------------------------ | -------------- |
| MarkdownEditor  | `markdown/MarkdownEditor.tsx`  | Markdown编辑器 |
| MarkdownPreview | `markdown/MarkdownPreview.tsx` | Markdown预览   |

#### Pull Request

| 组件              | 文件                                    | 说明         |
| ----------------- | --------------------------------------- | ------------ |
| ReviewSummaryCard | `pull-requests/review-summary-card.tsx` | 审查摘要卡片 |
| DiffFileView      | `pull-requests/diff-file-view.tsx`      | 代码差异视图 |

#### 搜索

| 组件             | 文件                          | 说明       |
| ---------------- | ----------------------------- | ---------- |
| SearchBar        | `search/SearchBar.tsx`        | 搜索输入框 |
| SearchResultItem | `search/SearchResultItem.tsx` | 搜索结果项 |
| SearchFilters    | `search/SearchFilters.tsx`    | 搜索过滤器 |

#### 通知

| 组件             | 文件                                 | 说明     |
| ---------------- | ------------------------------------ | -------- |
| NotificationBell | `notifications/NotificationBell.tsx` | 通知铃铛 |

#### Raft可视化

| 组件            | 文件                        | 说明         |
| --------------- | --------------------------- | ------------ |
| ClusterTopology | `raft/cluster-topology.tsx` | 集群拓扑图   |
| CommandPanel    | `raft/command-panel.tsx`    | 命令控制面板 |

#### 管理员

| 组件          | 文件                        | 说明           |
| ------------- | --------------------------- | -------------- |
| AddUserDialog | `admin/add-user-dialog.tsx` | 添加用户对话框 |

#### 仪表板

| 组件         | 文件                         | 说明         |
| ------------ | ---------------------------- | ------------ |
| SystemStatus | `dashboard/SystemStatus.tsx` | 系统状态组件 |

#### 通用组件

| 组件            | 文件                           | 说明                     |
| --------------- | ------------------------------ | ------------------------ |
| LoadingSkeleton | `common/loading-skeleton.tsx`  | 加载骨架屏               |
| DataTable       | `common/data-table.tsx`        | 数据表格（含排序、分页） |
| ThemeToggle     | `theme/theme-toggle.tsx`       | 主题切换                 |
| LanguageToggle  | `language/language-toggle.tsx` | 语言切换                 |

---

## 12. 实现技术栈

| 技术                         | 用途           |
| ---------------------------- | -------------- |
| **Tailwind CSS 4.0**         | 原子化CSS      |
| **Shadcn/ui**                | 组件库基础     |
| **Radix UI**                 | 无障碍组件原语 |
| **Framer Motion**            | 动画库（可选） |
| **Monaco Editor**            | 代码编辑器     |
| **Lucide React**             | 图标库         |
| **React Syntax Highlighter** | 代码高亮       |

---

## 13. 设计规范检查清单

- [x] 所有按钮有Hover/Active/Disabled状态
- [x] 所有表单有验证和错误提示
- [x] 所有异步操作有Loading状态
- [x] 所有破坏性操作有确认对话框
- [x] 所有图片有alt属性
- [x] 所有链接有下划线或清晰的视觉区分
- [x] 支持暗色模式
- [x] 移动端友好
- [x] 键盘可导航
- [ ] 通过WCAG 2.1 AA标准（部分实现）

---

## 14. 版本历史

| 版本 | 日期       | 变更内容                                                                                                                       | 作者 |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ---- |
| v1.0 | 2025-10-10 | 初始版本，基础UI规范定义                                                                                                       | JIA  |
| v2.0 | 2025-12-22 | 根据实现状态全面更新：<br>- 新增25+页面设计详细规格<br>- 新增50+组件库清单<br>- 标注所有页面实现状态<br>- 更新设计规范检查清单 | JIA  |

---

**文档作者：** JIA
**最后更新：** 2025-12-22
