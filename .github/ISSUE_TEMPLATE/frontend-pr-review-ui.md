---
name: Frontend PR Review Enhancement UI
about: Implement frontend UI components for PR review enhancement feature
title: '[Frontend] PR Review Enhancement UI Implementation'
labels: enhancement, frontend, priority-high
assignees: ''
---

## 📋 Overview

Implement frontend UI components for PR Review Enhancement feature based on the detailed specification document.

### Backend Status ✅

**Completed:** Backend API implementation (commit: 117eeac)

**Available APIs:**

- `GET /api/pull-requests/:id/review-summary` - Get aggregated review summary
- `GET /api/pull-requests/:id/merge-status` - Validate merge eligibility
- `GET /api/pull-requests/:id/diff` - Get diff with line-level comments

**API Documentation:** http://localhost:4000/api/docs

**Test Coverage:** 82.57% (37/37 tests passing)

---

## 🎯 Components to Implement

### Phase 1: Core Features (MUST) - 50 minutes

#### 1. Review Summary Card (30 min)

- **File:** `apps/frontend/src/components/pull-requests/review-summary-card.tsx` (NEW)
- **Location:** Integrate into PR detail page before existing reviews section
- **Features:**
  - Display aggregated counts (X Approved, Y Changes Requested, Z Commented)
  - List reviewers with their latest review state
  - Show avatar, username, state badge, timestamp
  - Refresh button to fetch latest data
  - Loading and error states
- **API:** `GET /api/pull-requests/:id/review-summary`

#### 2. Merge Button Validation (20 min)

- **File:** `apps/frontend/src/app/projects/[id]/pulls/[number]/page.tsx` (MODIFY)
- **Location:** Replace existing merge button (lines 279-284)
- **Features:**
  - Show approval progress (X/Y approvals)
  - Enable button when merge is allowed
  - Disable button when merge is blocked
  - Tooltip showing blocking reason
  - Visual distinction (green vs gray)
- **API:** `GET /api/pull-requests/:id/merge-status`

### Phase 2: Enhanced Features (OPTIONAL) - 70 minutes

#### 3. Diff Line Comments (40 min)

- **File:** `apps/frontend/src/components/pull-requests/diff-file-view.tsx` (NEW)
- **Location:** Replace diff section in PR detail page (lines 340-373)
- **Features:**
  - Display diff with syntax highlighting
  - Show comments on specific lines
  - Group comments by line number
  - File header with additions/deletions count
- **Dependencies:** Install `react-diff-view` + `diff` packages
- **API:** Already using `GET /api/pull-requests/:id/diff`

#### 4. Project Settings - PR Approval Policy (30 min)

- **File:** `apps/frontend/src/app/projects/[id]/settings/general/page.tsx` (MODIFY)
- **Features:**
  - Add "PR Approval Rules" card
  - Number input for `requireApprovals` (0-10)
  - Switch for `allowSelfMerge`
  - Switch for `requireReviewFromOwner`
  - Save button with validation
- **API:** `PATCH /api/projects/:id` (already exists)

---

## ✅ Acceptance Criteria

### Review Summary Card

- [ ] Card displays aggregated counts correctly
- [ ] Reviewers list shows latest state per reviewer (not all reviews)
- [ ] Loading state shown while fetching
- [ ] Error state shown if API fails
- [ ] Refresh button works
- [ ] Dark mode styling correct
- [ ] Responsive on mobile

### Merge Button Validation

- [ ] Button enabled when merge allowed
- [ ] Button disabled when merge blocked
- [ ] Approval progress shown (X/Y)
- [ ] Tooltip shows blocking reason
- [ ] Button updates when reviews change
- [ ] All 4 blocking scenarios tested:
  - [ ] Active change requests
  - [ ] Insufficient approvals
  - [ ] Self-merge disallowed
  - [ ] Owner approval missing

### Diff Line Comments (Optional)

- [ ] Diff displays correctly
- [ ] Comments appear on correct lines
- [ ] Multiple comments per line supported
- [ ] File headers show stats
- [ ] Performance acceptable with large diffs

### Project Settings (Optional)

- [ ] Form loads current settings
- [ ] All 3 fields editable
- [ ] Save button persists to database
- [ ] Input validation (0-10 for approvals)
- [ ] Success/error feedback shown

---

## 📦 Resources

### Documentation

- **📄 Complete Specification:** `docs/PR_Review_UI_Specification.md` (84 KB)
  - Component designs with code examples
  - TypeScript type definitions
  - API integration guides
  - Testing strategy
  - Design guidelines

- **🎨 Design Mockups:** See specification document Section "Component Specifications"

- **📚 Backend Tests:** `apps/backend/src/pull-requests/pull-requests.service.spec.ts` (lines 753-1077)
  - Shows expected API response formats

### API Endpoints

**Swagger Documentation:** http://localhost:4000/api/docs

**Endpoint Details:**

```typescript
// Review Summary
GET /api/pull-requests/:id/review-summary
Response: ReviewSummaryResponseDto {
  approved: number
  changesRequested: number
  commented: number
  totalReviewers: number
  reviewers: ReviewerSummary[]
}

// Merge Status
GET /api/pull-requests/:id/merge-status
Response: MergeStatusResponseDto {
  allowed: boolean
  reason?: string
  approvalCount: number
  requiredApprovals: number
  hasChangeRequests: boolean
}

// Diff with Comments (already exists)
GET /api/pull-requests/:id/diff
Response: DiffResponseDto {
  files: FileDiff[]
  summary: DiffSummary
  comments: PRCommentWithAuthor[]
}
```

### TypeScript Types

Add to `apps/frontend/src/types/pull-request.ts`:

```typescript
export interface ReviewSummary {
  approved: number
  changesRequested: number
  commented: number
  totalReviewers: number
  reviewers: ReviewerSummary[]
}

export interface ReviewerSummary {
  id: string
  username: string
  avatar: string | null
  state: ReviewState
  createdAt: Date
}

export interface MergeStatus {
  allowed: boolean
  reason?: string
  approvalCount: number
  requiredApprovals: number
  hasChangeRequests: boolean
}
```

---

## ⏱️ Time Estimate

**Phase 1 (Core):** 50 minutes

- Review Summary Card: 30 min
- Merge Button Validation: 20 min

**Phase 2 (Enhanced):** 70 minutes

- Diff Line Comments: 40 min
- Project Settings: 30 min

**Total:** 2 hours for full implementation

---

## 🧪 Testing Requirements

### Manual Testing Checklist

**Review Summary:**

- [ ] Create PR with 0 reviews → All counts show 0
- [ ] Add 1 APPROVED review → Shows 1 approved
- [ ] Same reviewer adds CHANGES_REQUESTED → Count updates (not increments)
- [ ] Multiple reviewers with different states → Counts correct

**Merge Button:**

- [ ] 0 approvals (require 1) → Disabled, tooltip "Need 1 more approval"
- [ ] 1 change request → Disabled, tooltip "active change requests"
- [ ] Author merges own PR (allowSelfMerge=false) → Disabled
- [ ] All requirements met → Enabled, green

**Diff Comments (Optional):**

- [ ] Multiple files display correctly
- [ ] Line comments appear on correct lines
- [ ] Empty diff handled

**Settings (Optional):**

- [ ] Settings load correctly
- [ ] Save persists to database
- [ ] Changes reflect in merge validation

### E2E Tests (Optional)

Create `apps/frontend/tests/pull-requests/pr-review-enhancement.spec.ts`:

```typescript
test('should display review summary', async ({ page }) => {
  // Navigate to PR detail
  // Assert review summary visible
  // Assert counts match data
})

test('should validate merge button state', async ({ page }) => {
  // Navigate to PR with insufficient approvals
  // Assert button disabled
  // Hover button, assert tooltip shows reason
})
```

---

## 📝 i18n Translations

Add to `apps/frontend/src/locales/zh.ts` and `en.ts`:

```typescript
pullRequests: {
  reviewSummary: {
    title: 'Review Summary' / 'Review 摘要',
    approved: 'Approved' / '已批准',
    changesRequested: 'Changes Requested' / '需要修改',
    commented: 'Commented' / '已评论',
    reviewers: 'Reviewers' / '审查者',
    refresh: 'Refresh' / '刷新',
  },
  mergeStatus: {
    cannotMerge: 'Cannot Merge' / '无法合并',
    mergeBlocked: 'Merge Blocked' / '合并被阻止',
    // ... see specification for complete list
  },
}
```

---

## 🎯 Implementation Steps

### Step 1: Setup (5 min)

```bash
# Checkout new branch
git checkout -b feat/pr-review-ui

# Verify backend is running
curl http://localhost:4000/api/docs
```

### Step 2: Add Type Definitions (5 min)

- [ ] Edit `apps/frontend/src/types/pull-request.ts`
- [ ] Add `ReviewSummary`, `ReviewerSummary`, `MergeStatus` interfaces
- [ ] Verify TypeScript compilation: `pnpm build`

### Step 3: Implement Review Summary Card (30 min)

- [ ] Create `src/components/pull-requests/review-summary-card.tsx`
- [ ] Implement component with API integration
- [ ] Add loading/error states
- [ ] Integrate into PR detail page
- [ ] Test with real data

### Step 4: Implement Merge Button Validation (20 min)

- [ ] Modify PR detail page
- [ ] Add `fetchMergeStatus()` function
- [ ] Replace merge button with validated version
- [ ] Add tooltip for blocked state
- [ ] Test all blocking scenarios

### Step 5: (Optional) Implement Enhanced Features (70 min)

- [ ] Diff Line Comments component
- [ ] Project Settings PR tab

### Step 6: Testing & Polish (20 min)

- [ ] Manual testing of all features
- [ ] Dark mode verification
- [ ] Mobile responsiveness check
- [ ] Add i18n translations

### Step 7: Commit & PR (10 min)

```bash
git add .
git commit -m "feat(pr-ui): implement PR review enhancement UI

- Add Review Summary Card with aggregated counts
- Add Merge Button Validation with tooltip
- Integrate canMergePR and getReviewSummary APIs
- Add TypeScript type definitions
- Full i18n support (zh/en)

Closes #<issue-number>"

git push origin feat/pr-review-ui
gh pr create --title "feat(pr-ui): PR Review Enhancement UI" --body "..."
```

---

## 🚦 Definition of Done

- [ ] All Phase 1 components implemented and working
- [ ] TypeScript compilation passes
- [ ] No console errors or warnings
- [ ] Dark mode styling verified
- [ ] Mobile responsiveness checked
- [ ] i18n translations added (zh + en)
- [ ] Manual testing checklist completed
- [ ] Code committed and PR created
- [ ] Screenshots added to PR description

---

## 🔗 Related

- **Backend PR:** #<PR-number> (commit 117eeac)
- **Backend API Docs:** http://localhost:4000/api/docs
- **Specification:** `docs/PR_Review_UI_Specification.md`
- **Design Docs:** `docs/PR_Review_Enhancement_Design.md`

---

## 📸 Screenshots (to be added after implementation)

### Review Summary Card

![Review Summary](url-to-screenshot)

### Merge Button Validation

![Merge Allowed](url-to-screenshot)
![Merge Blocked](url-to-screenshot)

---

## 💡 Tips

- Use `react-diff-view` for Diff Line Comments (Phase 2)
- Leverage existing Shadcn/ui components (Tooltip, Switch, etc.)
- Follow existing code patterns in `apps/frontend/src/app/projects/[id]/pulls/[number]/page.tsx`
- Test with different approval scenarios for comprehensive validation

---

**Ready to implement?** 🚀

Refer to `docs/PR_Review_UI_Specification.md` for complete implementation details including code examples, API integration guides, and design guidelines.
