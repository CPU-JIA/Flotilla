/**
 * Pull Request Merge E2E Tests
 *
 * Tests PR merge functionality:
 * - Merge with different strategies (Merge Commit, Squash, Rebase)
 * - Merge validation (approval requirements)
 * - Post-merge state updates
 * - Merge button disabled/enabled states
 *
 * ECP-D1: Testability - Comprehensive E2E coverage for merge workflow
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
      description: 'Test project for merge E2E tests',
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
): Promise<Record<string, unknown>> {
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

test.describe('PR Merge E2E Tests', () => {
  const creator = TEST_USERS.jia
  const reviewer = TEST_USERS.admin

  let projectId: string
  let creatorToken: string

  test.beforeEach(async ({ page, request }) => {
    // Login as creator
    creatorToken = await loginViaAPI(request, creator.username, creator.password)

    // Create test project
    const timestamp = Date.now()
    const projectName = `Merge Test ${timestamp}`
    projectId = await createProjectViaAPI(request, creatorToken, projectName)

    // UI Login for page interactions
    await page.goto('/auth/login')
    await page.getByLabel(/用户名|Username/i).fill(creator.username)
    await page.getByLabel(/密码|Password/i).fill(creator.password)
    await page.getByRole('button', { name: /登录|Login/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('should merge PR with Merge Commit strategy', async ({ page, request }) => {
    // Create feature branch and PR
    await createBranch(request, creatorToken, projectId, 'feature-merge-commit', 'main')
    await createCommit(
      request,
      creatorToken,
      projectId,
      'feature-merge-commit',
      [{ path: 'feature.txt', content: 'Merge commit test' }],
      'Add feature for merge commit',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      projectId,
      'Test Merge Commit',
      'feature-merge-commit',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Click Merge button
    const mergeButton = page.getByRole('button', { name: /Merge Pull Request|合并/i }).first()
    await expect(mergeButton).toBeVisible({ timeout: 5000 })
    await mergeButton.click()

    // Merge dialog should appear
    const dialog = page.getByRole('dialog')
    await expect(dialog.first()).toBeVisible({ timeout: 3000 })

    // Select Merge Commit strategy (should be default)
    const strategySelect = dialog.locator('select').first()
    await expect(strategySelect).toBeVisible()
    await strategySelect.selectOption('merge')

    // Confirm merge (button inside dialog)
    const confirmButton = dialog.getByRole('button').filter({ hasText: /Merge|合并/i }).first()
    await confirmButton.click()

    // Wait for merge to complete
    await page.waitForTimeout(2000)

    // Verify PR state changed to MERGED
    await expect(page.locator('text=/MERGED|已合并/i').first()).toBeVisible({ timeout: 5000 })

    // Verify merge information is displayed
    await expect(page.locator(`text=${creator.username}`).first()).toBeVisible()
  })

  test('should merge PR with Squash strategy', async ({ page, request }) => {
    // Create feature branch with multiple commits
    await createBranch(request, creatorToken, projectId, 'feature-squash', 'main')
    await createCommit(
      request,
      creatorToken,
      projectId,
      'feature-squash',
      [{ path: 'file1.txt', content: 'First commit' }],
      'First commit',
    )
    await createCommit(
      request,
      creatorToken,
      projectId,
      'feature-squash',
      [{ path: 'file2.txt', content: 'Second commit' }],
      'Second commit',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      projectId,
      'Test Squash Merge',
      'feature-squash',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Click Merge button
    await page.getByRole('button', { name: /Merge Pull Request|合并/i }).first().click()

    // Select Squash strategy
    const dialog = page.getByRole('dialog')
    await expect(dialog.first()).toBeVisible({ timeout: 3000 })

    const strategySelect = dialog.locator('select').first()
    await expect(strategySelect).toBeVisible()
    await strategySelect.selectOption('squash')

    // Confirm merge (button inside dialog)
    const confirmButton = dialog.getByRole('button').filter({ hasText: /Merge|合并/i }).first()
    await confirmButton.click()

    // Wait and verify merge completed
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/MERGED|已合并/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('should merge PR with Rebase strategy', async ({ page, request }) => {
    // Create feature branch
    await createBranch(request, creatorToken, projectId, 'feature-rebase', 'main')
    await createCommit(
      request,
      creatorToken,
      projectId,
      'feature-rebase',
      [{ path: 'rebase.txt', content: 'Rebase test' }],
      'Add rebase feature',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      projectId,
      'Test Rebase Merge',
      'feature-rebase',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Click Merge button
    await page.getByRole('button', { name: /Merge Pull Request|合并/i }).first().click()

    // Select Rebase strategy
    const dialog = page.getByRole('dialog')
    await expect(dialog.first()).toBeVisible({ timeout: 3000 })

    const strategySelect = dialog.locator('select').first()
    await expect(strategySelect).toBeVisible()
    await strategySelect.selectOption('rebase')

    // Confirm merge (button inside dialog)
    const confirmButton = dialog.getByRole('button').filter({ hasText: /Merge|合并/i }).first()
    await confirmButton.click()

    // Wait and verify merge completed
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/MERGED|已合并/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('should block merge when approval requirements not met', async ({ page, request }) => {
    // Create project with requireApprovals=1
    const timestamp = Date.now()
    const approvalProjectName = `Approval Required ${timestamp}`
    const approvalProjectId = await createProjectViaAPI(request, creatorToken, approvalProjectName, 1)

    // Create feature branch and PR
    await createBranch(request, creatorToken, approvalProjectId, 'feature-blocked', 'main')
    await createCommit(
      request,
      creatorToken,
      approvalProjectId,
      'feature-blocked',
      [{ path: 'blocked.txt', content: 'Needs approval' }],
      'Add feature',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      approvalProjectId,
      'Test Merge Blocked',
      'feature-blocked',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${approvalProjectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify merge button is disabled
    const blockedButton = page.getByRole('button', { name: /Cannot Merge|✗/i })
    await expect(blockedButton.first()).toBeVisible({ timeout: 5000 })

    // Hover to see blocking reason
    await blockedButton.first().hover()
    await expect(page.locator('text=/approval|审批/i').first()).toBeVisible({ timeout: 3000 })
  })

  test('should allow merge after approval requirements met', async ({ page, request }) => {
    // Create project with requireApprovals=1
    const timestamp = Date.now()
    const approvalProjectName = `Approval Test ${timestamp}`
    const approvalProjectId = await createProjectViaAPI(request, creatorToken, approvalProjectName, 1)

    // Create feature branch and PR
    await createBranch(request, creatorToken, approvalProjectId, 'feature-approved', 'main')
    await createCommit(
      request,
      creatorToken,
      approvalProjectId,
      'feature-approved',
      [{ path: 'approved.txt', content: 'Approved feature' }],
      'Add approved feature',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      approvalProjectId,
      'Test Merge After Approval',
      'feature-approved',
    )

    // Submit approval review
    const reviewerToken = await loginViaAPI(request, reviewer.username, reviewer.password)
    await submitReview(request, reviewerToken, pr.id, 'APPROVED', 'LGTM')

    // Navigate to PR detail page
    await page.goto(`/projects/${approvalProjectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify merge button is now enabled
    const mergeButton = page.getByRole('button', { name: /✓.*Merge|合并/i })
    await expect(mergeButton.first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/1.*1/').first()).toBeVisible() // Shows "1/1" approval

    // Perform merge
    await mergeButton.first().click()

    // Wait for dialog and confirm merge
    const dialog = page.getByRole('dialog')
    await expect(dialog.first()).toBeVisible({ timeout: 3000 })

    const confirmButton = dialog.getByRole('button').filter({ hasText: /Merge|合并/i }).first()
    await confirmButton.click()

    // Verify merge completed
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/MERGED|已合并/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('should display merge information after successful merge', async ({ page, request }) => {
    // Create feature branch and PR
    await createBranch(request, creatorToken, projectId, 'feature-info', 'main')
    await createCommit(
      request,
      creatorToken,
      projectId,
      'feature-info',
      [{ path: 'info.txt', content: 'Merge info test' }],
      'Add feature',
    )

    const pr = await createPullRequest(
      request,
      creatorToken,
      projectId,
      'Test Merge Info',
      'feature-info',
    )

    // Navigate and merge
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    await page.getByRole('button', { name: /Merge Pull Request|合并/i }).first().click()

    // Wait for dialog and confirm merge
    const dialog = page.getByRole('dialog')
    await expect(dialog.first()).toBeVisible({ timeout: 3000 })

    const confirmButton = dialog.getByRole('button').filter({ hasText: /Merge|合并/i }).first()
    await confirmButton.click()

    // Wait for merge
    await page.waitForTimeout(2000)

    // Verify merge information
    await expect(page.locator('text=/MERGED|已合并/i').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator(`text=${creator.username}`).first()).toBeVisible() // Merged by
  })
})
