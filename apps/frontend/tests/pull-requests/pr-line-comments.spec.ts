/**
 * Pull Request Line-Level Comments E2E Tests
 *
 * Tests line-level comment functionality on PR diffs:
 * - Display existing line-level comments
 * - Add new line-level comments via inline form
 * - Hover interaction to show "Add comment" button
 *
 * ECP-D1: Testability - Comprehensive E2E coverage for line-level comments
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
): Promise<string> {
  const response = await request.post('http://localhost:4000/api/projects', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      name,
      description: 'Test project for line-level comments E2E tests',
      visibility: 'PUBLIC',
      requireApprovals: 0,
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
 * Add line-level comment via API
 */
async function addLineComment(
  request: APIRequestContext,
  token: string,
  prId: string,
  filePath: string,
  lineNumber: number,
  body: string,
  commitHash?: string,
): Promise<void> {
  const response = await request.post(`http://localhost:4000/api/pull-requests/${prId}/comments`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      body,
      filePath,
      lineNumber,
      commitHash,
    },
  })
  expect(response.ok()).toBeTruthy()
}

// ============================================
// Test Suite
// ============================================

test.describe('PR Line-Level Comments E2E Tests', () => {
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  }

  let projectId: string
  let accessToken: string

  test.beforeEach(async ({ page, request }) => {
    // 1. API Login to get token
    accessToken = await loginViaAPI(request, testUser.username, testUser.password)

    // 2. Create test project via API
    const timestamp = Date.now()
    const projectName = `Line Comments Test ${timestamp}`
    projectId = await createProjectViaAPI(request, accessToken, projectName)

    // 3. UI Login for page interactions
    await page.goto('/auth/login')
    await page.getByLabel(/用户名|Username/i).fill(testUser.username)
    await page.getByLabel(/密码|Password/i).fill(testUser.password)
    await page.getByRole('button', { name: /登录|Login/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('should display existing line-level comments on diff', async ({ page, request }) => {
    // Create feature branch with a file change
    await createBranch(request, accessToken, projectId, 'feature-display-comments', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-display-comments',
      [{ path: 'test.txt', content: 'Line 1\nLine 2\nLine 3\nLine 4' }],
      'Add test file with 4 lines',
    )

    // Create PR
    const pr = await createPullRequest(
      request,
      accessToken,
      projectId,
      'Test Line Comment Display',
      'feature-display-comments',
    )

    // Add line-level comment via API
    await addLineComment(
      request,
      accessToken,
      pr.id,
      'test.txt',
      2,
      'This is a comment on line 2',
      'feature-display-comments',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify diff is displayed
    await expect(page.locator('text=test.txt').first()).toBeVisible({ timeout: 5000 })

    // Verify line-level comment is displayed in blue section
    await expect(
      page.locator('.bg-blue-50,.bg-blue-900\\/20').filter({ hasText: 'This is a comment on line 2' }).first(),
    ).toBeVisible({ timeout: 5000 })

    // Verify comment metadata (line number indicator)
    await expect(page.locator('text=2 comment(s) on line').or(page.locator('text=line 2')).first()).toBeVisible()

    // Verify author username appears
    await expect(page.locator(`text=${testUser.username}`).first()).toBeVisible()
  })

  test('should show Add comment button on hover for commentable lines', async ({ page, request }) => {
    // Create feature branch with a file change
    await createBranch(request, accessToken, projectId, 'feature-hover-test', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-hover-test',
      [{ path: 'hover-test.txt', content: 'New line added' }],
      'Add hover test file',
    )

    // Create PR
    const pr = await createPullRequest(
      request,
      accessToken,
      projectId,
      'Test Hover Interaction',
      'feature-hover-test',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Wait for diff to load
    await expect(page.locator('text=hover-test.txt').first()).toBeVisible({ timeout: 5000 })

    // Find a line with addition marker (green background, starts with +)
    // This should be the "New line added" line
    const addedLine = page.locator('.bg-green-50,.bg-green-900\\/20').filter({ hasText: 'New line added' })
    await expect(addedLine).toBeVisible({ timeout: 5000 })

    // Hover over the added line
    await addedLine.hover()

    // Verify "Add comment" button appears on hover
    await expect(page.getByRole('button', { name: /💬 Add comment/i }).first()).toBeVisible({ timeout: 3000 })
  })

  test('should add line-level comment via inline form', async ({ page, request }) => {
    // Create feature branch with a file change
    await createBranch(request, accessToken, projectId, 'feature-add-comment', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-add-comment',
      [{ path: 'comment-test.txt', content: 'Line 1\nLine 2\nLine 3' }],
      'Add comment test file',
    )

    // Create PR
    const pr = await createPullRequest(
      request,
      accessToken,
      projectId,
      'Test Add Line Comment',
      'feature-add-comment',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Wait for diff to load
    await expect(page.locator('text=comment-test.txt').first()).toBeVisible({ timeout: 5000 })

    // Find the line with "Line 2" (should be an addition)
    const targetLine = page.locator('.bg-green-50,.bg-green-900\\/20').filter({ hasText: 'Line 2' })
    await expect(targetLine).toBeVisible({ timeout: 5000 })

    // Hover to show "Add comment" button
    await targetLine.hover()
    await page.waitForTimeout(500) // Brief wait for hover effect

    // Click "Add comment" button
    const addCommentButton = page.getByRole('button', { name: /💬 Add comment/i }).first()
    await expect(addCommentButton).toBeVisible({ timeout: 3000 })
    await addCommentButton.click()

    // Verify inline comment form appears (yellow background)
    await expect(
      page.locator('.bg-yellow-50,.bg-yellow-900\\/20').filter({ hasText: 'Adding comment on line' }).first(),
    ).toBeVisible({ timeout: 3000 })

    // Fill in comment body in textarea
    const commentTextarea = page.locator('textarea').filter({ hasText: '' }).first()
    await commentTextarea.fill('This is my inline comment on Line 2')

    // Submit comment
    const submitButton = page.getByRole('button', { name: /^Add comment$/i }).first()
    await expect(submitButton).toBeEnabled({ timeout: 2000 })
    await submitButton.click()

    // Wait for comment to be submitted and page to refresh
    await page.waitForTimeout(2000)

    // Verify inline form is closed (no longer visible)
    await expect(
      page.locator('.bg-yellow-50,.bg-yellow-900\\/20').filter({ hasText: 'Adding comment on line' }).first(),
    ).not.toBeVisible()

    // Verify comment appears in blue comment section
    await expect(
      page.locator('.bg-blue-50,.bg-blue-900\\/20').filter({ hasText: 'This is my inline comment on Line 2' }).first(),
    ).toBeVisible({ timeout: 5000 })

    // Verify comment count indicator
    await expect(page.locator('text=1 comment(s) on line').or(page.locator('text=comment(s) on line 2')).first()).toBeVisible()
  })

  test('should allow canceling inline comment form', async ({ page, request }) => {
    // Create feature branch with a file change
    await createBranch(request, accessToken, projectId, 'feature-cancel-test', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-cancel-test',
      [{ path: 'cancel-test.txt', content: 'Cancelable line' }],
      'Add cancel test file',
    )

    // Create PR
    const pr = await createPullRequest(
      request,
      accessToken,
      projectId,
      'Test Cancel Inline Form',
      'feature-cancel-test',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Wait for diff to load
    await expect(page.locator('text=cancel-test.txt').first()).toBeVisible({ timeout: 5000 })

    // Find the added line
    const targetLine = page.locator('.bg-green-50,.bg-green-900\\/20').filter({ hasText: 'Cancelable line' })
    await expect(targetLine).toBeVisible({ timeout: 5000 })

    // Hover and click "Add comment"
    await targetLine.hover()
    await page.waitForTimeout(500)
    const addCommentButton = page.getByRole('button', { name: /💬 Add comment/i }).first()
    await addCommentButton.click()

    // Verify form appears
    await expect(
      page.locator('.bg-yellow-50,.bg-yellow-900\\/20').filter({ hasText: 'Adding comment on line' }).first(),
    ).toBeVisible({ timeout: 3000 })

    // Fill in some text
    const commentTextarea = page.locator('textarea').filter({ hasText: '' }).first()
    await commentTextarea.fill('This text should be discarded')

    // Click Cancel button
    const cancelButton = page.getByRole('button', { name: /^Cancel$/i }).first()
    await cancelButton.click()

    // Verify form is closed
    await expect(
      page.locator('.bg-yellow-50,.bg-yellow-900\\/20').filter({ hasText: 'Adding comment on line' }).first(),
    ).not.toBeVisible()

    // Verify no comment was added
    await expect(
      page.locator('.bg-blue-50,.bg-blue-900\\/20').filter({ hasText: 'This text should be discarded' }),
    ).not.toBeVisible()
  })

  test('should not show Add comment button on deletion lines', async ({ page, request }) => {
    // First create a file on main branch
    await createCommit(
      request,
      accessToken,
      projectId,
      'main',
      [{ path: 'deletion-test.txt', content: 'Original line\nTo be deleted\nAnother line' }],
      'Add file on main',
    )

    // Create feature branch and delete a line
    await createBranch(request, accessToken, projectId, 'feature-delete-test', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-delete-test',
      [{ path: 'deletion-test.txt', content: 'Original line\nAnother line' }],
      'Delete middle line',
    )

    // Create PR
    const pr = await createPullRequest(
      request,
      accessToken,
      projectId,
      'Test No Comment on Deletions',
      'feature-delete-test',
    )

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${pr.number}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Wait for diff to load
    await expect(page.locator('text=deletion-test.txt').first()).toBeVisible({ timeout: 5000 })

    // Find the deletion line (red background, starts with -)
    const deletionLine = page.locator('.bg-red-50,.bg-red-900\\/20').filter({ hasText: 'To be deleted' })
    await expect(deletionLine).toBeVisible({ timeout: 5000 })

    // Hover over deletion line
    await deletionLine.hover()
    await page.waitForTimeout(500)

    // Verify "Add comment" button does NOT appear
    await expect(page.getByRole('button', { name: /💬 Add comment/i })).not.toBeVisible()
  })
})
