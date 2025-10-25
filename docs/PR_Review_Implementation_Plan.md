# PR Review Enhancement - Implementation Plan

**Status**: Ready to Implement
**Created**: 2025-10-25
**Estimated Duration**: 6-9 hours (1-2 days)
**Priority**: High

---

## 📊 Codebase Review Findings

### ✅ Already Implemented (80% Complete!)

1. **GitService.getDiff()** (Line 672-802)
   - Complete diff generation with tree walking
   - Supports added/modified/deleted status
   - Generates unified diff patches
   - Binary file detection
   ```typescript
   async getDiff(projectId, sourceBranch, targetBranch): Promise<{
     files: Array<{path, status, additions, deletions, patch}>,
     summary: {totalFiles, totalAdditions, totalDeletions}
   }>
   ```

2. **Review System** (pull-requests.service.ts)
   - ✅ `addReview(prId, reviewerId, dto)` - Line 540-584
   - ✅ `getReviews(prId)` - Line 643-659
   - ✅ Supports APPROVED/CHANGES_REQUESTED/COMMENTED states
   - ✅ Auto-creates review events

3. **Comment System**
   - ✅ `addComment(prId, authorId, dto)` - Line 589-617
   - ✅ `getComments(prId)` - Line 622-638
   - ✅ Supports line-level comments (filePath, lineNumber, commitHash)

4. **DTOs**
   - ✅ `CreateReviewDto` - ReviewState enum validation
   - ✅ `PullRequestCreateCommentDto` - filePath, lineNumber, commitHash optional fields

### ❌ Missing Components (20% - To Be Implemented)

1. **Project Approval Configuration**
   ```prisma
   model Project {
     // MISSING FIELDS:
     requireApprovals       Int     @default(1)
     allowSelfMerge         Boolean @default(true)
     requireReviewFromOwner Boolean @default(false)
   }
   ```

2. **PullRequestsService Methods**
   - ❌ `canMergePR(prId, userId)` - Validate 4 approval rules
   - ❌ `getReviewSummary(prId)` - Aggregate latest reviews per reviewer
   - ❌ `getDiff(prId)` - API wrapper calling GitService.getDiff()

3. **Controller Endpoints**
   - ❌ `GET /pull-requests/:prId/diff`
   - ❌ `GET /pull-requests/:prId/review-summary`
   - ❌ `GET /pull-requests/:prId/merge-status`

4. **DTOs**
   - ❌ `MergeStatusDto` - {allowed, reason?, approvalCount, requiredApprovals}
   - ❌ `ReviewSummaryDto` - {approved, changesRequested, commented, reviewers[]}
   - ❌ `DiffResponseDto` - {diff: FileDiff[], comments: PRComment[]}

---

## 🎯 Optimized Implementation Plan

### Day 1: Backend Core (4-6 hours)

#### Task 1: Schema Update (30 minutes)
**File**: `apps/backend/prisma/schema.prisma`

```prisma
model Project {
  // ... existing fields ...

  // PR Approval Settings
  requireApprovals       Int     @default(1)      // Minimum approval count
  allowSelfMerge         Boolean @default(true)   // Can author merge own PR?
  requireReviewFromOwner Boolean @default(false)  // Must owner approve?

  // ... rest of fields ...
}
```

**Migration**:
```bash
cd apps/backend
pnpm prisma migrate dev --name add_pr_approval_rules
```

#### Task 2: Create DTOs (30 minutes)
**Files**: `apps/backend/src/pull-requests/dto/`

1. **merge-status-response.dto.ts**
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class MergeStatusResponseDto {
  @ApiProperty({ description: 'Whether merge is allowed' })
  allowed: boolean;

  @ApiProperty({ description: 'Reason if not allowed', required: false })
  reason?: string;

  @ApiProperty({ description: 'Current approval count' })
  approvalCount: number;

  @ApiProperty({ description: 'Required approval count' })
  requiredApprovals: number;

  @ApiProperty({ description: 'Has blocking change requests' })
  hasChangeRequests: boolean;
}
```

2. **review-summary-response.dto.ts**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { ReviewState } from '@prisma/client';

class ReviewerSummary {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  avatar: string;

  @ApiProperty({ enum: ReviewState })
  state: ReviewState;

  @ApiProperty()
  createdAt: Date;
}

export class ReviewSummaryResponseDto {
  @ApiProperty({ description: 'Number of approvals' })
  approved: number;

  @ApiProperty({ description: 'Number of change requests' })
  changesRequested: number;

  @ApiProperty({ description: 'Number of comment-only reviews' })
  commented: number;

  @ApiProperty({ description: 'Total reviewers' })
  totalReviewers: number;

  @ApiProperty({ type: [ReviewerSummary] })
  reviewers: ReviewerSummary[];
}
```

3. **diff-response.dto.ts**
```typescript
import { ApiProperty } from '@nestjs/swagger';

class FileDiff {
  @ApiProperty()
  path: string;

  @ApiProperty({ enum: ['added', 'modified', 'deleted'] })
  status: 'added' | 'modified' | 'deleted';

  @ApiProperty()
  additions: number;

  @ApiProperty()
  deletions: number;

  @ApiProperty({ required: false })
  patch?: string;
}

class DiffSummary {
  @ApiProperty()
  totalFiles: number;

  @ApiProperty()
  totalAdditions: number;

  @ApiProperty()
  totalDeletions: number;
}

class PRCommentWithAuthor {
  @ApiProperty()
  id: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ required: false })
  filePath?: string;

  @ApiProperty({ required: false })
  lineNumber?: number;

  @ApiProperty({ required: false })
  commitHash?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  author: {
    id: string;
    username: string;
    avatar: string;
  };
}

export class DiffResponseDto {
  @ApiProperty({ type: [FileDiff] })
  files: FileDiff[];

  @ApiProperty()
  summary: DiffSummary;

  @ApiProperty({ type: [PRCommentWithAuthor] })
  comments: PRCommentWithAuthor[];
}
```

#### Task 3: Implement Service Methods (2 hours)
**File**: `apps/backend/src/pull-requests/pull-requests.service.ts`

Add after line 659 (after getReviews method):

```typescript
  /**
   * Get review summary with latest review state per reviewer
   * 获取Review摘要（每个reviewer的最新review状态）
   */
  async getReviewSummary(prId: string): Promise<ReviewSummaryResponseDto> {
    // Fetch all reviews ordered by createdAt desc
    const reviews = await this.prisma.pRReview.findMany({
      where: { pullRequestId: prId },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest review per reviewer using Map
    const latestReviewsMap = new Map<string, typeof reviews[0]>();
    for (const review of reviews) {
      if (!latestReviewsMap.has(review.reviewerId)) {
        latestReviewsMap.set(review.reviewerId, review);
      }
    }

    const latestReviews = Array.from(latestReviewsMap.values());

    // Aggregate by state
    const summary = {
      approved: latestReviews.filter(r => r.state === 'APPROVED').length,
      changesRequested: latestReviews.filter(r => r.state === 'CHANGES_REQUESTED').length,
      commented: latestReviews.filter(r => r.state === 'COMMENTED').length,
      totalReviewers: latestReviews.length,
      reviewers: latestReviews.map(r => ({
        id: r.reviewer.id,
        username: r.reviewer.username,
        avatar: r.reviewer.avatar,
        state: r.state,
        createdAt: r.createdAt,
      })),
    };

    return summary;
  }

  /**
   * Check if PR can be merged based on approval rules
   * 检查PR是否可以合并（基于approval规则）
   */
  async canMergePR(prId: string, userId: string): Promise<MergeStatusResponseDto> {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
      include: {
        project: {
          select: {
            id: true,
            requireApprovals: true,
            allowSelfMerge: true,
            requireReviewFromOwner: true,
            ownerId: true,
          },
        },
      },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${prId} not found`);
    }

    // Get review summary
    const reviewSummary = await this.getReviewSummary(prId);

    // Rule 1: No active "changes requested" reviews
    if (reviewSummary.changesRequested > 0) {
      return {
        allowed: false,
        reason: 'Cannot merge: active change requests',
        approvalCount: reviewSummary.approved,
        requiredApprovals: pr.project.requireApprovals,
        hasChangeRequests: true,
      };
    }

    // Rule 2: Minimum approval count
    if (reviewSummary.approved < pr.project.requireApprovals) {
      return {
        allowed: false,
        reason: `Need ${pr.project.requireApprovals - reviewSummary.approved} more approval(s)`,
        approvalCount: reviewSummary.approved,
        requiredApprovals: pr.project.requireApprovals,
        hasChangeRequests: false,
      };
    }

    // Rule 3: Self-merge policy
    if (!pr.project.allowSelfMerge && pr.authorId === userId) {
      return {
        allowed: false,
        reason: 'Cannot merge your own PR (project policy)',
        approvalCount: reviewSummary.approved,
        requiredApprovals: pr.project.requireApprovals,
        hasChangeRequests: false,
      };
    }

    // Rule 4: Owner approval requirement
    if (pr.project.requireReviewFromOwner) {
      const ownerReview = reviewSummary.reviewers.find(
        r => r.id === pr.project.ownerId && r.state === 'APPROVED'
      );
      if (!ownerReview) {
        return {
          allowed: false,
          reason: 'Project owner approval required',
          approvalCount: reviewSummary.approved,
          requiredApprovals: pr.project.requireApprovals,
          hasChangeRequests: false,
        };
      }
    }

    // All rules passed
    return {
      allowed: true,
      approvalCount: reviewSummary.approved,
      requiredApprovals: pr.project.requireApprovals,
      hasChangeRequests: false,
    };
  }

  /**
   * Get diff for PR with line-level comments
   * 获取PR的diff和行内评论
   */
  async getDiff(prId: string): Promise<DiffResponseDto> {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
      select: {
        projectId: true,
        sourceBranch: true,
        targetBranch: true,
      },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${prId} not found`);
    }

    // Get diff from GitService
    const diff = await this.gitService.getDiff(
      pr.projectId,
      pr.sourceBranch,
      pr.targetBranch,
    );

    // Get line-level comments
    const comments = await this.prisma.pRComment.findMany({
      where: {
        pullRequestId: prId,
        filePath: { not: null }, // Only line comments
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      files: diff.files,
      summary: diff.summary,
      comments,
    };
  }
```

#### Task 4: Add Controller Endpoints (1 hour)
**File**: `apps/backend/src/pull-requests/pull-requests.controller.ts`

Add new endpoints (find the appropriate location after existing endpoints):

```typescript
  @Get(':id/diff')
  @ApiOperation({ summary: 'Get PR diff with line comments' })
  @ApiResponse({ status: 200, type: DiffResponseDto })
  async getDiff(@Param('id') id: string) {
    return this.pullRequestsService.getDiff(id);
  }

  @Get(':id/review-summary')
  @ApiOperation({ summary: 'Get PR review summary' })
  @ApiResponse({ status: 200, type: ReviewSummaryResponseDto })
  async getReviewSummary(@Param('id') id: string) {
    return this.pullRequestsService.getReviewSummary(id);
  }

  @Get(':id/merge-status')
  @ApiOperation({ summary: 'Check if PR can be merged' })
  @ApiResponse({ status: 200, type: MergeStatusResponseDto })
  async getMergeStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.pullRequestsService.canMergePR(id, user.id);
  }
```

Don't forget to add DTO imports at the top:
```typescript
import { DiffResponseDto } from './dto/diff-response.dto';
import { ReviewSummaryResponseDto } from './dto/review-summary-response.dto';
import { MergeStatusResponseDto } from './dto/merge-status-response.dto';
```

### Day 2: Testing & Polish (2-3 hours)

#### Task 5: Unit Tests (1.5 hours)
**File**: `apps/backend/src/pull-requests/pull-requests.service.spec.ts`

Add test suite for `canMergePR()` validation:

```typescript
describe('canMergePR', () => {
  it('should block merge with active change requests', async () => {
    // Test Rule 1
    const result = await service.canMergePR(prId, userId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('change requests');
  });

  it('should block merge with insufficient approvals', async () => {
    // Test Rule 2
    const result = await service.canMergePR(prId, userId);
    expect(result.allowed).toBe(false);
    expect(result.approvalCount).toBeLessThan(result.requiredApprovals);
  });

  it('should block self-merge when disallowed', async () => {
    // Test Rule 3
    const result = await service.canMergePR(prId, authorId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('own PR');
  });

  it('should require owner approval when configured', async () => {
    // Test Rule 4
    const result = await service.canMergePR(prId, userId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('owner approval');
  });

  it('should allow merge when all rules pass', async () => {
    const result = await service.canMergePR(prId, userId);
    expect(result.allowed).toBe(true);
  });
});
```

#### Task 6: Integration Test (1 hour)
**File**: `apps/frontend/tests/pull-requests/pr-review-workflow.spec.ts`

Add E2E test for complete workflow:

```typescript
test('Complete PR review workflow', async ({ page }) => {
  // 1. Create PR
  // 2. Add review (APPROVED)
  // 3. Check merge status - should be allowed
  // 4. Add change request
  // 5. Check merge status - should be blocked
  // 6. Update review to APPROVED
  // 7. Merge PR successfully
});
```

#### Task 7: Swagger Documentation (30 minutes)

Run backend and verify Swagger UI at `http://localhost:4000/api/docs`:
- Check new endpoints appear in "pull-requests" section
- Verify DTO schemas are documented
- Test endpoints via Swagger UI

---

## 📝 Implementation Checklist

### Phase 1: Schema & Migration
- [ ] Update `schema.prisma` with PR approval fields
- [ ] Run `pnpm prisma migrate dev --name add_pr_approval_rules`
- [ ] Verify migration in PostgreSQL

### Phase 2: DTOs
- [ ] Create `merge-status-response.dto.ts`
- [ ] Create `review-summary-response.dto.ts`
- [ ] Create `diff-response.dto.ts`

### Phase 3: Service Methods
- [ ] Implement `getReviewSummary(prId)`
- [ ] Implement `canMergePR(prId, userId)` with 4 validation rules
- [ ] Implement `getDiff(prId)` API wrapper

### Phase 4: Controller Endpoints
- [ ] Add `GET /pull-requests/:id/diff`
- [ ] Add `GET /pull-requests/:id/review-summary`
- [ ] Add `GET /pull-requests/:id/merge-status`
- [ ] Add DTO imports

### Phase 5: Testing
- [ ] Write unit tests for `canMergePR()` (5 test cases)
- [ ] Write E2E test for review workflow
- [ ] Run `pnpm test` in apps/backend
- [ ] Run `pnpm test` in apps/frontend

### Phase 6: Documentation & Verification
- [ ] Verify Swagger docs at `/api/docs`
- [ ] Test all 3 endpoints via Swagger UI
- [ ] Update CHANGELOG.md

---

## 🎯 Success Criteria

1. ✅ All Prisma migrations applied successfully
2. ✅ Backend tests pass (≥70% coverage)
3. ✅ E2E tests pass (100% PR review workflow)
4. ✅ Swagger documentation complete
5. ✅ No TypeScript compilation errors
6. ✅ All ECP principles followed (SOLID, KISS, defensive programming)

---

## 📊 ECP Compliance

### Architecture & Design (A)
- **SOLID**: Service methods are single-responsibility (canMergePR, getReviewSummary, getDiff)
- **High Cohesion**: All approval logic centralized in PullRequestsService
- **YAGNI**: Only implementing Priority 1 features (no over-engineering)

### Implementation (B)
- **DRY**: Reusing GitService.getDiff() instead of duplicating logic
- **KISS**: Simple Map-based aggregation for latest reviews
- **Clear Naming**: canMergePR, getReviewSummary, getDiff

### Robustness & Security (C)
- **Defensive Programming**: Null checks for PR, project, reviews
- **Error Handling**: NotFoundException for missing resources
- **Validation**: class-validator decorators on all DTOs

### Maintainability (D)
- **Testability**: All methods return DTOs (easy to mock)
- **Comments**: Chinese + English bilingual comments
- **No Magic Numbers**: requireApprovals uses database configuration

---

## 📅 Timeline

- **Day 1 Morning (3 hours)**: Schema + DTOs + Service Methods
- **Day 1 Afternoon (3 hours)**: Controller + Manual Testing
- **Day 2 Morning (2 hours)**: Unit Tests + E2E Tests
- **Day 2 Afternoon (1 hour)**: Swagger Docs + Final Verification

**Total**: 6-9 hours (1-2 days)

---

## 🚀 Next Steps After Completion

Priority 2 features (future sprints):
- Review Request functionality
- Comment Threads (replies)
- Resolved/Unresolved tracking
- Frontend Diff Viewer UI (React component)
- Review Status Summary Widget

---

**Ready to begin implementation. Awaiting JIA总's approval to proceed.**
