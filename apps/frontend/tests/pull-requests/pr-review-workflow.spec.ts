/**
 * Pull Request Review Workflow E2E Tests
 *
 * Tests PR review workflow functionality:
 * - Submit Approve review and update merge status
 * - Submit Request Changes review and block merge
 * - Submit Comment-only review
 * - Multiple approvals requirement
 * - Review summary updates
 *
 * ECP-D1: Testability - Comprehensive E2E coverage for review workflow
 */

import { TEST_USERS } from '../fixtures'
import { test, expect, APIRequestContext } from '@playwright/test'

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
  requireApprovals: number = 0,
): Promise<string> {
  const response = await request.post('http://localhost:4000/api/projects', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      name,
      description: 'Test project for review workflow E2E tests',
      visibility: 'PUBLIC',
      requireApprovals,
      allowSelfMerge: true,
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
      body,
    },
  })
  expect(response.ok()).toBeTruthy()
}

// ============================================
// Test Suite
// ============================================

test.describe('PR Review Workflow E2E Tests', () => {
  const creator = TEST_USERS.jia
  const reviewer1 = TEST_USERS.admin
  const reviewer2 = TEST_USERS.normaluser

  let projectId: string
  let creatorToken: string

  test.beforeEach(async ({ page, request }) => {
    // Login as creator
    creatorToken = await loginViaAPI(request, creator.username, creator.password)

    // Create test project
    const timestamp = Date.now()
    const projectName = `Review Workflow Test ${timestamp}`
    projectId = await createProjectViaAPI(request, creatorToken, projectName)

    // UI Login for page interactions
    await page.goto('/auth/login')
    await page.getByLabel(/用户名|Username/i).fill(creator.username)
    await page.getByLabel(/密码|Password/i).fill(creator.password)
    await page.getByRole('button', { name: /登录|Login/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('should submit Approve review and display on page', async ({ page, request }) => {
    // Create feature branch and PR
    await createBranch(request, creatorToken, projectId, 'feature-approve-test', 'main')
    await createCommit(
      request,
      creatorToken,
      projectId,
      'feature-approve-test',
      [{ path: 'feature.txt', content: 'New feature code' }],
      'Add new feature',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      projectId,
      'Test Approve Review',
      'feature-approve-test',
    )

    // Reviewer 1 submits Approve review via API
    const reviewer1Token = await loginViaAPI(request, reviewer1.username, reviewer1.password)
    await submitReview(request, reviewer1Token, pr.id, 'APPROVED', 'Looks good to me!')

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify review is displayed in Reviews section
    await expect(page.locator('text=✅').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator(`text=${reviewer1.username}`).first()).toBeVisible()
    await expect(page.locator('text=Looks good to me!').first()).toBeVisible()
  })

  test('should submit Request Changes review and block merge', async ({ page, request }) => {
    // Create project with requireApprovals=1
    const timestamp = Date.now()
    const projectName = `Approval Required ${timestamp}`
    const approvalProjectId = await createProjectViaAPI(request, creatorToken, projectName, 1)

    // Create feature branch and PR
    await createBranch(request, creatorToken, approvalProjectId, 'feature-changes', 'main')
    await createCommit(
      request,
      creatorToken,
      approvalProjectId,
      'feature-changes',
      [{ path: 'bug.txt', content: 'Buggy code' }],
      'Add buggy code',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      approvalProjectId,
      'Test Request Changes',
      'feature-changes',
    )

    // Reviewer submits Request Changes review
    const reviewer1Token = await loginViaAPI(request, reviewer1.username, reviewer1.password)
    await submitReview(
      request,
      reviewer1Token,
      pr.id,
      'CHANGES_REQUESTED',
      'Please fix the bug before merging',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${approvalProjectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify Request Changes review is displayed
    await expect(page.locator('text=🔴').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Please fix the bug before merging').first()).toBeVisible()

    // Verify Merge button is disabled
    const mergeButton = page.getByRole('button', { name: /Cannot Merge|✗/i })
    await expect(mergeButton.first()).toBeVisible({ timeout: 5000 })

    // Hover to see tooltip with blocking reason
    await mergeButton.first().hover()
    await expect(page.locator('text=/change request|不允许合并/i').first()).toBeVisible({ timeout: 3000 })
  })

  test('should submit Comment-only review without affecting merge status', async ({ page, request }) => {
    // Create feature branch and PR
    await createBranch(request, creatorToken, projectId, 'feature-comment', 'main')
    await createCommit(
      request,
      creatorToken,
      projectId,
      'feature-comment',
      [{ path: 'code.txt', content: 'Some code' }],
      'Add code',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      projectId,
      'Test Comment Review',
      'feature-comment',
    )

    // Reviewer submits Comment review
    const reviewer1Token = await loginViaAPI(request, reviewer1.username, reviewer1.password)
    await submitReview(request, reviewer1Token, pr.id, 'COMMENTED', 'Just a comment, not blocking')

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify Comment review is displayed
    await expect(page.locator('text=💬').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Just a comment, not blocking').first()).toBeVisible()

    // Verify Merge button is still enabled (no approval requirements)
    const mergeButton = page.getByRole('button', { name: /Merge Pull Request|合并/i })
    await expect(mergeButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('should require multiple approvals before allowing merge', async ({ page, request }) => {
    // Create project with requireApprovals=2
    const timestamp = Date.now()
    const projectName = `Two Approvals Required ${timestamp}`
    const multiApprovalProjectId = await createProjectViaAPI(request, creatorToken, projectName, 2)

    // Create feature branch and PR
    await createBranch(request, creatorToken, multiApprovalProjectId, 'feature-multi', 'main')
    await createCommit(
      request,
      creatorToken,
      multiApprovalProjectId,
      'feature-multi',
      [{ path: 'important.txt', content: 'Critical feature' }],
      'Add critical feature',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      multiApprovalProjectId,
      'Test Multiple Approvals',
      'feature-multi',
    )

    // First reviewer approves
    const reviewer1Token = await loginViaAPI(request, reviewer1.username, reviewer1.password)
    await submitReview(request, reviewer1Token, pr.id, 'APPROVED', 'First approval')

    // Navigate to PR and verify merge is still blocked
    await page.goto(`/projects/${multiApprovalProjectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify first review is displayed
    await expect(page.locator(`text=${reviewer1.username}`).first()).toBeVisible()

    // Verify merge button shows 1/2 approvals and is disabled
    const blockedButton = page.getByRole('button', { name: /Cannot Merge|✗/i })
    await expect(blockedButton.first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/1.*2/').first()).toBeVisible() // Shows "1/2" approval count

    // Second reviewer approves
    const reviewer2Token = await loginViaAPI(request, reviewer2.username, reviewer2.password)
    await submitReview(request, reviewer2Token, pr.id, 'APPROVED', 'Second approval')

    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify second review is displayed
    await expect(page.locator(`text=${reviewer2.username}`).first()).toBeVisible()

    // Verify merge button is now enabled with 2/2 approvals
    const enabledButton = page.getByRole('button', { name: /✓.*Merge|合并/i })
    await expect(enabledButton.first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/2.*2/').first()).toBeVisible() // Shows "2/2" approval count
  })

  test('should display review summary card with correct counts', async ({ page, request }) => {
    // Create project with requireApprovals=1
    const timestamp = Date.now()
    const projectName = `Review Summary Test ${timestamp}`
    const summaryProjectId = await createProjectViaAPI(request, creatorToken, projectName, 1)

    // Create feature branch and PR
    await createBranch(request, creatorToken, summaryProjectId, 'feature-summary', 'main')
    await createCommit(
      request,
      creatorToken,
      summaryProjectId,
      'feature-summary',
      [{ path: 'file.txt', content: 'Code' }],
      'Add file',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      summaryProjectId,
      'Test Review Summary',
      'feature-summary',
    )

    // Submit different types of reviews
    const reviewer1Token = await loginViaAPI(request, reviewer1.username, reviewer1.password)
    await submitReview(request, reviewer1Token, pr.id, 'APPROVED', 'Approve')

    const reviewer2Token = await loginViaAPI(request, reviewer2.username, reviewer2.password)
    await submitReview(request, reviewer2Token, pr.id, 'COMMENTED', 'Comment')

    // Navigate to PR detail page
    await page.goto(`/projects/${summaryProjectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify Review Summary Card displays correct counts
    // Should show: 1 Approve, 0 Request Changes, 1 Comment
    await expect(page.locator('text=/1.*Approv/i').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/0.*Change.*Request/i').or(page.locator('text=/0.*🔴/')).first()).toBeVisible()
    await expect(page.locator('text=/1.*Comment/i').or(page.locator('text=/1.*💬/')).first()).toBeVisible()
  })
})
