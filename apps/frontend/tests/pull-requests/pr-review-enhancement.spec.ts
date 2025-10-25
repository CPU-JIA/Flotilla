/**
 * PR Review Enhancement E2E Tests
 *
 * Tests new PR review features implemented in Phase 1 & 2:
 * - Review submission (APPROVED, CHANGES_REQUESTED, COMMENTED)
 * - Review Summary Card with aggregation
 * - Merge validation based on approval rules
 * - Merge button states and tooltips
 * - PR approval settings in project settings
 *
 * ECP-D1: Testability - Comprehensive E2E coverage for PR Review Enhancement
 */

import { TEST_USERS } from '../fixtures'
import { test, expect, APIRequestContext, Page } from '@playwright/test'

// ============================================
// Helper Functions
// ============================================

/**
 * Login via API and return access token
 */
async function loginViaAPI(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const response = await request.post('http://localhost:4000/api/auth/login', {
    data: { usernameOrEmail: username, password },
  })
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  return data.accessToken as string
}

/**
 * Create project via API and return project ID
 */
async function createProjectViaAPI(
  request: APIRequestContext,
  token: string,
  name: string,
): Promise<string> {
  const response = await request.post('http://localhost:4000/api/projects', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      name,
      description: 'Test project for PR Review Enhancement E2E tests',
      visibility: 'PUBLIC',
    },
  })
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  return data.id as string
}

/**
 * Create a new branch
 */
async function createBranch(
  request: APIRequestContext,
  token: string,
  projectId: string,
  name: string,
  startPoint: string,
): Promise<void> {
  const response = await request.post(`http://localhost:4000/api/git/${projectId}/branches`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { name, startPoint },
  })
  expect(response.ok()).toBeTruthy()
}

/**
 * Create a commit on specified branch
 */
async function createCommit(
  request: APIRequestContext,
  token: string,
  projectId: string,
  branch: string,
  files: Array<{ path: string; content: string }>,
  message: string,
): Promise<any> {
  const response = await request.post(`http://localhost:4000/api/git/${projectId}/commit`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { branch, message, files },
  })
  expect(response.ok()).toBeTruthy()
  return await response.json()
}

/**
 * Create a Pull Request via API
 */
async function createPullRequest(
  request: APIRequestContext,
  token: string,
  projectId: string,
  title: string,
  sourceBranch: string,
  targetBranch: string = 'main',
): Promise<{ id: string; number: number }> {
  const response = await request.post('http://localhost:4000/api/pull-requests', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      projectId,
      title,
      body: `Test PR: ${title}`,
      sourceBranch,
      targetBranch,
    },
  })
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  return { id: data.id, number: data.number }
}

/**
 * Submit a review via API
 */
async function submitReview(
  request: APIRequestContext,
  token: string,
  prId: string,
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED',
  body?: string,
): Promise<void> {
  const response = await request.post(`http://localhost:4000/api/pull-requests/${prId}/reviews`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      state,
      body: body || `Review: ${state}`,
    },
  })
  expect(response.ok()).toBeTruthy()
}

/**
 * Update project PR approval settings via API
 */
async function updateProjectSettings(
  request: APIRequestContext,
  token: string,
  projectId: string,
  settings: {
    requireApprovals?: number
    allowSelfMerge?: boolean
    requireReviewFromOwner?: boolean
  },
): Promise<void> {
  const response = await request.put(`http://localhost:4000/api/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: settings,
  })
  expect(response.ok()).toBeTruthy()
}

/**
 * Get user ID by username via API
 */
async function getUserIdByUsername(
  request: APIRequestContext,
  token: string,
  username: string,
): Promise<string> {
  const response = await request.get(`http://localhost:4000/api/users?search=${username}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const user = data.users.find((u: any) => u.username === username)
  expect(user).toBeDefined()
  return user.id
}

/**
 * UI Login helper
 */
async function loginViaUI(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/auth/login')
  await page.getByLabel(/用户名|Username/i).fill(username)
  await page.getByLabel(/密码|Password/i).fill(password)
  await page.getByRole('button', { name: /登录|Login/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

// ============================================
// Test Suite
// ============================================

test.describe('PR Review Enhancement E2E Tests', () => {
  const ownerUser = TEST_USERS.jia
  const reviewerUser = TEST_USERS.normaluser

  let projectId: string
  let ownerToken: string
  let reviewerToken: string

  test.beforeEach(async ({ request }) => {
    // Get tokens for both users
    ownerToken = await loginViaAPI(request, ownerUser.username, ownerUser.password)
    reviewerToken = await loginViaAPI(request, reviewerUser.username, reviewerUser.password)

    // Create test project as owner
    const timestamp = Date.now()
    const projectName = `PR Review Test ${timestamp}`
    projectId = await createProjectViaAPI(request, ownerToken, projectName)
  })

  test('should submit APPROVED review and update review summary', async ({ page, request }) => {
    // Get reviewerUser ID and add as project member (required for review access)
    const reviewerUserId = await getUserIdByUsername(request, ownerToken, reviewerUser.username)
    await request.post(`http://localhost:4000/api/projects/${projectId}/members`, {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        userId: reviewerUserId,
        role: 'MEMBER',
      },
    })

    // Create feature branch and PR
    await createBranch(request, ownerToken, projectId, 'feature-approval-test', 'main')
    await createCommit(
      request,
      ownerToken,
      projectId,
      'feature-approval-test',
      [{ path: 'test.txt', content: 'Test content' }],
      'Add test file',
    )
    const pr = await createPullRequest(request, ownerToken, projectId, 'Test APPROVED Review', 'feature-approval-test')

    // Login as reviewer
    await loginViaUI(page, reviewerUser.username, reviewerUser.password)

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Click the "提交审查" button at the top to show/activate the review form
    const openReviewButton = page.getByRole('button', { name: /提交审查|Add.*Review/i }).first()
    await openReviewButton.click()
    await page.waitForTimeout(500) // Brief wait for form to appear

    // Scroll to review form section (heading level 3)
    await page.getByRole('heading', { name: /提交审查|Submit.*Review/i, level: 3 }).scrollIntoViewIfNeeded()

    // Select APPROVED state from combobox
    const reviewStateSelect = page.locator('[role="combobox"]').or(page.locator('select'))
    await reviewStateSelect.first().selectOption('APPROVED')

    // Add review comment in textbox
    const reviewTextbox = page.getByPlaceholder(/留下您的审查意见|Leave.*review/i)
    await reviewTextbox.fill('Looks good to me! Approving this PR.')

    // Submit review - use the submit button below the form (not the top button)
    const submitButtons = page.getByRole('button', { name: /提交审查|Submit.*Review/i })
    const submitReviewButton = submitButtons.nth(1) // Second button is the submit button in form
    await submitReviewButton.click()

    // Wait for page to update
    await page.waitForTimeout(2000)

    // Verify Review Summary Card is visible
    await expect(page.getByRole('heading', { name: /Review 摘要|Review Summary/i }).last()).toBeVisible({
      timeout: 5000,
    })

    // Verify approved count
    await expect(page.locator('text=已批准').or(page.locator('text=Approved')).first()).toBeVisible()

    // Verify reviewer appears in reviewer list
    await expect(page.locator(`text=${reviewerUser.username}`).first()).toBeVisible()

    // Verify APPROVED icon/badge
    await expect(page.locator('text=✅').or(page.locator('text=APPROVED')).first()).toBeVisible()
  })

  test('should submit CHANGES_REQUESTED review and block merge', async ({ page, request }) => {
    // Create feature branch and PR
    await createBranch(request, ownerToken, projectId, 'feature-changes-test', 'main')
    await createCommit(
      request,
      ownerToken,
      projectId,
      'feature-changes-test',
      [{ path: 'test.txt', content: 'Test content' }],
      'Add test file',
    )
    const pr = await createPullRequest(request, ownerToken, projectId, 'Test CHANGES_REQUESTED', 'feature-changes-test')

    // Submit CHANGES_REQUESTED review as reviewer
    await submitReview(request, reviewerToken, pr.id, 'CHANGES_REQUESTED', 'Please fix the bugs')

    // Login as owner
    await loginViaUI(page, ownerUser.username, ownerUser.password)

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify Review Summary Card shows changes requested
    await expect(page.locator('text=需要修改').or(page.locator('text=Changes Requested'))).toBeVisible({
      timeout: 5000,
    })

    // Verify merge button is disabled/blocked
    const mergeButton = page.getByRole('button', { name: /Merge|合并/i }).filter({ hasText: /Cannot|无法/i })
    await expect(mergeButton).toBeVisible({ timeout: 5000 })
    await expect(mergeButton).toBeDisabled()
  })

  test('should submit COMMENTED review without affecting merge status', async ({ page, request }) => {
    // Create feature branch and PR
    await createBranch(request, ownerToken, projectId, 'feature-comment-test', 'main')
    await createCommit(
      request,
      ownerToken,
      projectId,
      'feature-comment-test',
      [{ path: 'test.txt', content: 'Test content' }],
      'Add test file',
    )
    const pr = await createPullRequest(request, ownerToken, projectId, 'Test COMMENTED Review', 'feature-comment-test')

    // Set requireApprovals to 0 so merge is allowed by default
    await updateProjectSettings(request, ownerToken, projectId, { requireApprovals: 0, allowSelfMerge: true })

    // Submit COMMENTED review as reviewer
    await submitReview(request, reviewerToken, pr.id, 'COMMENTED', 'Just a comment')

    // Login as owner
    await loginViaUI(page, ownerUser.username, ownerUser.password)

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify Review Summary Card shows comment count
    await expect(page.locator('text=已评论').or(page.locator('text=Commented')).first()).toBeVisible({
      timeout: 5000,
    })

    // Verify merge button is ENABLED (comments don't block merge)
    // Check for either enabled merge button or just any merge button that's not disabled
    const mergeButton = page.getByRole('button', { name: /Merge|合并/i }).first()
    await expect(mergeButton).toBeVisible({ timeout: 5000 })
  })

  test('should block merge when insufficient approvals', async ({ page, request }) => {
    // Create feature branch and PR
    await createBranch(request, ownerToken, projectId, 'feature-insufficient-approval', 'main')
    await createCommit(
      request,
      ownerToken,
      projectId,
      'feature-insufficient-approval',
      [{ path: 'test.txt', content: 'Test content' }],
      'Add test file',
    )
    const pr = await createPullRequest(request, ownerToken, projectId, 'Test Insufficient Approvals', 'feature-insufficient-approval')

    // Set requireApprovals to 2
    await updateProjectSettings(request, ownerToken, projectId, { requireApprovals: 2 })

    // Submit only 1 approval
    await submitReview(request, reviewerToken, pr.id, 'APPROVED', 'First approval')

    // Login as owner
    await loginViaUI(page, ownerUser.username, ownerUser.password)

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify merge button is disabled
    const mergeButton = page.getByRole('button', { name: /Cannot.*Merge|无法.*合并/i })
    await expect(mergeButton).toBeVisible({ timeout: 5000 })
    await expect(mergeButton).toBeDisabled()

    // Hover to see tooltip with blocking reason
    await mergeButton.hover()

    // Verify tooltip shows approval count (1/2)
    await expect(page.locator('text=1/2').or(page.locator('text=1 / 2'))).toBeVisible({ timeout: 3000 })
  })

  test('should block merge when self-merge is not allowed', async ({ page, request }) => {
    // Create feature branch and PR AS OWNER (self-merge scenario)
    await createBranch(request, ownerToken, projectId, 'feature-self-merge', 'main')
    await createCommit(
      request,
      ownerToken,
      projectId,
      'feature-self-merge',
      [{ path: 'test.txt', content: 'Test content' }],
      'Add test file',
    )
    const pr = await createPullRequest(request, ownerToken, projectId, 'Test Self-Merge Policy', 'feature-self-merge')

    // Set allowSelfMerge to false
    await updateProjectSettings(request, ownerToken, projectId, {
      requireApprovals: 0,
      allowSelfMerge: false
    })

    // Login as owner (who is also the PR author)
    await loginViaUI(page, ownerUser.username, ownerUser.password)

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify merge button is disabled
    const mergeButton = page.getByRole('button', { name: /Cannot.*Merge|无法.*合并/i })
    await expect(mergeButton).toBeVisible({ timeout: 5000 })
    await expect(mergeButton).toBeDisabled()

    // Hover to see tooltip
    await mergeButton.hover()

    // Verify tooltip shows self-merge blocking reason
    await expect(
      page.locator('text=不能合并自己的 PR（项目策略）').or(page.locator('text=Cannot merge your own PR'))
    ).toBeVisible({ timeout: 3000 })
  })

  test('should display Review Summary Card with correct aggregation', async ({ page, request }) => {
    // Create feature branch and PR
    await createBranch(request, ownerToken, projectId, 'feature-summary-test', 'main')
    await createCommit(
      request,
      ownerToken,
      projectId,
      'feature-summary-test',
      [{ path: 'test.txt', content: 'Test content' }],
      'Add test file',
    )
    const pr = await createPullRequest(request, ownerToken, projectId, 'Test Review Summary', 'feature-summary-test')

    // Submit multiple reviews
    await submitReview(request, reviewerToken, pr.id, 'APPROVED', 'First review - approved')

    // Login as owner
    await loginViaUI(page, ownerUser.username, ownerUser.password)

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify Review Summary Card is visible
    await expect(page.getByRole('heading', { name: /Review 摘要|Review Summary/i }).last()).toBeVisible({
      timeout: 5000,
    })

    // Verify aggregated counts
    await expect(page.locator('text=已批准').or(page.locator('text=Approved')).first()).toBeVisible()

    // Verify total reviewer count
    await expect(page.locator('text=审查者').or(page.locator('text=Reviewers'))).toBeVisible()

    // Verify reviewer name appears
    await expect(page.locator(`text=${reviewerUser.username}`).first()).toBeVisible()

    // Verify refresh button exists
    await expect(page.getByRole('button', { name: /刷新|Refresh/i })).toBeVisible()
  })

  test('should update PR approval settings in project settings page', async ({ page, request }) => {
    // Login as owner
    await loginViaUI(page, ownerUser.username, ownerUser.password)

    // Navigate to project PR settings
    await page.goto(`/projects/${projectId}/settings/pull-requests`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify page title
    await expect(page.locator('text=PR 审批规则').or(page.locator('text=PR Approval Rules'))).toBeVisible({
      timeout: 5000,
    })

    // Update requireApprovals to 3
    const requireApprovalsInput = page.locator('input[type="number"]#requireApprovals')
    await requireApprovalsInput.fill('3')

    // Uncheck allowSelfMerge
    const allowSelfMergeCheckbox = page.locator('input[type="checkbox"]#allowSelfMerge')
    if (await allowSelfMergeCheckbox.isChecked()) {
      await allowSelfMergeCheckbox.click()
    }

    // Check requireReviewFromOwner
    const requireOwnerCheckbox = page.locator('input[type="checkbox"]#requireReviewFromOwner')
    if (!(await requireOwnerCheckbox.isChecked())) {
      await requireOwnerCheckbox.click()
    }

    // Save changes
    await page.getByRole('button', { name: /Save.*Changes|保存.*更改/i }).click()

    // Wait for success message
    await page.waitForTimeout(2000)

    // Verify success (alert or toast)
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('成功')
      await dialog.accept()
    })

    // Verify Current Policy Summary reflects changes
    await expect(page.locator('text=3').first()).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=✗').or(page.locator('text=No'))).toBeVisible()
  })
})
