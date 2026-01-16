/**
 * Branch Protection Rules E2E Tests
 *
 * Tests branch protection rule CRUD functionality:
 * - Create rule with all options
 * - Display rules in table
 * - Update existing rule
 * - Delete rule
 * - Form validation (branch pattern, required approvals)
 *
 * ECP-D1: Testability - Comprehensive E2E coverage for branch protection workflow
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
  password: string
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
  name: string
): Promise<string> {
  const response = await request.post('http://localhost:4000/api/projects', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      name,
      description: 'Test project for branch protection E2E tests',
      visibility: 'PUBLIC',
      requireApprovals: 0,
      allowSelfMerge: true,
    },
  })
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  return data.id as string
}

// ============================================
// Test Suite
// ============================================

test.describe('Branch Protection Rules E2E Tests', () => {
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
    const projectName = `Branch Protection Test ${timestamp}`
    projectId = await createProjectViaAPI(request, accessToken, projectName)

    // 3. UI Login for page interactions
    await page.goto('/auth/login')
    await page.getByLabel(/用户名|Username/i).fill(testUser.username)
    await page.getByLabel(/密码|Password/i).fill(testUser.password)
    await page.getByRole('button', { name: /登录|Login/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('should create branch protection rule with all options', async ({ page }) => {
    // Navigate to branch protection settings
    await page.goto(`/projects/${projectId}/settings/branch-protection`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Wait for page to fully render
    await page.waitForTimeout(1000)

    // Click "Create Rule" button
    await page.getByRole('button', { name: /Create.*Rule|创建.*规则/i }).click()

    // Wait for dialog to open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Fill in branch pattern (required field) using ID
    await page.locator('#branchPattern').fill('main')

    // Toggle checkboxes using IDs
    await page.locator('#requirePullRequest').check()
    await page.locator('#dismissStaleReviews').check()
    await page.locator('#requireCodeOwnerReview').check()

    // Set required approvals using ID
    await page.locator('#requiredApprovals').fill('2')

    // Keep dangerous options unchecked
    await page.locator('#allowForcePushes').uncheck()
    await page.locator('#allowDeletions').uncheck()

    // Set status checks
    await page.locator('#requireStatusChecks').check()

    // Find the requiredStatusChecks input (comma-separated)
    await page.locator('input[placeholder*="ci"]').fill('ci, tests, build')

    // Submit form
    await page.getByRole('button', { name: /创建保护规则|Create.*Rule/i }).click()

    // Wait for success alert
    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })

    await page.waitForTimeout(3000)

    // Verify dialog closed
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify rule appears in table
    await expect(page.getByRole('cell', { name: 'main' })).toBeVisible({ timeout: 5000 })
  })

  test('should display created rule in table', async ({ page, request }) => {
    // Create a rule via API
    const response = await request.post(
      `http://localhost:4000/api/projects/${projectId}/branch-protection`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          branchPattern: 'develop',
          requirePullRequest: true,
          requiredApprovingReviews: 1,
          dismissStaleReviews: false,
          requireCodeOwnerReview: false,
          allowForcePushes: false,
          allowDeletions: false,
          requireStatusChecks: false,
          requiredStatusChecks: [],
        },
      }
    )
    expect(response.ok()).toBeTruthy()

    // Navigate to branch protection page
    await page.goto(`/projects/${projectId}/settings/branch-protection`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify rule is displayed in table
    await expect(page.getByRole('cell', { name: 'develop' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('cell', { name: /true|是/i })).toBeVisible() // requirePullRequest
    await expect(page.getByRole('cell', { name: '1' })).toBeVisible() // requiredApprovingReviews
  })

  test('should update existing protection rule', async ({ page, request }) => {
    // Create a rule via API
    const createResponse = await request.post(
      `http://localhost:4000/api/projects/${projectId}/branch-protection`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          branchPattern: 'feature/*',
          requirePullRequest: true,
          requiredApprovingReviews: 1,
          dismissStaleReviews: false,
          requireCodeOwnerReview: false,
          allowForcePushes: false,
          allowDeletions: false,
          requireStatusChecks: false,
          requiredStatusChecks: [],
        },
      }
    )
    expect(createResponse.ok()).toBeTruthy()
    const _ruleData = await createResponse.json()

    // Navigate to branch protection page
    await page.goto(`/projects/${projectId}/settings/branch-protection`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Find the rule row and click Edit button
    const row = page.locator('tr', { hasText: 'feature/*' })
    await expect(row).toBeVisible({ timeout: 5000 })
    await row.getByRole('button', { name: /Edit|编辑/i }).click()

    // Wait for dialog to open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Modify required approvals using ID
    await page.locator('#requiredApprovals').fill('3')

    // Enable dismissStaleReviews using ID
    await page.locator('#dismissStaleReviews').check()

    // Submit update
    await page.getByRole('button', { name: /更新规则|Update.*Rule|Save/i }).click()

    // Wait for success alert
    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })

    await page.waitForTimeout(2000)

    // Verify dialog closed
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Refresh page to verify update persisted
    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify updated value appears (3 approvals)
    await expect(page.getByRole('cell', { name: '3' })).toBeVisible({ timeout: 5000 })
  })

  test('should delete protection rule', async ({ page, request }) => {
    // Create a rule via API
    const createResponse = await request.post(
      `http://localhost:4000/api/projects/${projectId}/branch-protection`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          branchPattern: 'temp-branch',
          requirePullRequest: false,
          requiredApprovingReviews: 0,
          dismissStaleReviews: false,
          requireCodeOwnerReview: false,
          allowForcePushes: false,
          allowDeletions: false,
          requireStatusChecks: false,
          requiredStatusChecks: [],
        },
      }
    )
    expect(createResponse.ok()).toBeTruthy()

    // Navigate to branch protection page
    await page.goto(`/projects/${projectId}/settings/branch-protection`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify rule exists
    await expect(page.getByRole('cell', { name: 'temp-branch' })).toBeVisible({ timeout: 5000 })

    // Set up dialog handler for both confirm and alert
    let dialogCount = 0
    page.on('dialog', async (dialog) => {
      if (dialogCount === 0) {
        // First dialog: confirm deletion
        expect(dialog.type()).toBe('confirm')
        await dialog.accept()
      } else {
        // Second dialog: success alert
        expect(dialog.type()).toBe('alert')
        await dialog.accept()
      }
      dialogCount++
    })

    // Find the rule row and click Delete button
    const row = page.locator('tr', { hasText: 'temp-branch' })
    await row.getByRole('button', { name: /Delete|删除/i }).click()

    // Wait for deletion
    await page.waitForTimeout(2000)

    // Verify rule no longer appears
    await expect(page.getByRole('cell', { name: 'temp-branch' })).not.toBeVisible()
  })

  test('should validate branch pattern is required', async ({ page }) => {
    // Navigate to branch protection settings
    await page.goto(`/projects/${projectId}/settings/branch-protection`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Wait for page to fully render
    await page.waitForTimeout(1000)

    // Click "Create Rule" button
    await page.getByRole('button', { name: /Create.*Rule|创建.*规则/i }).click()

    // Wait for dialog to open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Set up dialog handler for alert()
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert')
      expect(dialog.message()).toMatch(/branch.*pattern|分支.*模式|分支.*名称/i)
      await dialog.accept()
    })

    // Leave branch pattern empty and try to submit
    await page.locator('#branchPattern').fill('')
    await page.getByRole('button', { name: /创建保护规则|Create.*Rule/i }).click()

    // Wait for validation alert
    await page.waitForTimeout(1000)

    // Dialog should still be open (validation failed)
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('should validate required approvals range (0-10)', async ({ page }) => {
    // Navigate to branch protection settings
    await page.goto(`/projects/${projectId}/settings/branch-protection`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Wait for page to fully render
    await page.waitForTimeout(1000)

    // Click "Create Rule" button
    await page.getByRole('button', { name: /Create.*Rule|创建.*规则/i }).click()

    // Wait for dialog to open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Fill in branch pattern (required field) using ID
    await page.locator('#branchPattern').fill('test-branch')

    // Set invalid requiredApprovals value (> 10) using ID
    await page.locator('#requiredApprovals').fill('15')

    // Set up dialog handler for alert()
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert')
      expect(dialog.message()).toMatch(/0.*10/i)
      await dialog.accept()
    })

    // Try to submit
    await page.getByRole('button', { name: /创建保护规则|Create.*Rule/i }).click()

    // Wait for validation alert
    await page.waitForTimeout(1000)

    // Dialog should still be open (validation failed)
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
