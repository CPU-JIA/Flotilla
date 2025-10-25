# PR Review Enhancement - Frontend UI Specification

**Version:** 1.0
**Date:** 2025-10-25
**Status:** Ready for Implementation
**Backend Commit:** 117eeac (feat: PR approval validation and review aggregation)

---

## 📋 Overview

### Project Status

- ✅ **Backend API Implementation:** COMPLETE
  - 3 new endpoints implemented and tested
  - 37/37 unit tests passing
  - 82.57% code coverage
  - Complete Swagger documentation

- ⏳ **Frontend UI Implementation:** PENDING (this specification)
  - Target: 4 UI components
  - Estimated time: 120 minutes (2 hours)
  - Priority: Critical for user experience

### Backend APIs Available

| Endpoint | Method | Purpose | Response DTO |
|----------|--------|---------|--------------|
| `/api/pull-requests/:id/review-summary` | GET | Get aggregated review summary | `ReviewSummaryResponseDto` |
| `/api/pull-requests/:id/merge-status` | GET | Validate merge eligibility | `MergeStatusResponseDto` |
| `/api/pull-requests/:id/diff` | GET | Get diff with line comments | `DiffResponseDto` |

**Note:** All endpoints are protected with `JwtAuthGuard` and documented in Swagger at `http://localhost:4000/api/docs`.

### Current Frontend State

**Existing PR Detail Page:** `apps/frontend/src/app/projects/[id]/pulls/[number]/page.tsx`

**Already Implemented:**
- ✅ PR basic information display
- ✅ Reviews list (all reviews chronologically)
- ✅ Diff display (basic, without line comments)
- ✅ Comments section
- ✅ Review submission dialog
- ✅ Merge dialog (3 strategies)

**Missing Features (TO IMPLEMENT):**
- ❌ Review Summary Card (aggregated latest states)
- ❌ Merge Button Validation (with approval progress)
- ❌ Diff Line Comments (comments on specific lines)
- ❌ Project Settings - PR Approval Policy

---

## 🎯 Component Specifications

### Component 1: Review Summary Card (Priority: HIGH)

#### Location
- **New File:** `apps/frontend/src/components/pull-requests/review-summary-card.tsx`
- **Integration:** `apps/frontend/src/app/projects/[id]/pulls/[number]/page.tsx` (insert before existing reviews section)

#### Component Interface

```typescript
interface ReviewSummaryCardProps {
  prId: string
  onRefresh?: () => void
}

export function ReviewSummaryCard({ prId, onRefresh }: ReviewSummaryCardProps) {
  // Implementation
}
```

#### API Integration

```typescript
const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  fetchReviewSummary()
}, [prId])

const fetchReviewSummary = async () => {
  try {
    setLoading(true)
    const data = await apiRequest<ReviewSummary>(
      `/pull-requests/${prId}/review-summary`
    )
    setReviewSummary(data)
  } catch (err) {
    console.error('Failed to fetch review summary:', err)
    setError((err as Error).message)
  } finally {
    setLoading(false)
  }
}
```

#### UI Layout

```tsx
<div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-bold">Review Summary</h2>
    <button onClick={fetchReviewSummary} className="text-sm text-blue-600">
      Refresh
    </button>
  </div>

  {/* Aggregated Counts */}
  <div className="flex gap-3 mb-6">
    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
      <span className="text-lg">✅</span>
      <span className="font-semibold">{reviewSummary.approved}</span>
      <span className="text-sm">Approved</span>
    </div>

    <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
      <span className="text-lg">🔴</span>
      <span className="font-semibold">{reviewSummary.changesRequested}</span>
      <span className="text-sm">Changes Requested</span>
    </div>

    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
      <span className="text-lg">💬</span>
      <span className="font-semibold">{reviewSummary.commented}</span>
      <span className="text-sm">Commented</span>
    </div>
  </div>

  {/* Reviewers List */}
  <div>
    <h3 className="font-semibold mb-3">
      Reviewers ({reviewSummary.totalReviewers})
    </h3>
    <div className="space-y-2">
      {reviewSummary.reviewers.map((reviewer) => (
        <div key={reviewer.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
          {/* Avatar */}
          <img
            src={reviewer.avatar || '/default-avatar.png'}
            alt={reviewer.username}
            className="w-8 h-8 rounded-full"
          />

          {/* Username */}
          <span className="font-medium">{reviewer.username}</span>

          {/* Latest State Badge */}
          <span className={`ml-auto px-2 py-1 text-xs rounded ${getReviewStateBadgeClass(reviewer.state)}`}>
            {getReviewStateIcon(reviewer.state)} {reviewer.state}
          </span>

          {/* Timestamp */}
          <span className="text-sm text-gray-500">
            {new Date(reviewer.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  </div>
</div>
```

#### Helper Functions

```typescript
const getReviewStateIcon = (state: ReviewState): string => {
  switch (state) {
    case ReviewState.APPROVED:
      return '✅'
    case ReviewState.CHANGES_REQUESTED:
      return '🔴'
    case ReviewState.COMMENTED:
      return '💬'
    default:
      return ''
  }
}

const getReviewStateBadgeClass = (state: ReviewState): string => {
  switch (state) {
    case ReviewState.APPROVED:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case ReviewState.CHANGES_REQUESTED:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case ReviewState.COMMENTED:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
```

#### Error Handling

```typescript
if (loading) {
  return (
    <div className="border rounded-lg p-6 mb-6">
      <div className="text-center text-gray-500">Loading review summary...</div>
    </div>
  )
}

if (error) {
  return (
    <div className="border rounded-lg p-6 mb-6 bg-red-50 dark:bg-red-900/20">
      <div className="text-red-600">Failed to load review summary: {error}</div>
    </div>
  )
}

if (!reviewSummary) {
  return null
}
```

#### Accessibility

- ✅ Semantic HTML (`<h2>`, `<h3>`)
- ✅ Alt text for avatars
- ✅ ARIA labels for refresh button
- ✅ Keyboard navigation support
- ✅ Screen reader friendly state announcements

---

### Component 2: Merge Button Validation (Priority: HIGH)

#### Location
- **Modified File:** `apps/frontend/src/app/projects/[id]/pulls/[number]/page.tsx`
- **Section:** Replace existing merge button logic (lines 279-284)

#### API Integration

```typescript
const [mergeStatus, setMergeStatus] = useState<MergeStatus | null>(null)
const [loadingMergeStatus, setLoadingMergeStatus] = useState(false)

useEffect(() => {
  if (pr && pr.state === PRState.OPEN) {
    fetchMergeStatus()
  }
}, [pr, reviewSummary]) // Refetch when review summary changes
```

```typescript
const fetchMergeStatus = async () => {
  if (!pr) return

  try {
    setLoadingMergeStatus(true)
    const data = await apiRequest<MergeStatus>(
      `/pull-requests/${pr.id}/merge-status`
    )
    setMergeStatus(data)
  } catch (err) {
    console.error('Failed to fetch merge status:', err)
  } finally {
    setLoadingMergeStatus(false)
  }
}
```

#### UI Implementation

Replace the existing merge button block with:

```tsx
{pr.state === PRState.OPEN && (
  <div className="flex gap-2">
    {/* Add Review Button - Keep as is */}
    <button
      onClick={() => setShowReviewDialog(true)}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      {t.pullRequests.reviews.addReview}
    </button>

    {/* Enhanced Merge Button with Validation */}
    {loadingMergeStatus ? (
      <button
        disabled
        className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
      >
        Checking...
      </button>
    ) : mergeStatus ? (
      mergeStatus.allowed ? (
        <button
          onClick={() => setShowMergeDialog(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
        >
          <span>✓</span>
          <span>{t.pullRequests.detail.mergePR}</span>
          <span className="text-xs opacity-80">
            ({mergeStatus.approvalCount}/{mergeStatus.requiredApprovals})
          </span>
        </button>
      ) : (
        <div className="relative group">
          <button
            disabled
            className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed flex items-center gap-2"
          >
            <span>✗</span>
            <span>Cannot Merge</span>
          </button>

          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-sm rounded shadow-lg z-10">
            <div className="font-semibold mb-1">Merge Blocked</div>
            <div>{mergeStatus.reason}</div>

            {/* Progress Info */}
            <div className="mt-2 text-xs">
              Approvals: {mergeStatus.approvalCount}/{mergeStatus.requiredApprovals}
              {mergeStatus.hasChangeRequests && (
                <span className="block text-red-300">⚠ Active change requests</span>
              )}
            </div>

            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )
    ) : null}

    {/* Close Button - Keep as is */}
    <button
      onClick={handleClose}
      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      {t.pullRequests.detail.closePR}
    </button>
  </div>
)}
```

#### Alternative: Using Shadcn/ui Tooltip

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        disabled
        className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
      >
        ✗ Cannot Merge
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      <div className="space-y-2">
        <p className="font-semibold">Merge Blocked</p>
        <p>{mergeStatus.reason}</p>
        <div className="text-xs border-t pt-2">
          <div>Approvals: {mergeStatus.approvalCount}/{mergeStatus.requiredApprovals}</div>
          {mergeStatus.hasChangeRequests && (
            <div className="text-red-400">⚠ Active change requests</div>
          )}
        </div>
      </div>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### Component 3: Diff Line Comments (Priority: MEDIUM - Optional)

#### Location
- **New File:** `apps/frontend/src/components/pull-requests/diff-file-view.tsx`
- **Modified File:** `apps/frontend/src/app/projects/[id]/pulls/[number]/page.tsx` (replace diff section)

#### Recommended Library

**Option A (Recommended):** Use `react-diff-view` library
```bash
cd apps/frontend
pnpm add react-diff-view diff
```

**Option B:** Implement custom diff parser (more complex)

#### Using react-diff-view

```tsx
import { Diff, Hunk, parseDiff } from 'react-diff-view'
import 'react-diff-view/style/index.css'

interface DiffFileViewProps {
  file: FileDiff
  comments: PRCommentWithAuthor[]
  onAddComment?: (filePath: string, lineNumber: number) => void
}

export function DiffFileView({ file, comments, onAddComment }: DiffFileViewProps) {
  // Parse the patch into hunks
  const [diff] = parseDiff(file.patch || '', { nearbySequences: 'zip' })

  // Group comments by line number
  const commentsByLine = comments.reduce((acc, comment) => {
    const key = `${comment.filePath}:${comment.lineNumber}`
    if (!acc[key]) acc[key] = []
    acc[key].push(comment)
    return acc
  }, {} as Record<string, PRCommentWithAuthor[]>)

  const renderGutter = ({ type, side, lineNumber }: any) => {
    const key = `${file.path}:${lineNumber}`
    const lineComments = commentsByLine[key] || []

    return (
      <div className="diff-gutter">
        <span className="line-number">{lineNumber}</span>
        {lineComments.length > 0 && (
          <span className="comment-indicator">💬 {lineComments.length}</span>
        )}
      </div>
    )
  }

  const renderLine = ({ type, content }: any) => {
    return <span className="diff-line-content">{content}</span>
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded mb-4">
      {/* File Header */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="font-mono text-sm">
          <span className="font-semibold">{file.path}</span>
          <span className="ml-2 text-gray-600">({file.status})</span>
        </div>
        <div className="text-sm text-gray-600">
          <span className="text-green-600">+{file.additions}</span>
          {' '}
          <span className="text-red-600">-{file.deletions}</span>
        </div>
      </div>

      {/* Diff Content */}
      <div className="bg-white dark:bg-gray-900">
        <Diff
          viewType="unified"
          diffType={file.status === 'added' ? 'add' : file.status === 'deleted' ? 'delete' : 'modify'}
          hunks={diff.hunks}
          renderGutter={renderGutter}
        >
          {(hunks) =>
            hunks.map((hunk) => (
              <Hunk key={hunk.content} hunk={hunk} />
            ))
          }
        </Diff>

        {/* Line Comments */}
        {Object.entries(commentsByLine).map(([key, lineComments]) => {
          const [_, lineNumber] = key.split(':')
          return (
            <div key={key} className="border-t border-gray-200 bg-blue-50 dark:bg-blue-900/20 p-3">
              <div className="text-xs text-gray-500 mb-2">
                Comments on line {lineNumber}
              </div>
              {lineComments.map((comment) => (
                <div key={comment.id} className="flex gap-3 mb-2">
                  <img
                    src={comment.author.avatar || '/default-avatar.png'}
                    alt={comment.author.username}
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{comment.author.username}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

#### Integration into PR Detail Page

Replace the existing diff section (lines 340-373):

```tsx
{diff && (
  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
    <h2 className="text-xl font-bold mb-4">{t.pullRequests.diff.title}</h2>

    {/* Summary */}
    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {t.pullRequests.diff.filesChanged.replace('{count}', String(diff.summary.totalFiles))}
      {' · '}
      <span className="text-green-600">
        {t.pullRequests.diff.additions.replace('{count}', String(diff.summary.totalAdditions))}
      </span>
      {' '}
      <span className="text-red-600">
        {t.pullRequests.diff.deletions.replace('{count}', String(diff.summary.totalDeletions))}
      </span>
    </div>

    {/* File Diffs with Line Comments */}
    <div className="space-y-4">
      {diff.files.map((file, idx) => (
        <DiffFileView
          key={idx}
          file={file}
          comments={diff.comments.filter(c => c.filePath === file.path)}
        />
      ))}
    </div>
  </div>
)}
```

---

### Component 4: Project Settings - PR Approval Policy (Priority: LOW - Optional)

#### Location
- **Modified File:** `apps/frontend/src/app/projects/[id]/settings/general/page.tsx`
- **Section:** Add new "Pull Request Settings" card

#### UI Implementation

Add to the settings page:

```tsx
{/* PR Approval Policy Section */}
<Card className="mb-6">
  <CardHeader>
    <CardTitle>Pull Request Approval Rules</CardTitle>
    <CardDescription>
      Configure approval requirements for merging pull requests
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-6">
    {/* Rule 1: Minimum Approvals */}
    <div>
      <Label htmlFor="requireApprovals">Required Approvals</Label>
      <Input
        id="requireApprovals"
        type="number"
        min={0}
        max={10}
        value={projectSettings.requireApprovals}
        onChange={(e) =>
          setProjectSettings({
            ...projectSettings,
            requireApprovals: parseInt(e.target.value, 10),
          })
        }
        className="w-24"
      />
      <p className="text-sm text-gray-500 mt-1">
        Minimum number of approving reviews required before merging (0-10)
      </p>
    </div>

    {/* Rule 2: Allow Self-Merge */}
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="allowSelfMerge">Allow Self-Merge</Label>
        <p className="text-sm text-gray-500">
          Allow PR authors to merge their own pull requests
        </p>
      </div>
      <Switch
        id="allowSelfMerge"
        checked={projectSettings.allowSelfMerge}
        onCheckedChange={(checked) =>
          setProjectSettings({
            ...projectSettings,
            allowSelfMerge: checked,
          })
        }
      />
    </div>

    {/* Rule 3: Require Owner Approval */}
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="requireReviewFromOwner">Require Owner Approval</Label>
        <p className="text-sm text-gray-500">
          Require at least one approval from the project owner
        </p>
      </div>
      <Switch
        id="requireReviewFromOwner"
        checked={projectSettings.requireReviewFromOwner}
        onCheckedChange={(checked) =>
          setProjectSettings({
            ...projectSettings,
            requireReviewFromOwner: checked,
          })
        }
      />
    </div>
  </CardContent>

  <CardFooter>
    <Button onClick={saveProjectSettings}>
      Save Changes
    </Button>
  </CardFooter>
</Card>
```

#### API Integration

```typescript
const saveProjectSettings = async () => {
  try {
    await apiRequest(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        requireApprovals: projectSettings.requireApprovals,
        allowSelfMerge: projectSettings.allowSelfMerge,
        requireReviewFromOwner: projectSettings.requireReviewFromOwner,
      }),
    })

    // Show success notification
    alert('PR approval settings saved successfully')
  } catch (err) {
    console.error('Failed to save settings:', err)
    alert('Failed to save settings')
  }
}
```

---

## 📦 TypeScript Type Definitions

Add to `apps/frontend/src/types/pull-request.ts`:

```typescript
/**
 * Review Summary Response DTO
 * Response from GET /api/pull-requests/:id/review-summary
 */
export interface ReviewSummary {
  /** Number of APPROVED reviews (latest per reviewer) */
  approved: number

  /** Number of CHANGES_REQUESTED reviews (latest per reviewer) */
  changesRequested: number

  /** Number of COMMENTED reviews (latest per reviewer) */
  commented: number

  /** Total number of unique reviewers */
  totalReviewers: number

  /** List of reviewers with their latest review state */
  reviewers: ReviewerSummary[]
}

/**
 * Reviewer Summary
 * Single reviewer's latest review state
 */
export interface ReviewerSummary {
  /** Reviewer user ID */
  id: string

  /** Reviewer username */
  username: string

  /** Reviewer avatar URL */
  avatar: string | null

  /** Latest review state */
  state: ReviewState

  /** Latest review creation timestamp */
  createdAt: Date
}

/**
 * Merge Status Response DTO
 * Response from GET /api/pull-requests/:id/merge-status
 */
export interface MergeStatus {
  /** Whether merge is allowed */
  allowed: boolean

  /** Reason for blocking (if allowed = false) */
  reason?: string

  /** Current number of approvals */
  approvalCount: number

  /** Required number of approvals */
  requiredApprovals: number

  /** Whether there are active change requests */
  hasChangeRequests: boolean
}

/**
 * Diff Response DTO (already partially exists, extend if needed)
 */
export interface DiffResponseDto {
  files: FileDiff[]
  summary: DiffSummary
  comments: PRCommentWithAuthor[]
}

export interface FileDiff {
  path: string
  status: 'added' | 'modified' | 'deleted'
  additions: number
  deletions: number
  patch?: string
}

export interface DiffSummary {
  totalFiles: number
  totalAdditions: number
  totalDeletions: number
}

export interface PRCommentWithAuthor {
  id: string
  body: string
  filePath?: string | null
  lineNumber?: number | null
  commitHash?: string | null
  createdAt: Date
  author: {
    id: string
    username: string
    avatar: string | null
  }
}
```

---

## 🚀 Implementation Plan

### Phase 1: Core Features (Estimated: 50 minutes)

#### Task 1.1: Add Type Definitions (5 minutes)
- [ ] Add `ReviewSummary`, `ReviewerSummary`, `MergeStatus` interfaces to `src/types/pull-request.ts`
- [ ] Verify TypeScript compilation

#### Task 1.2: Review Summary Card (30 minutes)
- [ ] Create `src/components/pull-requests/review-summary-card.tsx`
- [ ] Implement API call logic
- [ ] Implement UI rendering
- [ ] Add error handling and loading states
- [ ] Integrate into PR detail page (before existing reviews section)
- [ ] Test with real API data

#### Task 1.3: Merge Button Validation (15 minutes)
- [ ] Add `mergeStatus` state to PR detail page
- [ ] Implement `fetchMergeStatus()` function
- [ ] Replace existing merge button with validated version
- [ ] Add tooltip/popover for blocked state
- [ ] Test all 4 blocking scenarios:
  - Change requests active
  - Insufficient approvals
  - Self-merge disallowed
  - Owner approval missing

### Phase 2: Enhanced Features (Estimated: 70 minutes - Optional)

#### Task 2.1: Diff Line Comments (40 minutes)
- [ ] Install `react-diff-view` and `diff` packages
- [ ] Create `src/components/pull-requests/diff-file-view.tsx`
- [ ] Implement diff parsing logic
- [ ] Implement line comment rendering
- [ ] Replace existing diff section in PR detail page
- [ ] Test with multiple files and comments

#### Task 2.2: Project Settings PR Tab (30 minutes)
- [ ] Modify `apps/frontend/src/app/projects/[id]/settings/general/page.tsx`
- [ ] Add PR Approval Policy card
- [ ] Implement form state management
- [ ] Implement save functionality
- [ ] Add form validation (requireApprovals: 0-10)
- [ ] Test save and verify database update

---

## ✅ Acceptance Criteria

### For Review Summary Card

- [ ] Card displays aggregated counts (approved, changes requested, commented)
- [ ] Card displays list of reviewers with their latest state
- [ ] Loading state shown while fetching data
- [ ] Error state shown if API fails
- [ ] Refresh button works correctly
- [ ] Dark mode styling is correct
- [ ] Responsive on mobile devices

### For Merge Button Validation

- [ ] Button enabled when merge is allowed
- [ ] Button disabled when merge is blocked
- [ ] Approval progress shown (X/Y approvals)
- [ ] Tooltip/popover shows blocking reason
- [ ] Button state updates when reviews change
- [ ] All 4 blocking scenarios tested

### For Diff Line Comments (Optional)

- [ ] Diff displays with syntax highlighting
- [ ] Comments appear on correct lines
- [ ] File headers show additions/deletions count
- [ ] Multiple files display correctly
- [ ] Empty diff handled gracefully
- [ ] Performance acceptable with large diffs

### For Project Settings (Optional)

- [ ] Form loads current settings from API
- [ ] All 3 fields editable
- [ ] Save button updates database
- [ ] Success/error feedback shown
- [ ] Input validation works (0-10 for approvals)

---

## 🧪 Testing Strategy

### Unit Tests (Optional but Recommended)

```typescript
// Example: review-summary-card.test.tsx
describe('ReviewSummaryCard', () => {
  it('should display aggregated review counts', async () => {
    // Mock API response
    // Render component
    // Assert counts are correct
  })

  it('should show loading state', () => {
    // Render component
    // Assert loading indicator is shown
  })

  it('should handle API errors gracefully', async () => {
    // Mock API error
    // Render component
    // Assert error message is shown
  })
})
```

### E2E Tests (Playwright)

Create `apps/frontend/tests/pull-requests/pr-review-enhancement.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('PR Review Enhancement', () => {
  test('should display review summary', async ({ page }) => {
    // Login
    // Navigate to PR detail page
    // Assert review summary card is visible
    // Assert counts match API data
  })

  test('should block merge when approvals insufficient', async ({ page }) => {
    // Login
    // Navigate to PR with 0 approvals (requireApprovals = 1)
    // Assert merge button is disabled
    // Assert tooltip shows reason
  })

  test('should allow merge when requirements met', async ({ page }) => {
    // Login
    // Navigate to PR with sufficient approvals
    // Assert merge button is enabled
    // Click merge button
    // Assert merge dialog opens
  })
})
```

### Manual Testing Checklist

**Review Summary Card:**
- [ ] Create PR with 0 reviews → Summary shows all zeros
- [ ] Add 1 APPROVED review → Summary shows 1 approved
- [ ] Add 1 CHANGES_REQUESTED review → Summary shows 1 changes requested
- [ ] Same reviewer adds new APPROVED review → Summary updates (not increments)
- [ ] Refresh button fetches latest data

**Merge Button:**
- [ ] PR with 0 approvals (require 1) → Button disabled, tooltip shows "Need 1 more approval"
- [ ] PR with 1 change request → Button disabled, tooltip shows "active change requests"
- [ ] Author tries to merge own PR (allowSelfMerge=false) → Button disabled, tooltip shows "own PR"
- [ ] Non-owner tries to merge (requireReviewFromOwner=true) → Button disabled, tooltip shows "owner approval"
- [ ] All requirements met → Button enabled, shows approval count

**Diff Line Comments:**
- [ ] Diff displays correctly with syntax highlighting
- [ ] Line comments appear on correct lines
- [ ] Multiple comments on same line display correctly
- [ ] Files without comments display normally

**Project Settings:**
- [ ] Settings load current values
- [ ] requireApprovals accepts 0-10
- [ ] Switches toggle correctly
- [ ] Save button persists changes
- [ ] Changes reflected in merge validation

---

## 📚 API Usage Examples

### Example 1: Fetching Review Summary

```typescript
// Request
GET /api/pull-requests/clxxx123/review-summary
Authorization: Bearer <jwt-token>

// Response (200 OK)
{
  "approved": 2,
  "changesRequested": 0,
  "commented": 1,
  "totalReviewers": 3,
  "reviewers": [
    {
      "id": "user-1",
      "username": "johndoe",
      "avatar": "https://example.com/avatar1.jpg",
      "state": "APPROVED",
      "createdAt": "2025-10-25T12:00:00Z"
    },
    {
      "id": "user-2",
      "username": "janedoe",
      "avatar": null,
      "state": "APPROVED",
      "createdAt": "2025-10-25T11:00:00Z"
    },
    {
      "id": "user-3",
      "username": "bobsmith",
      "avatar": "https://example.com/avatar3.jpg",
      "state": "COMMENTED",
      "createdAt": "2025-10-25T10:00:00Z"
    }
  ]
}
```

### Example 2: Checking Merge Status (Blocked)

```typescript
// Request
GET /api/pull-requests/clxxx123/merge-status
Authorization: Bearer <jwt-token>

// Response (200 OK) - Merge Blocked
{
  "allowed": false,
  "reason": "Need 1 more approval(s)",
  "approvalCount": 0,
  "requiredApprovals": 1,
  "hasChangeRequests": false
}
```

### Example 3: Checking Merge Status (Allowed)

```typescript
// Request
GET /api/pull-requests/clxxx456/merge-status
Authorization: Bearer <jwt-token>

// Response (200 OK) - Merge Allowed
{
  "allowed": true,
  "approvalCount": 2,
  "requiredApprovals": 1,
  "hasChangeRequests": false
}
```

### Example 4: Fetching Diff with Comments

```typescript
// Request
GET /api/pull-requests/clxxx123/diff
Authorization: Bearer <jwt-token>

// Response (200 OK)
{
  "files": [
    {
      "path": "src/index.ts",
      "status": "modified",
      "additions": 10,
      "deletions": 5,
      "patch": "@@ -1,5 +1,10 @@\n-old line\n+new line\n..."
    }
  ],
  "summary": {
    "totalFiles": 1,
    "totalAdditions": 10,
    "totalDeletions": 5
  },
  "comments": [
    {
      "id": "comment-1",
      "body": "Consider refactoring this method",
      "filePath": "src/index.ts",
      "lineNumber": 42,
      "commitHash": "abc123",
      "createdAt": "2025-10-25T12:00:00Z",
      "author": {
        "id": "user-1",
        "username": "johndoe",
        "avatar": "https://example.com/avatar1.jpg"
      }
    }
  ]
}
```

---

## 🎨 Design Guidelines

### Color Palette

**Review States:**
- **APPROVED:** Green (`bg-green-100 text-green-800` / `dark:bg-green-900 dark:text-green-200`)
- **CHANGES_REQUESTED:** Red (`bg-red-100 text-red-800` / `dark:bg-red-900 dark:text-red-200`)
- **COMMENTED:** Gray (`bg-gray-100 text-gray-800` / `dark:bg-gray-700 dark:text-gray-200`)

**Merge Button:**
- **Allowed:** Purple (`bg-purple-600 hover:bg-purple-700`)
- **Blocked:** Gray (`bg-gray-400 cursor-not-allowed`)

### Typography

- **Card Title:** `text-xl font-bold`
- **Section Heading:** `font-semibold`
- **Body Text:** `text-sm` or default
- **Muted Text:** `text-gray-500 dark:text-gray-400`

### Spacing

- **Card Padding:** `p-6`
- **Section Gap:** `mb-6`
- **Element Gap:** `gap-2` or `gap-3`

---

## 🐛 Common Issues & Solutions

### Issue 1: Review Summary not updating after new review

**Solution:** Implement real-time refresh or add "Refresh" button. Call `fetchReviewSummary()` after successful review submission.

### Issue 2: Merge button state not updating

**Solution:** Add `reviewSummary` to `useEffect` dependencies for `fetchMergeStatus()`.

### Issue 3: Diff patch parsing errors

**Solution:** Use `react-diff-view` library instead of custom parsing. Handle empty patches gracefully.

### Issue 4: Tooltip not showing on disabled button

**Solution:** Wrap disabled button in a `<div>` or use `<TooltipTrigger asChild>` with Shadcn/ui.

---

## 📝 i18n (Internationalization)

Add to `apps/frontend/src/locales/zh.ts` and `en.ts`:

```typescript
// zh.ts
pullRequests: {
  reviewSummary: {
    title: 'Review 摘要',
    approved: '已批准',
    changesRequested: '需要修改',
    commented: '已评论',
    reviewers: '审查者',
    refresh: '刷新',
  },
  mergeStatus: {
    cannotMerge: '无法合并',
    mergeBlocked: '合并被阻止',
    needMoreApprovals: '需要 {count} 个批准',
    activeChangeRequests: '存在未解决的修改请求',
    cannotMergeOwnPR: '不能合并自己的 PR（项目策略）',
    ownerApprovalRequired: '需要项目所有者的批准',
  },
  settings: {
    prApprovalRules: 'Pull Request 审批规则',
    requireApprovals: '需要的批准数',
    requireApprovalsDesc: '合并前需要的最少批准数（0-10）',
    allowSelfMerge: '允许自行合并',
    allowSelfMergeDesc: '允许 PR 作者合并自己的 Pull Request',
    requireOwnerApproval: '需要所有者批准',
    requireOwnerApprovalDesc: '需要至少一个项目所有者的批准',
  },
}

// en.ts
pullRequests: {
  reviewSummary: {
    title: 'Review Summary',
    approved: 'Approved',
    changesRequested: 'Changes Requested',
    commented: 'Commented',
    reviewers: 'Reviewers',
    refresh: 'Refresh',
  },
  mergeStatus: {
    cannotMerge: 'Cannot Merge',
    mergeBlocked: 'Merge Blocked',
    needMoreApprovals: 'Need {count} more approval(s)',
    activeChangeRequests: 'Active change requests',
    cannotMergeOwnPR: 'Cannot merge your own PR (project policy)',
    ownerApprovalRequired: 'Project owner approval required',
  },
  settings: {
    prApprovalRules: 'Pull Request Approval Rules',
    requireApprovals: 'Required Approvals',
    requireApprovalsDesc: 'Minimum approvals required before merging (0-10)',
    allowSelfMerge: 'Allow Self-Merge',
    allowSelfMergeDesc: 'Allow PR authors to merge their own pull requests',
    requireOwnerApproval: 'Require Owner Approval',
    requireOwnerApprovalDesc: 'Require at least one approval from project owner',
  },
}
```

---

## 🚀 Next Steps

1. **Review this specification** and confirm scope
2. **Create GitHub Issue:** `[Frontend] PR Review Enhancement UI Implementation`
3. **Start implementation** following the plan above
4. **Submit PR** when Phase 1 (core features) is complete
5. **Optional:** Implement Phase 2 (enhanced features) in separate PR

---

## 📞 Support

**Backend API Documentation:** http://localhost:4000/api/docs
**Backend Commit:** 117eeac
**Related Documents:**
- `docs/PR_Review_Enhancement_Design.md`
- `docs/PR_Review_Implementation_Plan.md`

**Questions?** Refer to backend test cases in `apps/backend/src/pull-requests/pull-requests.service.spec.ts` for expected API behavior.

---

**Document Status:** ✅ Ready for Implementation
**Last Updated:** 2025-10-25
**Estimated Completion Time:** 2 hours (core + enhanced features)
