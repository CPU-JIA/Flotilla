# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🔧 Code Quality & Testing Enhancement (2026-01-16)

**收尾阶段质量优化**

#### Bug Fixes

- **password.service.spec.ts**: 修复测试函数缺少 `async` 关键字导致的语法错误

#### Code Quality

- **ECP 禁止项清理**: 移除生产代码中的 `console.log`（Raft 状态机、存储、WebSocket 传输）
- **类型安全强化**: 消除 `any` 类型，增强 TypeScript 严格模式
- **通知元数据增强**: PR/Issue 通知包含完整上下文信息

#### Performance & Reliability

- **原子计数器优化**: Issue/PR 编号使用 `UPDATE RETURNING` 防止并发竞态
- **权限缓存失效**: 完善缓存失效机制，确保权限变更立即生效

#### Testing

- **后端测试**: 63 套件，1207 测试用例全部通过
- **Git Auth Guard**: 测试覆盖率 95.05%（语句）、91.83%（分支）、100%（函数）
- **新增测试文件**:
  - `test/concurrency/atomic-counters.e2e-spec.ts` - 并发原子计数器测试
  - `test/performance/atomic-counters.perf.spec.ts` - 性能基准测试
  - `test/security/permission-cache-invalidation.e2e-spec.ts` - 权限缓存安全审计

#### Repository Refactoring

- **服务分层**: 拆分 `repositories.service.ts` 为独立服务
  - `repository-branches.service.ts` - 分支管理
  - `repository-files.service.ts` - 文件操作
  - `repository.helpers.ts` - 辅助函数

#### Documentation

- **测试报告**: 新增 Git HTTP 测试报告、性能基准报告、安全审计报告

---

### ✅ Phase 1 Complete: Git HTTP Smart Protocol Verified (2025-10-28)

**Milestone Achievement** - Phase 1 达到100%完成度 🎉

#### Git HTTP Smart Protocol Implementation

- ✅ **Git Clone**: Full support via `/repo/:projectId/info/refs?service=git-upload-pack`
- ✅ **Git Pull/Fetch**: Complete implementation with packfile transfer
- ✅ **Git Push**: Working with minimal pre-receive hook
- ✅ **Route Configuration**: Git endpoints excluded from `/api` global prefix
- ✅ **Docker Environment**: Alpine Linux with `git` + `git-daemon` packages
- ✅ **Integration Tests**: Complete end-to-end test script (`scripts/test-git-integration.sh`)

#### Technical Achievements

- **Simplified Pre-receive Hook**: Reduced from 206 lines to 25 lines following ECP-B2 (KISS) and ECP-A3 (YAGNI)
- **POSIX Compatibility**: Hook uses `/bin/sh` instead of bash for maximum compatibility
- **Git HTTP Backend**: Successfully configured git-http-backend CGI in Alpine container

#### Commits

- `b3fb359` - fix(backend): exclude Git HTTP routes from /api prefix
- `e39a9a3` - fix(backend): install git-daemon for git-http-backend CGI
- `[current]` - refactor(backend): simplify pre-receive hook for Phase 1

#### Phase 1 Final Statistics

- **Backend**: 166 API endpoints across 22 controllers
- **Frontend**: 36 pages with complete UI implementation
- **Tests**: 12,534 lines of test code (17 backend unit tests + 26 E2E tests + Git integration test)
- **Phase 1 Completion**: **100%** ✅

---

### Sprint 3 Complete: Git Protocol & Pull Request System (2025-10-28)

**Sprint 3 Achievements** - Phase 1 达到95%完成度

#### Project Statistics

- **Backend**: 155 API endpoints across 21 controllers
- **Frontend**: 35 pages with complete UI implementation
- **Tests**: 12,130 lines of test code (17 backend unit tests + 26 E2E tests)
- **Database**: 861-line Prisma schema with complete data models
- **Documentation**: 100% Swagger API documentation coverage

#### Added

**Pull Request System** (14 API endpoints完整实现)

- ✅ PR CRUD operations with auto-increment number per project
  - `POST /api/pull-requests` - Create PR
  - `GET /api/pull-requests?projectId=xxx&state=OPEN` - List PRs with filtering
  - `GET /api/pull-requests/:id` - Get PR details
  - `GET /api/pull-requests/project/:projectId/number/:number` - Get PR by number
  - `PATCH /api/pull-requests/:id` - Update PR (author only)
  - `POST /api/pull-requests/:id/close` - Close PR
  - `POST /api/pull-requests/:id/merge` - Merge PR with strategy selection
- ✅ Code Review workflow
  - `POST /api/pull-requests/:id/reviews` - Submit review (APPROVED/CHANGES_REQUESTED/COMMENTED)
  - `GET /api/pull-requests/:id/reviews` - Get all reviews
  - `GET /api/pull-requests/:id/review-summary` - **NEW**: Aggregated review summary
- ✅ PR Comments
  - `POST /api/pull-requests/:id/comments` - Add comment (supports line-level comments)
  - `GET /api/pull-requests/:id/comments` - Get all comments
- ✅ Enhanced PR APIs
  - `GET /api/pull-requests/:id/diff` - **NEW**: Get Git diff with line-level comments
  - `GET /api/pull-requests/:id/merge-status` - **NEW**: Check if PR can be merged
- ✅ PR Approval Rules (Project settings)
  - `requireApprovals` field (default: 1)
  - `allowSelfMerge` field (default: true)
  - `requireReviewFromOwner` field (default: false)
- ✅ Merge Strategies: MERGE (commit), SQUASH (single commit), REBASE (linear history)
- ✅ Line-level comments with `filePath` + `lineNumber` + `commitHash` locking

**Git HTTP Smart Protocol** (11 API endpoints)

- ✅ `GET /repo/:projectId/info/refs?service=git-upload-pack` - Protocol negotiation
- ✅ `POST /repo/:projectId/git-upload-pack` - git clone/fetch support
- ✅ `POST /repo/:projectId/git-receive-pack` - git push support
- ✅ Standard Git protocol implementation (compatible with git CLI)
- ✅ Integration with Prisma + MinIO storage backend

**Notification System** (8 API endpoints + WebSocket)

- ✅ `GET /api/notifications` - List notifications with pagination and filtering
- ✅ `GET /api/notifications/:id` - Get notification details
- ✅ `PATCH /api/notifications/:id/read` - Mark notification as read
- ✅ `PATCH /api/notifications/read-all` - Batch mark as read
- ✅ `DELETE /api/notifications/:id` - Delete notification
- ✅ `GET /api/notifications/preferences` - Get notification preferences
- ✅ `PATCH /api/notifications/preferences` - Update notification preferences
- ✅ WebSocket Gateway (`notifications.gateway.ts`) - Real-time push notifications
- ✅ NotificationPreference model - Fine-grained subscription management
- ✅ Mantine Toast integration in `layout.tsx` for in-app notifications

**Branch Protection** (5 API endpoints + Settings UI)

- ✅ `POST /api/branch-protection` - Create protection rule
- ✅ `GET /api/branch-protection?projectId=xxx` - List protection rules
- ✅ `GET /api/branch-protection/:id` - Get protection rule details
- ✅ `PATCH /api/branch-protection/:id` - Update protection rule
- ✅ `DELETE /api/branch-protection/:id` - Delete protection rule
- ✅ Frontend Settings page (`/projects/[id]/settings/branch-protection`) - 532 lines

#### Testing

- **Backend Unit Tests**: 1,077 lines for PR service (37 test cases, 82.57% coverage)
- **Frontend E2E Tests**: 2,377 lines across 5 PR test files
  - `pr-workflow.spec.ts` (501 lines) - Basic PR creation and listing
  - `pr-review-workflow.spec.ts` (410 lines) - Review submission and display
  - `pr-merge.spec.ts` (464 lines) - Merge strategies and validation
  - `pr-line-comments.spec.ts` (463 lines) - Line-level commenting
  - `pr-review-enhancement.spec.ts` (539 lines) - Review summary and merge status
- **Test Results**: ✅ All tests passing (100% pass rate)

#### Changed

- **Database Schema**: 5 new models added
  - `PullRequest` - PR core data with auto-increment number
  - `PRReview` - Review records with state (APPROVED/CHANGES_REQUESTED/COMMENTED)
  - `PRComment` - Comments with optional line-level positioning
  - `PREvent` - PR timeline events
  - `Notification` - Notification records with read/unread status
- **Project Model**: Added 3 PR approval policy fields
  - `requireApprovals: Int @default(1)`
  - `allowSelfMerge: Boolean @default(true)`
  - `requireReviewFromOwner: Boolean @default(false)`

#### Documentation

- ✅ Updated `CLAUDE.md` with Sprint 3 achievements and Phase 1 statistics
- ✅ Updated `ROADMAP_2025.md` with 95% Phase 1 completion status
- ✅ Phase 1.3 (PR & Code Review) marked as core features 100% complete
- ✅ Phase 1.4 (Notifications) marked as backend 100%, frontend 60% complete
- ✅ All API endpoints documented with Swagger decorators

#### Known Limitations (Phase 2 Features)

- ❌ Draft PR status (database field not present)
- ❌ PR templates
- ❌ PR-Issue linking (`closes #123`)
- ❌ PR labels and milestones
- ❌ Auto-assign reviewers
- ❌ Comment reply threads (no `parentId` field)
- ❌ Suggested changes (apply-able code suggestions)
- ❌ Notification center UI page (`/notifications` route not implemented)
- ❌ Notification bell icon in navigation bar
- ❌ Git HTTP protocol integration tests (actual `git clone/push` validation)
- ❌ SSH Git protocol

---

### PR Review Enhancement (2025-10-25)

#### Added

- **PR Approval Validation System**
  - Added `requireApprovals` field to Project model (default: 1, minimum approvals needed)
  - Added `allowSelfMerge` field to Project model (default: true, allow PR author to merge own PR)
  - Added `requireReviewFromOwner` field to Project model (default: false, require project owner approval)

- **Review Aggregation API**
  - New endpoint: `GET /api/pull-requests/:id/review-summary`
  - Returns aggregated review summary with latest state per reviewer
  - Response includes: `approved`, `changesRequested`, `commented`, `totalReviewers`, `reviewers[]`
  - Implements Map-based aggregation to get latest review per reviewer

- **Merge Status Validation API**
  - New endpoint: `GET /api/pull-requests/:id/merge-status`
  - Validates 4 approval rules:
    1. No active "changes requested" reviews
    2. Minimum approval count satisfied
    3. Self-merge policy enforcement
    4. Owner approval requirement (if configured)
  - Returns: `allowed`, `reason`, `approvalCount`, `requiredApprovals`, `hasChangeRequests`

- **Enhanced Diff API**
  - New endpoint: `GET /api/pull-requests/:id/diff`
  - Returns Git diff with file changes and line-level comments
  - Response includes: `files[]`, `summary`, `comments[]`
  - Filters comments to only include line-level comments (filePath not null)
  - Integrates with `GitService.getDiff()` for diff generation

#### Changed

- **Database Schema**
  - Updated `Project` model with 3 new approval policy fields
  - Migration: `prisma migrate dev --name add_pr_approval_fields`

- **PullRequestsService** (`apps/backend/src/pull-requests/pull-requests.service.ts`)
  - Added `getReviewSummary(prId: string)` method (lines 665-709)
  - Added `canMergePR(prId: string, userId: string)` method (lines 715-794)
  - Added `getDiff(prId: string)` method (lines 800-844)

- **PullRequestsController** (`apps/backend/src/pull-requests/pull-requests.controller.ts`)
  - Added 3 new GET endpoints with Swagger documentation
  - All endpoints protected with `JwtAuthGuard`
  - Response DTOs: `ReviewSummaryResponseDto`, `MergeStatusResponseDto`, `DiffResponseDto`

#### Testing

- **Unit Tests**: 10 new test cases added to `pull-requests.service.spec.ts` (lines 753-1077)
  - `getReviewSummary()`: 2 tests (aggregation logic, state counting)
  - `canMergePR()`: 6 tests (change requests, approvals, self-merge, owner approval, success, not found)
  - `getDiff()`: 2 tests (success with comments, not found)
- **Test Coverage**: 82.57% for `pull-requests.service.ts` (Stmts: 82.57%, Branch: 74.35%, Funcs: 80.95%, Lines: 82.3%)
- **Test Results**: 37/37 tests passing ✅

#### Documentation

- **Swagger API Docs**: All 3 endpoints documented at `http://localhost:4000/api/docs`
- **DTO Schemas**: Complete ApiProperty decorators with Chinese descriptions and examples

---

### Major UI/UX Upgrade (2025-10-21)

#### Added

- **Mantine 7.15 Integration**
  - Added `@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`, `@mantine/dates`, `@mantine/charts`
  - Integrated Mantine theme system with Tailwind CSS 4
  - Added Mantine notifications system with top-right positioning
  - Created `useMantineThemeSync()` hook for synchronizing Mantine with next-themes

- **Enhanced Theme System**
  - New `ThemeToggle` component with 4 variants (basic, labeled, icon-only, selector)
  - New `ThemeSelector` component for Light/Dark/System mode selection
  - Added smooth theme transition animations (<200ms)
  - Implemented theme persistence via localStorage
  - Added Mantine theme synchronization

- **Enhanced Language System**
  - New `LanguageToggle` component with 4 variants (basic, full-name, compact, menu)
  - New `LanguageSelector` component for language selection
  - Added smooth language transition
  - Maintained 100% i18n coverage (zh/en)

- **Design System**
  - Created comprehensive Design System configuration (`design-system.ts`)
  - Updated Tailwind CSS 4 with `@theme` directive
  - Added 700+ line design system documentation (`DESIGN_SYSTEM.md`)
  - Created Design System showcase page (`/design-system`)
  - Established color palette (11 primary shades + 4 semantic colors)
  - Defined typography system (Geist Sans + Geist Mono)
  - Standardized spacing, shadows, and border radius

- **Advanced Components**
  - Created `DataTable` component with pagination, sorting, and custom rendering
  - Added notification system with success/warning/danger/info variants
  - Implemented responsive design across all breakpoints

- **Testing & Documentation**
  - Added E2E tests for theme toggle (7 test cases)
  - Added E2E tests for language toggle (10 test cases)
  - Created `TESTING_GUIDE.md` with comprehensive test documentation
  - Created `PERFORMANCE_CHECKLIST.md` with optimization guidelines
  - Created `ROADMAP_2025.md` with 24-month strategic plan
  - Created `UI_UX_UPGRADE_PLAN.md` with detailed 7-day execution plan

#### Changed

- **AppLayout Component**
  - Replaced basic theme toggle button with enhanced `ThemeToggle` component
  - Replaced basic language toggle button with enhanced `LanguageToggle` component
  - Added `useMantineThemeSync()` hook integration
  - Simplified state management (removed redundant theme/language logic)

- **Root Layout**
  - Integrated `MantineProvider` with custom theme
  - Added Mantine CSS imports (core, notifications, dates, charts)
  - Maintained existing `ThemeProvider` and `LanguageProvider`

- **Global Styles**
  - Updated `globals.css` with Tailwind CSS 4 `@theme` directive
  - Added design system tokens (colors, shadows, typography)
  - Maintained existing markdown preview styles

#### Fixed

- Fixed theme hydration mismatch with mounted state check
- Fixed language persistence across page reloads
- Improved dark mode color contrast for accessibility (WCAG 2.1 AA)

#### Performance

- CSS bundle size optimized with Tailwind CSS 4 JIT mode
- Theme switch latency < 50ms (target met)
- Language switch latency < 100ms (target met)
- Tree-shaking enabled for Mantine components

---

## [1.0.0-MVP] - 2025-10-20

### Added (Pre-existing)

- Bootstrap admin mechanism (3 methods)
- Organization & Team architecture
- Raft consensus algorithm implementation
- Monitoring & performance tracking
- Full i18n support (zh/en, 500+ translations)
- Playwright E2E test suite
- Docker production deployment
- Light/Dark theme support (basic)
- Chinese/English language support (basic)

---

## File Structure Changes

### New Files Created

```
apps/frontend/
├── src/
│   ├── app/
│   │   └── design-system/
│   │       └── page.tsx                          # New: Design System showcase
│   ├── components/
│   │   ├── common/
│   │   │   └── data-table.tsx                    # New: Advanced DataTable
│   │   ├── theme/
│   │   │   └── theme-toggle.tsx                  # New: Enhanced theme toggle
│   │   └── language/
│   │       └── language-toggle.tsx               # New: Enhanced language toggle
│   ├── config/
│   │   ├── design-system.ts                      # New: Design tokens
│   │   └── mantine-theme.ts                      # New: Mantine configuration
│   └── hooks/
│       └── use-mantine-theme-sync.ts             # New: Theme sync hook
├── tests/
│   ├── theme/
│   │   └── theme-toggle.spec.ts                  # New: Theme E2E tests
│   └── language/
│       └── language-toggle.spec.ts               # New: Language E2E tests
├── DESIGN_SYSTEM.md                              # New: Design documentation
├── TESTING_GUIDE.md                              # New: Testing documentation
├── PERFORMANCE_CHECKLIST.md                      # New: Performance guide
└── CHANGELOG.md                                  # New: This file

docs/
├── ROADMAP_2025.md                               # New: 24-month strategic plan
└── UI_UX_UPGRADE_PLAN.md                         # New: 7-day execution plan
```

### Modified Files

```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                            # Updated: Mantine integration
│   │   └── globals.css                           # Updated: @theme directive
│   ├── components/
│   │   └── layout/
│   │       └── AppLayout.tsx                     # Updated: New toggle components
│   └── package.json                              # Updated: Mantine dependencies
```

---

## Dependencies Added

```json
{
  "@mantine/charts": "7.15.0",
  "@mantine/core": "7.15.0",
  "@mantine/dates": "7.15.0",
  "@mantine/form": "7.15.0",
  "@mantine/hooks": "7.15.0",
  "@mantine/notifications": "7.15.0",
  "@tabler/icons-react": "^3.35.0",
  "dayjs": "^1.11.18"
}
```

**Total Size Impact**: +12KB (gzipped)

---

## Breaking Changes

None. All changes are backwards compatible.

---

## Migration Guide

### For Developers

**No migration required.** All existing components continue to work as before. The new design system components are additive.

**To use new components:**

```tsx
// Theme Toggle
import { ThemeToggle } from '@/components/theme/theme-toggle'
;<ThemeToggle size="sm" variant="outline" showLabel />

// Language Toggle
import { LanguageToggle } from '@/components/language/language-toggle'
;<LanguageToggle size="sm" variant="outline" showFullName />

// DataTable
import { DataTable } from '@/components/common/data-table'
;<DataTable columns={columns} data={data} pagination={{ page, total, onPageChange }} />
```

---

## Known Issues

None. All tests passing.

---

## Contributors

- [@Claude-Code] - UI/UX Upgrade Implementation
- [@JIA总] - Project Direction & Requirements

---

## References

- [UI/UX Upgrade Plan](./docs/UI_UX_UPGRADE_PLAN.md)
- [Design System Documentation](./apps/frontend/DESIGN_SYSTEM.md)
- [Testing Guide](./apps/frontend/TESTING_GUIDE.md)
- [Performance Checklist](./apps/frontend/PERFORMANCE_CHECKLIST.md)
- [2025 Roadmap](./docs/ROADMAP_2025.md)

---

**"We don't just host code. We build consensus."** 🎨
