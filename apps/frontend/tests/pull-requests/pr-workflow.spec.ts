/**
 * Pull Request E2E Workflow Tests
 *
 * Tests complete PR lifecycle:
 * - Create PR with source/target branches
 * - View PR details with diff
 * - Merge PR with different strategies
 *
 * ECP-D1: Testability - Comprehensive E2E coverage for PR system
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
      description: 'Test project for PR E2E tests',
      visibility: 'PUBLIC',
      requireApprovals: 0, // Allow merge without approvals for testing
      allowSelfMerge: true, // Allow author to merge their own PR
    },
  })
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  return data.id as string
}

/**
 * Initialize Git repository
 */
async function _initGitRepo(
  request: APIRequestContext,
  token: string,
  projectId: string,
): Promise<void> {
  const response = await request.post(`http://localhost:4000/api/git/${projectId}/init`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      defaultBranch: 'main',
      authorName: 'Test User',
      authorEmail: 'test@example.com',
    },
  })

  if (!response.ok()) {
    const errorBody = await response.text()
    console.error(`[_initGitRepo] FAILED: ${response.status()} ${response.statusText()}`)
    console.error(`[_initGitRepo] Response body: ${errorBody}`)
  }

  expect(response.ok()).toBeTruthy()
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

// ============================================
// Test Suite
// ============================================

test.describe('Pull Request E2E Workflow', () => {
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  }

  let projectId: string
  let accessToken: string

  test.beforeEach(async ({ page, request }) => {
    // 1. API Login to get token for Git operations
    accessToken = await loginViaAPI(request, testUser.username, testUser.password)

    // 2. Create test project via API
    // Note: Backend automatically creates Repository and initializes Git with main branch!
    // See apps/backend/src/projects/projects.service.ts:89-103
    const timestamp = Date.now()
    const projectName = `PR Test Project ${timestamp}`
    projectId = await createProjectViaAPI(request, accessToken, projectName)

    // 3. UI Login for page interactions
    await page.goto('/auth/login')
    await page.getByLabel(/用户名|Username/i).fill(testUser.username)
    await page.getByLabel(/密码|Password/i).fill(testUser.password)
    await page.getByRole('button', { name: /登录|Login/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('should display PR list page', async ({ page }) => {
    await page.goto(`/projects/${projectId}/pulls`)

    // Verify page title
    await expect(
      page.locator('h1, h2').filter({ hasText: /Pull Requests?|拉取请求/i }),
    ).toBeVisible({
      timeout: 5000,
    })

    // Verify "New Pull Request" button exists
    await expect(
      page.getByRole('button', { name: /New.*Pull Request|创建.*Pull Request/i }),
    ).toBeVisible({
      timeout: 5000,
    })
  })

  test('should create a new pull request', async ({ page, request }) => {
    // Create feature branch and commit for this test
    await createBranch(request, accessToken, projectId, 'feature-create-pr', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-create-pr',
      [{ path: 'feature.txt', content: 'This is a new feature\nAdded functionality' }],
      'Add new feature',
    )

    await page.goto(`/projects/${projectId}/pulls/new`)

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Fill PR title
    await page.getByLabel(/Title|标题/i).fill('Test PR: Add new feature')

    // Fill PR body (description)
    // Look for textarea or contenteditable for PR description
    const bodyField = page.locator('textarea').filter({ hasText: '' }).first()
    if (await bodyField.isVisible()) {
      await bodyField.fill('This PR adds a new feature\n\n- Added feature.txt\n- Implemented functionality')
    }

    // Select source branch (feature-branch) if not auto-selected
    // This depends on the UI implementation - may need to adjust selectors

    // Select target branch (main) if not auto-selected

    // Wait for button to be enabled (branches loaded)
    const createButton = page.getByRole('button', { name: /Create.*Pull Request|创建/i })
    await expect(createButton).toBeEnabled({ timeout: 10000 })

    // Submit PR creation
    await createButton.click()

    // Verify redirect to PR detail page
    await expect(page).toHaveURL(/\/pulls\/\d+/, { timeout: 10000 })

    // Extract PR number from URL
    const url = page.url()
    const match = url.match(/\/pulls\/(\d+)/)
    expect(match).toBeTruthy()
    const prNumber = parseInt(match![1])
    expect(prNumber).toBeGreaterThan(0)

    // Verify PR title displayed
    await expect(page.getByRole('heading').filter({ hasText: 'Test PR: Add new feature' })).toBeVisible({
      timeout: 5000,
    })

    // Verify OPEN badge
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: /^Open$/i })).toBeVisible({
      timeout: 5000,
    })
  })

  test('should display PR details with diff', async ({ page, request }) => {
    // Create feature branch and commit for this test
    await createBranch(request, accessToken, projectId, 'feature-diff-test', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-diff-test',
      [{ path: 'feature.txt', content: 'This is a new feature\nAdded functionality' }],
      'Add new feature',
    )

    // First create a PR via API for testing
    const createPRResponse = await request.post('http://localhost:4000/api/pull-requests', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId,
        title: 'Test PR for Display',
        body: 'This PR demonstrates diff display',
        sourceBranch: 'feature-diff-test',
        targetBranch: 'main',
      },
    })
    expect(createPRResponse.ok()).toBeTruthy()
    const prData = await createPRResponse.json()
    const prNumber = prData.number

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${prNumber}`)

    // Verify PR title
    await expect(page.getByRole('heading').filter({ hasText: 'Test PR for Display' })).toBeVisible({
      timeout: 5000,
    })

    // Verify PR body content
    await expect(page.locator('text=This PR demonstrates diff display')).toBeVisible({
      timeout: 5000,
    })

    // Verify source and target branches displayed
    await expect(page.locator('text=feature-diff-test')).toBeVisible()
    await expect(page.locator('text=main')).toBeVisible()

    // Verify diff content displayed (should show feature.txt changes)
    // Use more specific selector to match only the filename header, not the patch content
    await expect(page.locator('.bg-gray-100,.bg-gray-800').filter({ hasText: 'feature.txt' })).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('text=This is a new feature')).toBeVisible({
      timeout: 5000,
    })

    // Verify OPEN badge
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: /^Open$/i })).toBeVisible()
  })

  test('should merge PR with merge commit strategy', async ({ page, request }) => {
    // Create feature branch and commit for this test
    await createBranch(request, accessToken, projectId, 'feature-merge-commit', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-merge-commit',
      [{ path: 'merge-commit.txt', content: 'Merge commit test' }],
      'Add merge commit test file',
    )

    // Create a PR via API
    const createPRResponse = await request.post('http://localhost:4000/api/pull-requests', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId,
        title: 'Test PR for Merge',
        body: 'This PR will be merged',
        sourceBranch: 'feature-merge-commit',
        targetBranch: 'main',
      },
    })
    expect(createPRResponse.ok()).toBeTruthy()
    const prData = await createPRResponse.json()
    const prNumber = prData.number
    const _prId = prData.id

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${prNumber}`)

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Click "Merge Pull Request" button
    const mergeButton = page.getByRole('button', { name: /Merge.*Pull Request|合并/i })
    await expect(mergeButton).toBeVisible({ timeout: 5000 })
    await mergeButton.click()

    // Wait for merge dialog to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // Select "Merge Commit" strategy from dropdown
    const strategySelect = page.locator('select').filter({ hasText: /Merge.*Squash.*Rebase/i })
    await strategySelect.selectOption('merge')

    // Confirm merge - look for "合并 PR" or "Merge PR" button in dialog (use .last() to get dialog button)
    await page.getByRole('button', { name: /^Merge.*PR$|^合并.*PR$/i }).last().click()

    // Wait for merge to complete
    await page.waitForTimeout(2000)

    // Verify MERGED badge appears
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: /^Merged$/i })).toBeVisible({
      timeout: 10000,
    })

    // Verify merge commit message or merged state
    await expect(page.locator('text=merged this pull request').or(page.locator('text=已合并'))).toBeVisible({
      timeout: 5000,
    })

    // Verify "Merge" button is no longer visible or disabled
    const mergeButtonAfter = page.getByRole('button', { name: /Merge.*Pull Request|合并/i })
    await expect(mergeButtonAfter).not.toBeVisible()
  })

  test('should merge PR with squash strategy', async ({ page, request }) => {
    // Create feature branch and commit for this test
    await createBranch(request, accessToken, projectId, 'feature-squash', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-squash',
      [{ path: 'squash.txt', content: 'Squash merge test' }],
      'Add squash test file',
    )

    // Create a PR via API
    const createPRResponse = await request.post('http://localhost:4000/api/pull-requests', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId,
        title: 'Test PR for Squash Merge',
        body: 'This PR will be squash merged',
        sourceBranch: 'feature-squash',
        targetBranch: 'main',
      },
    })
    expect(createPRResponse.ok()).toBeTruthy()
    const prData = await createPRResponse.json()
    const prNumber = prData.number

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${prNumber}`)

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Click "Merge Pull Request" button
    const mergeButton = page.getByRole('button', { name: /Merge.*Pull Request|合并/i })
    await expect(mergeButton).toBeVisible({ timeout: 5000 })
    await mergeButton.click()

    // Wait for merge dialog to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // Select "Squash" strategy from dropdown
    const strategySelect = page.locator('select').filter({ hasText: /Merge.*Squash.*Rebase/i })
    await strategySelect.selectOption('squash')  // Lowercase to match MergeStrategy enum value

    // Confirm merge
    await page.getByRole('button', { name: /^Merge.*PR$|^合并.*PR$/i }).last().click()

    // Wait for merge to complete
    await page.waitForTimeout(2000)

    // Verify MERGED badge appears
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: /^Merged$/i })).toBeVisible({
      timeout: 10000,
    })

    // Verify merge completed
    await expect(page.locator('text=merged this pull request').or(page.locator('text=已合并'))).toBeVisible({
      timeout: 5000,
    })
  })

  test('should merge PR with rebase strategy', async ({ page, request }) => {
    // Create feature branch and commit for this test
    await createBranch(request, accessToken, projectId, 'feature-rebase', 'main')
    await createCommit(
      request,
      accessToken,
      projectId,
      'feature-rebase',
      [{ path: 'rebase.txt', content: 'Rebase merge test' }],
      'Add rebase test file',
    )

    // Create a PR via API
    const createPRResponse = await request.post('http://localhost:4000/api/pull-requests', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId,
        title: 'Test PR for Rebase Merge',
        body: 'This PR will be rebased',
        sourceBranch: 'feature-rebase',
        targetBranch: 'main',
      },
    })
    expect(createPRResponse.ok()).toBeTruthy()
    const prData = await createPRResponse.json()
    const prNumber = prData.number

    // Navigate to PR detail page
    await page.goto(`/projects/${projectId}/pulls/${prNumber}`)

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Click "Merge Pull Request" button
    const mergeButton = page.getByRole('button', { name: /Merge.*Pull Request|合并/i })
    await expect(mergeButton).toBeVisible({ timeout: 5000 })
    await mergeButton.click()

    // Wait for merge dialog to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // Select "Rebase" strategy from dropdown
    const strategySelect = page.locator('select').filter({ hasText: /Merge.*Squash.*Rebase/i })
    await strategySelect.selectOption('rebase')  // Lowercase to match MergeStrategy enum value

    // Confirm merge
    await page.getByRole('button', { name: /^Merge.*PR$|^合并.*PR$/i }).last().click()

    // Wait for merge to complete
    await page.waitForTimeout(2000)

    // Verify MERGED badge appears
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: /^Merged$/i })).toBeVisible({
      timeout: 10000,
    })

    // Verify merge completed
    await expect(page.locator('text=merged this pull request').or(page.locator('text=已合并'))).toBeVisible({
      timeout: 5000,
    })
  })
})
