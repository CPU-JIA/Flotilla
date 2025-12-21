/**
 * Issue CRUD Operations E2E Tests
 *
 * Tests core Issue functionality:
 * - Create issue with title and body
 * - View issue details
 * - Close and reopen issue
 * - Delete issue
 *
 * ECP-D1: Testability - Comprehensive E2E coverage
 */

import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

test.describe('Issue CRUD Operations', () => {
  // Use jia user (SUPER_ADMIN) to avoid project creation limits
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  }

  const timestamp = Date.now()
  const testIssue = {
    title: `Test Issue ${timestamp}`,
    body: 'This is a **test** issue with Markdown support',
  }

  let projectId: string
  let _issueNumber: number

  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel(/用户名|Username/i).fill(testUser.username)
    await page.getByLabel(/密码|Password/i).fill(testUser.password)
    await page.getByRole('button', { name: /登录|Login/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Create a test project for issue operations
    await page.goto('/projects')
    await page.getByRole('button', { name: /创建.*项目|Create.*Project/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // Generate unique project name for each test to avoid "duplicate name" errors
    const projectName = `Test Project for Issues ${Date.now()}`
    await page.getByLabel(/项目名称|Project Name/i).fill(projectName)
    await page.getByLabel(/项目描述|Description/i).fill('Test project for issue E2E tests')

    // Wait for button to be enabled before clicking (avoid clicking while isCheckingLimit=true)
    const createButton = page.getByRole('button', { name: /创建|Create/i }).last()
    await createButton.waitFor({ state: 'visible', timeout: 5000 })
    await expect(createButton).toBeEnabled({ timeout: 5000 })
    await createButton.click()

    // Wait for redirect and extract project ID from URL
    await page.waitForURL(/\/projects\/[^\/]+/, { timeout: 10000 })
    const url = page.url()
    projectId = url.match(/\/projects\/([^\/]+)/)?.[1] || ''
    expect(projectId).toBeTruthy()
  })

  test('should display issues list page', async ({ page }) => {
    await page.goto(`/projects/${projectId}/issues`)

    // Verify page title
    await expect(page.locator('h1, h2').filter({ hasText: /Issues/i })).toBeVisible({
      timeout: 5000,
    })

    // Verify "New Issue" button exists (use .first() to avoid strict mode violation)
    await expect(page.getByRole('button', { name: /新建|New.*Issue/i }).first()).toBeVisible({
      timeout: 5000,
    })
  })

  test('should create a new issue with title and body', async ({ page }) => {
    await page.goto(`/projects/${projectId}/issues/new`)

    // Fill in title
    await page.getByLabel(/Title/i).fill(testIssue.title)

    // Fill in body (Markdown editor)
    // Click Write tab first (may already be active)
    const writeTab = page.getByRole('tab', { name: /Write/i })
    if (await writeTab.isVisible()) {
      await writeTab.click()
    }

    // Fill description - use specific placeholder to avoid ambiguity with title field
    await page.getByPlaceholder(/Detailed description/i).fill(testIssue.body)

    // Submit form
    await page.getByRole('button', { name: /Create Issue/i }).click()

    // Verify redirect to issue detail page
    await expect(page).toHaveURL(/\/issues\/\d+/, { timeout: 10000 })

    // Extract issue number from URL
    const url = page.url()
    const match = url.match(/\/issues\/(\d+)/)
    expect(match).toBeTruthy()
    issueNumber = parseInt(match![1])

    // Verify issue details displayed
    await expect(page.getByRole('heading').filter({ hasText: testIssue.title })).toBeVisible({
      timeout: 5000,
    })

    // Verify Markdown rendered (bold text)
    await expect(page.locator('strong').filter({ hasText: 'test' })).toBeVisible({
      timeout: 5000,
    })
  })

  test('should display issue details correctly', async ({ page }) => {
    // First create an issue
    await page.goto(`/projects/${projectId}/issues/new`)
    await page.getByLabel(/Title/i).fill(testIssue.title)
    const writeTab = page.getByRole('tab', { name: /Write/i })
    if (await writeTab.isVisible()) {
      await writeTab.click()
    }
    await page.getByPlaceholder(/Detailed description/i).fill(testIssue.body)
    await page.getByRole('button', { name: /Create Issue/i }).click()

    // Wait for redirect
    await expect(page).toHaveURL(/\/issues\/\d+/, { timeout: 10000 })

    // Verify title
    await expect(page.locator('h1').filter({ hasText: testIssue.title })).toBeVisible()

    // Verify body content
    await expect(page.locator('strong').filter({ hasText: 'test' })).toBeVisible()

    // Verify OPEN badge (use specific selector to avoid "Opened by" text)
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: /^Open$/i })).toBeVisible()
  })

  test('should close an issue', async ({ page }) => {
    // Create an issue first
    await page.goto(`/projects/${projectId}/issues/new`)
    await page.getByLabel(/Title/i).fill(`Issue to Close ${timestamp}`)
    await page.getByRole('button', { name: /Create Issue/i }).click()
    await expect(page).toHaveURL(/\/issues\/\d+/, { timeout: 10000 })

    // Click Close button
    await page.getByRole('button', { name: /Close.*Issue/i }).click()

    // Verify CLOSED badge appears (use specific selector)
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: /^Closed$/i })).toBeVisible({ timeout: 5000 })

    // Verify Reopen button appears
    await expect(page.getByRole('button', { name: /Reopen/i })).toBeVisible()
  })

  test('should reopen a closed issue', async ({ page }) => {
    // Create and close an issue
    await page.goto(`/projects/${projectId}/issues/new`)
    await page.getByLabel(/Title/i).fill(`Issue to Reopen ${timestamp}`)
    await page.getByRole('button', { name: /Create Issue/i }).click()
    await expect(page).toHaveURL(/\/issues\/\d+/, { timeout: 10000 })
    await page.getByRole('button', { name: /Close.*Issue/i }).click()
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: /^Closed$/i })).toBeVisible({ timeout: 5000 })

    // Click Reopen button
    await page.getByRole('button', { name: /Reopen/i }).click()

    // Verify OPEN badge appears (use specific selector)
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: /^Open$/i })).toBeVisible({ timeout: 5000 })

    // Verify Close button appears again
    await expect(page.getByRole('button', { name: /Close.*Issue/i })).toBeVisible()
  })

  test('should delete an issue', async ({ page }) => {
    // Create an issue
    await page.goto(`/projects/${projectId}/issues/new`)
    await page.getByLabel(/Title/i).fill(`Issue to Delete ${timestamp}`)
    await page.getByRole('button', { name: /Create Issue/i }).click()
    await expect(page).toHaveURL(/\/issues\/\d+/, { timeout: 10000 })
    const issueUrl = page.url()

    // Setup dialog handler (confirm deletion)
    page.on('dialog', (dialog) => dialog.accept())

    // Click Delete button
    await page.getByRole('button', { name: /Delete.*Issue/i }).click()

    // Wait for redirect to issues list
    await expect(page).toHaveURL(/\/projects\/.*\/issues$/, { timeout: 10000 })

    // Verify cannot access deleted issue (should 404)
    await page.goto(issueUrl)
    await expect(page.locator('text=/not found|Issue not found/i')).toBeVisible({ timeout: 5000 })
  })
})
