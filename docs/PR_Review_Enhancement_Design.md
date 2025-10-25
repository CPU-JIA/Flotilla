# PR Review System Enhancement - Technical Design Document

**Status**: Draft
**Created**: 2025-10-25
**Author**: AI Engineering Partner
**Sprint**: Phase 1 Enhancement - PR Review System

---

## Executive Summary

This document outlines the technical design for enhancing Flotilla's Pull Request Review system. The enhancements focus on improving code review collaboration through line-level comments UI, approval workflows, and review status visibility.

**Current State**: Backend foundation ✅ (Review CRUD, Line-level comment data model)
**Target State**: Full GitHub/GitLab-comparable review experience with UI and approval rules

---

## 1. Current System Analysis

### 1.1 Existing Implementation ✅

**Database Schema** (`schema.prisma`):
```prisma
model PRReview {
  id            String      @id @default(cuid())
  pullRequestId String
  reviewerId    String
  state         ReviewState  // APPROVED | CHANGES_REQUESTED | COMMENTED
  body          String?     @db.Text
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model PRComment {
  id            String  @id @default(cuid())
  pullRequestId String
  authorId      String
  body          String  @db.Text
  filePath      String? @db.VarChar(500)  // Line-level support
  lineNumber    Int?                       // Line-level support
  commitHash    String? @db.VarChar(64)    // Version locking
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Backend API** (`pull-requests.service.ts`):
- ✅ `addReview(prId, reviewerId, dto)` - Create review with state
- ✅ `getReviews(prId)` - Fetch all reviews for PR
- ✅ `addComment(prId, authorId, dto)` - Add comment (supports line-level via optional fields)
- ✅ Event tracking via `PREvent` model

**DTOs**:
- ✅ `CreateReviewDto`: `state: ReviewState`, `body?: string`
- ✅ `PullRequestCreateCommentDto`: `body`, `filePath?`, `lineNumber?`, `commitHash?`

### 1.2 Gap Analysis ❌

**Missing Features**:
1. **Frontend Diff Viewer UI**: No interactive comment UI on diffs
2. **PR Approval Logic**: No "require N approvals to merge" enforcement
3. **Review Summary Display**: No aggregated review status on PR page
4. **Review Request**: No @mention or assign reviewer feature
5. **Comment Threads**: No reply/conversation support
6. **Resolved Tracking**: Line comments cannot be marked as resolved

---

## 2. Enhancement Priorities

### Priority 1: MVP Experience (This Sprint)
Focus: Core review workflow that enables effective code review

| Feature | Backend | Frontend | Complexity | Value |
|---------|---------|----------|------------|-------|
| **1. Diff Viewer with Line Comments** | Minor API updates | New diff component | High | Critical |
| **2. PR Approval Rules** | New validation logic | Merge button state | Medium | High |
| **3. Review Status Summary** | Aggregation query | Status badge UI | Low | High |

### Priority 2: Enhanced Collaboration (Next Sprint)
- Review Request (assign reviewers)
- Comment Threads (reply functionality)
- Resolved status tracking

### Priority 3: Advanced Features (Future)
- Code suggestions (GitHub-style)
- Batch review mode
- Draft reviews

---

## 3. Technical Design - Priority 1 Features

### 3.1 Feature: Diff Viewer with Line-level Comments

**Objective**: Allow reviewers to click on any line in a diff and add inline comments.

#### 3.1.1 Backend Changes (Minor)

**New API Endpoint**:
```typescript
// GET /api/pull-requests/:prId/diff
async getDiff(prId: string) {
  const pr = await this.prisma.pullRequest.findUnique({
    where: { id: prId },
    select: { sourceBranch, targetBranch, projectId }
  });

  const diff = await this.gitService.getDiff(
    pr.projectId,
    pr.targetBranch,
    pr.sourceBranch
  );

  // Fetch existing line comments
  const comments = await this.prisma.pRComment.findMany({
    where: {
      pullRequestId: prId,
      filePath: { not: null }  // Only line-level comments
    },
    include: {
      author: { select: { id, username, avatar } }
    }
  });

  return { diff, comments };
}
```

**gitService.getDiff() Enhancement**:
```typescript
// apps/backend/src/git/git.service.ts
async getDiff(projectId: string, baseBranch: string, headBranch: string) {
  const dir = this.getRepoPath(projectId);

  // Get commit SHAs
  const baseOid = await git.resolveRef({/*...*/});
  const headOid = await git.resolveRef({/*...*/});

  // Use isomorphic-git walk to generate diff
  const diffs = await git.walk({
    fs, dir, gitdir: dir,
    trees: [
      git.TREE({ ref: baseOid }),
      git.TREE({ ref: headOid })
    ],
    map: async (filepath, [baseEntry, headEntry]) => {
      // Generate line-by-line diff for each file
      return {
        path: filepath,
        oldContent: baseEntry ? await baseEntry.blob() : null,
        newContent: headEntry ? await headEntry.blob() : null,
        hunks: /* diff algorithm */
      };
    }
  });

  return diffs;
}
```

#### 3.1.2 Frontend Implementation

**New Component**: `DiffViewer.tsx`
```typescript
// apps/frontend/src/components/pull-requests/DiffViewer.tsx
interface DiffViewerProps {
  prId: string;
  diff: FileDiff[];
  comments: PRComment[];
  onAddComment: (filePath: string, lineNumber: number, body: string) => void;
}

export function DiffViewer({ prId, diff, comments, onAddComment }: DiffViewerProps) {
  const [activeCommentLine, setActiveCommentLine] = useState<{file: string, line: number} | null>(null);

  return (
    <div className="diff-viewer">
      {diff.map(file => (
        <FileD

iff key={file.path} file={file}>
          {file.hunks.map(hunk => (
            <Hunk key={hunk.header}>
              {hunk.lines.map((line, idx) => (
                <DiffLine
                  line={line}
                  lineNumber={idx}
                  comments={comments.filter(c => c.filePath === file.path && c.lineNumber === idx)}
                  onAddComment={() => setActiveCommentLine({file: file.path, line: idx})}
                />
              ))}
            </Hunk>
          ))}
        </FileDiff>
      ))}

      {activeCommentLine && (
        <CommentDialog
          onSubmit={(body) => {
            onAddComment(activeCommentLine.file, activeCommentLine.line, body);
            setActiveCommentLine(null);
          }}
          onClose={() => setActiveCommentLine(null)}
        />
      )}
    </div>
  );
}
```

**UI Library**: Use `react-diff-view` (npm package) for professional diff rendering:
```bash
pnpm add react-diff-view
```

---

### 3.2 Feature: PR Approval Rules

**Objective**: Enforce "require N approvals before merge" policy.

#### 3.2.1 Database Schema Addition

```prisma
// Add to Project model in schema.prisma
model Project {
  // ... existing fields

  // PR Settings
  requireApprovals    Int     @default(1)  // Minimum approvals needed
  allowSelfMerge      Boolean @default(true)
  requireReviewFromOwner Boolean @default(false)
}
```

**Migration**:
```bash
cd apps/backend
pnpm prisma migrate dev --name add_pr_approval_rules
```

#### 3.2.2 Backend Validation Logic

```typescript
// apps/backend/src/pull-requests/pull-requests.service.ts

async canMergePR(prId: string, userId: string): Promise<{allowed: boolean, reason?: string}> {
  const pr = await this.prisma.pullRequest.findUnique({
    where: { id: prId },
    include: {
      project: { select: { requireApprovals, allowSelfMerge, requireReviewFromOwner, ownerId } },
      reviews: { include: { reviewer: true } },
      author: true
    }
  });

  if (pr.state !== PRState.OPEN) {
    return { allowed: false, reason: 'PR is not open' };
  }

  // Count approvals
  const approvals = pr.reviews.filter(r => r.state === ReviewState.APPROVED);
  const changesRequested = pr.reviews.filter(r => r.state === ReviewState.CHANGES_REQUESTED);

  // Rule 1: No active "changes requested"
  if (changesRequested.length > 0) {
    return {
      allowed: false,
      reason: `${changesRequested.length} reviewer(s) requested changes`
    };
  }

  // Rule 2: Minimum approval count
  if (approvals.length < pr.project.requireApprovals) {
    return {
      allowed: false,
      reason: `Requires ${pr.project.requireApprovals} approval(s), got ${approvals.length}`
    };
  }

  // Rule 3: Self-merge policy
  if (!pr.project.allowSelfMerge && pr.authorId === userId) {
    return { allowed: false, reason: 'Self-merge not allowed' };
  }

  // Rule 4: Owner approval requirement
  if (pr.project.requireReviewFromOwner) {
    const ownerApproved = approvals.some(a => a.reviewer.id === pr.project.ownerId);
    if (!ownerApproved) {
      return { allowed: false, reason: 'Requires project owner approval' };
    }
  }

  return { allowed: true };
}

// Update merge endpoint to check rules
async merge(prId: string, userId: string, dto: MergePullRequestDto) {
  const canMerge = await this.canMergePR(prId, userId);

  if (!canMerge.allowed) {
    throw new ForbiddenException(canMerge.reason);
  }

  // ... existing merge logic
}
```

#### 3.2.3 Frontend Integration

```typescript
// apps/frontend/src/app/projects/[id]/pulls/[number]/page.tsx

const { data: mergeStatus } = useQuery({
  queryKey: ['pr-merge-status', prId],
  queryFn: () => api.get(`/pull-requests/${prId}/merge-status`)
});

// Merge button state
<Button
  disabled={!mergeStatus?.allowed}
  onClick={handleMerge}
  title={mergeStatus?.reason}
>
  {mergeStatus?.allowed ? 'Merge Pull Request' : `Cannot Merge: ${mergeStatus?.reason}`}
</Button>
```

---

### 3.3 Feature: Review Status Summary

**Objective**: Display aggregated review status at top of PR page.

#### 3.3.1 Backend Aggregation

```typescript
// apps/backend/src/pull-requests/pull-requests.service.ts

async getReviewSummary(prId: string) {
  const reviews = await this.prisma.pRReview.findMany({
    where: { pullRequestId: prId },
    include: {
      reviewer: { select: { id, username, avatar } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get latest review per reviewer
  const latestReviews = new Map();
  reviews.forEach(review => {
    if (!latestReviews.has(review.reviewerId)) {
      latestReviews.set(review.reviewerId, review);
    }
  });

  const summary = {
    approved: 0,
    changesRequested: 0,
    commented: 0,
    reviewers: Array.from(latestReviews.values())
  };

  latestReviews.forEach(review => {
    switch (review.state) {
      case ReviewState.APPROVED:
        summary.approved++;
        break;
      case ReviewState.CHANGES_REQUESTED:
        summary.changesRequested++;
        break;
      case ReviewState.COMMENTED:
        summary.commented++;
        break;
    }
  });

  return summary;
}
```

#### 3.3.2 Frontend UI Component

```typescript
// apps/frontend/src/components/pull-requests/ReviewSummary.tsx

interface ReviewSummaryProps {
  summary: {
    approved: number;
    changesRequested: number;
    commented: number;
    reviewers: Array<{reviewer: User, state: ReviewState}>;
  };
}

export function ReviewSummary({ summary }: ReviewSummaryProps) {
  return (
    <div className="review-summary border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-4 mb-3">
        <Badge variant={summary.changesRequested > 0 ? 'destructive' : summary.approved > 0 ? 'success' : 'default'}>
          {summary.changesRequested > 0 ? 'Changes Requested' :
           summary.approved > 0 ? `${summary.approved} Approved` : 'Awaiting Review'}
        </Badge>

        <span className="text-sm text-muted-foreground">
          {summary.reviewers.length} reviewer(s)
        </span>
      </div>

      <div className="space-y-2">
        {summary.reviewers.map(({ reviewer, state }) => (
          <div key={reviewer.id} className="flex items-center gap-2">
            <Avatar user={reviewer} size="sm" />
            <span className="text-sm">{reviewer.username}</span>
            <ReviewStateBadge state={state} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. Implementation Plan

### Phase 1: Backend Foundation (Day 1-2)
- [ ] Add `requireApprovals` field to Project model
- [ ] Implement `canMergePR()` validation logic
- [ ] Create `getDiff()` method in GitService
- [ ] Add `/pull-requests/:prId/diff` endpoint
- [ ] Add `/pull-requests/:prId/review-summary` endpoint
- [ ] Add `/pull-requests/:prId/merge-status` endpoint
- [ ] Write unit tests for approval rules
- [ ] Prisma migration

### Phase 2: Frontend Diff Viewer (Day 3-4)
- [ ] Install `react-diff-view` package
- [ ] Create `DiffViewer` component
- [ ] Create `DiffLine` component with comment trigger
- [ ] Create `CommentDialog` component
- [ ] Integrate with PR detail page
- [ ] Add line-level comment display
- [ ] Add line-level comment creation

### Phase 3: Frontend Review UI (Day 5)
- [ ] Create `ReviewSummary` component
- [ ] Update PR detail page with review summary
- [ ] Update merge button with approval status
- [ ] Add approval state badges
- [ ] Create review submission form

### Phase 4: Testing & Polish (Day 6-7)
- [ ] E2E tests for line-level comments
- [ ] E2E tests for approval workflow
- [ ] E2E tests for merge blocking
- [ ] UI polish and responsive design
- [ ] API documentation update
- [ ] User guide documentation

---

## 5. Testing Strategy

### 5.1 Backend Unit Tests

```typescript
// apps/backend/src/pull-requests/pull-requests.service.spec.ts

describe('PullRequestsService - Approval Rules', () => {
  it('should block merge when approvals < required', async () => {
    // Setup: PR with requireApprovals=2, current approvals=1
    const result = await service.canMergePR(prId, userId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Requires 2 approval(s)');
  });

  it('should block merge when changes requested', async () => {
    // Setup: PR with 1 approval + 1 changes_requested
    const result = await service.canMergePR(prId, userId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('requested changes');
  });

  it('should allow merge when all rules satisfied', async () => {
    // Setup: PR with sufficient approvals, no changes requested
    const result = await service.canMergePR(prId, userId);
    expect(result.allowed).toBe(true);
  });
});
```

### 5.2 E2E Tests (Playwright)

```typescript
// apps/frontend/tests/pull-requests/pr-review-workflow.spec.ts

test.describe('PR Review Workflow', () => {
  test('should add line-level comment on diff', async ({ page }) => {
    await page.goto(`/projects/${projectId}/pulls/${prNumber}`);
    await page.click('[data-testid="diff-tab"]');

    // Click on line 42 in diff
    await page.click('[data-line-number="42"] .add-comment-icon');

    // Fill comment
    await page.fill('[data-testid="comment-textarea"]', 'This logic could be simplified');
    await page.click('[data-testid="submit-comment"]');

    // Verify comment appears
    await expect(page.locator('[data-line-number="42"] .line-comment')).toBeVisible();
  });

  test('should block merge without sufficient approvals', async ({ page, request }) => {
    // Setup: Project requires 2 approvals
    await request.patch(`/api/projects/${projectId}`, { requireApprovals: 2 });

    // PR has only 1 approval
    await page.goto(`/projects/${projectId}/pulls/${prNumber}`);

    // Merge button should be disabled
    const mergeButton = page.getByRole('button', { name: /merge/i });
    await expect(mergeButton).toBeDisabled();
    await expect(mergeButton).toHaveAttribute('title', /Requires 2 approval/);
  });

  test('should allow merge after sufficient approvals', async ({ page, request }) => {
    // Add 2 approvals
    await request.post(`/api/pull-requests/${prId}/reviews`, {
      data: { state: 'APPROVED', body: 'LGTM!' }
    });

    await page.reload();

    // Merge button should be enabled
    const mergeButton = page.getByRole('button', { name: /merge/i });
    await expect(mergeButton).toBeEnabled();
  });
});
```

---

## 6. ECP Compliance

### ECP-A1: SOLID Principles
- **Single Responsibility**: Each service method has one clear purpose (`canMergePR`, `getDiff`, `getReviewSummary`)
- **Open/Closed**: Approval rules extensible through Project settings without modifying core logic
- **Interface Segregation**: DTOs provide clear contracts for each operation

### ECP-B2: KISS (Keep It Simple)
- Approval rules use simple count-based logic (no complex state machines)
- Diff rendering delegates to proven library (`react-diff-view`)
- Review summary uses straightforward aggregation queries

### ECP-C1: Defensive Programming
- All user inputs validated via class-validator decorators
- Database queries use Prisma's type-safe API
- Merge operations check multiple validation rules before proceeding

### ECP-C2: Systematic Error Handling
- `canMergePR()` returns descriptive error reasons
- Frontend displays user-friendly error messages
- Failed merges tracked in PR events

### ECP-D1: Design for Testability
- Approval logic isolated in `canMergePR()` for unit testing
- Diff viewer components accept data via props (easy to mock)
- E2E tests cover complete review workflow

---

## 7. Security Considerations

### Authorization
- Review submission: Requires project READ permission
- PR merge: Requires project WRITE permission
- Approval rules enforcement: Server-side validation (never trust frontend)

### Input Validation
```typescript
// All line-level comment fields validated
export class PullRequestCreateCommentDto {
  @IsString() @MaxLength(10000) body: string;
  @IsString() @MaxLength(500) @IsOptional() filePath?: string;
  @IsInt() @Min(1) @Max(100000) @IsOptional() lineNumber?: number;
  @IsString() @Length(7, 64) @IsOptional() commitHash?: string;
}
```

### XSS Protection
- All markdown content sanitized via `remark-gfm` + `rehype-sanitize`
- Line-level comments escaped before rendering in diff viewer

---

## 8. Performance Optimization

### Backend
- Review summary cached for 30 seconds (Redis)
- Diff generation uses streaming for large files
- Line comments indexed by `[pullRequestId, filePath]`

### Frontend
- Diff viewer uses virtualization for >1000 lines
- Review data prefetched when PR page loads
- Optimistic UI updates for comment submission

---

## 9. Rollout Plan

### Stage 1: Internal Alpha (Day 7)
- Enable for test project only
- Team dogfooding

### Stage 2: Beta (Week 2)
- Enable for all projects
- Collect user feedback
- Monitor performance metrics

### Stage 3: GA (Week 3)
- Full rollout
- Update user documentation
- Announcement

---

## 10. Success Metrics

### Functional Goals
- ✅ 100% E2E test coverage for review workflow
- ✅ Line-level comments work on all diff types (added/deleted/modified lines)
- ✅ Approval rules correctly block unauthorized merges

### Performance Goals
- Diff loading: < 2s for files up to 1000 lines
- Comment submission: < 500ms round-trip
- Review summary calculation: < 100ms

### User Experience Goals
- Diff viewer renders correctly in both light/dark themes
- Mobile-responsive diff viewer (horizontal scroll for long lines)
- Accessibility: Keyboard navigation for adding comments

---

## 11. Future Enhancements (Post-MVP)

### Priority 2 Features
- **Review Request**: @mention reviewers, send notifications
- **Comment Threads**: Reply to line comments, conversation view
- **Resolved Status**: Mark line comments as resolved

### Priority 3 Features
- **Code Suggestions**: GitHub-style suggestion blocks
- **Batch Review**: Review multiple files, submit all at once
- **Draft Reviews**: Save review in draft state before submitting
- **Review Templates**: Predefined review comment templates

---

## 12. References

### Design Inspiration
- GitHub Pull Request Review: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests
- GitLab Merge Request Review: https://docs.gitlab.com/ee/user/project/merge_requests/reviews/

### Technical Documentation
- NestJS Best Practices: https://docs.nestjs.com/
- React Diff View: https://github.com/otakustay/react-diff-view
- Prisma Relations: https://www.prisma.io/docs/concepts/components/prisma-schema/relations
- Playwright Testing: https://playwright.dev/docs/intro

### Internal Documents
- `/docs/分布式共识算法设计方案.md` - Raft implementation
- `/docs/组织与团队权限架构设计.md` - Permission system
- `/docs/ROADMAP_2025.md` - Product roadmap
- `/apps/frontend/DESIGN_SYSTEM.md` - UI design system

---

**Document Status**: Ready for Implementation
**Next Step**: Begin Phase 1 - Backend Foundation
**Estimated Completion**: 7 days (1 sprint)
