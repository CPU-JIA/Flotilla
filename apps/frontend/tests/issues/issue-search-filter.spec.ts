/**
 * Issue Search & Filter E2E Tests
 *
 * Tests State filtering functionality:
 * - Filter by OPEN state
 * - Filter by CLOSED state
 * - Show ALL issues
 * - Display correct issue counts in tabs
 *
 * ECP-D1: Testability - Comprehensive E2E coverage
 * Technical Implementation:
 * - Tabs component for state filtering (OPEN/CLOSED/ALL)
 * - Client-side filtering via useEffect + filter()
 * - Issue list at /projects/:id/issues
 *
 * NOTE: Text search and advanced filters (Labels, Milestones, Assignees) are not implemented in UI
 */

import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

test.describe('Issue Search & Filter', () => {
  // Use jia user (SUPER_ADMIN) to avoid project creation limits
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  }

  let projectId: string

  // Setup: Login and create project before each test
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.getByLabel(/用户名|Username/i).fill(testUser.username)
    await page.getByLabel(/密码|Password/i).fill(testUser.password)
    await page.getByRole('button', { name: /登录|Login/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Create test project
    await page.goto('/projects')
    await page.getByRole('button', { name: /创建.*项目|Create.*Project/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    const projectName = `Test Project for Issue Filter ${Date.now()}`
    await page.getByLabel(/项目名称|Project Name/i).fill(projectName)
    await page.getByLabel(/项目描述|Description/i).fill('Test project for issue filter E2E tests')

    const createButton = page.getByRole('button', { name: /创建|Create/i }).last()
    await createButton.waitFor({ state: 'visible', timeout: 5000 })
    await createButton.click()

    // Wait for redirect to project detail page
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 10000 })
    const url = page.url()
    const match = url.match(/\/projects\/([^/]+)/)
    projectId = match?.[1] || ''
    expect(projectId).toBeTruthy()
  })

  test('should filter issues by state (OPEN/CLOSED/ALL)', async ({ page }) => {
    // Create 3 issues via API: 2 OPEN, 1 CLOSED
    const token = await page.evaluate(() => localStorage.getItem('accessToken'))

    // Issue 1: OPEN
    await page.request.post(`http://localhost:4000/api/projects/${projectId}/issues`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: 'Open Issue 1 - Bug Fix Needed',
        body: 'This issue is still open',
      },
    })

    // Issue 2: OPEN
    await page.request.post(`http://localhost:4000/api/projects/${projectId}/issues`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: 'Open Issue 2 - Feature Request',
        body: 'This issue is still open',
      },
    })

    // Issue 3: Create as OPEN, then close it
    const response3 = await page.request.post(
      `http://localhost:4000/api/projects/${projectId}/issues`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          title: 'Closed Issue 1 - Completed Task',
          body: 'This issue is closed',
        },
      }
    )
    const issue3Data = await response3.json()
    const issue3Number = issue3Data.number

    // Close Issue 3
    await page.request.post(
      `http://localhost:4000/api/projects/${projectId}/issues/${issue3Number}/close`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    // Navigate to issues page
    await page.goto(`/projects/${projectId}/issues`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Verify page title
    await expect(page.getByRole('heading', { name: /Issues|问题/i }).first()).toBeVisible({
      timeout: 5000,
    })

    // Test 1: OPEN tab (default) - should show 2 issues
    const openTab = page.getByRole('tab', { name: /Open|开放/i })
    await expect(openTab).toBeVisible()
    // NOTE: Tab uses [selected] attribute (aria-selected), not data-state

    // Verify OPEN tab count
    await expect(openTab).toContainText('2')

    // Verify 2 OPEN issues displayed
    await expect(page.locator('text=Open Issue 1 - Bug Fix Needed')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Open Issue 2 - Feature Request')).toBeVisible()

    // Verify CLOSED issue NOT displayed
    await expect(page.locator('text=Closed Issue 1 - Completed Task')).not.toBeVisible()

    // Test 2: Click CLOSED tab - should show 1 issue
    const closedTab = page.getByRole('tab', { name: /Closed|关闭/i })
    await closedTab.click()

    // Verify CLOSED tab count
    await expect(closedTab).toContainText('1')

    // Verify 1 CLOSED issue displayed
    await expect(page.locator('text=Closed Issue 1 - Completed Task')).toBeVisible({
      timeout: 5000,
    })

    // Verify OPEN issues NOT displayed
    await expect(page.locator('text=Open Issue 1 - Bug Fix Needed')).not.toBeVisible()
    await expect(page.locator('text=Open Issue 2 - Feature Request')).not.toBeVisible()

    // Test 3: Click ALL tab - should show 3 issues
    const allTab = page.getByRole('tab', { name: /All|全部/i })
    await allTab.click()

    // Verify ALL tab count
    await expect(allTab).toContainText('3')

    // Verify all 3 issues displayed
    await expect(page.locator('text=Open Issue 1 - Bug Fix Needed')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Open Issue 2 - Feature Request')).toBeVisible()
    await expect(page.locator('text=Closed Issue 1 - Completed Task')).toBeVisible()
  })

  test('should display correct state badges in issue list', async ({ page }) => {
    // Create 1 OPEN and 1 CLOSED issue
    const token = await page.evaluate(() => localStorage.getItem('accessToken'))

    await page.request.post(`http://localhost:4000/api/projects/${projectId}/issues`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: 'Test Open Issue',
        body: 'This issue is open',
      },
    })

    const response2 = await page.request.post(
      `http://localhost:4000/api/projects/${projectId}/issues`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          title: 'Test Closed Issue',
          body: 'This issue is closed',
        },
      }
    )
    const issue2Data = await response2.json()
    await page.request.post(
      `http://localhost:4000/api/projects/${projectId}/issues/${issue2Data.number}/close`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    // Navigate to ALL issues tab
    await page.goto(`/projects/${projectId}/issues`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    const allTab = page.getByRole('tab', { name: /All|全部/i })
    await allTab.click()

    // Verify OPEN badge
    const openIssueRow = page.locator('text=Test Open Issue').locator('..')
    await expect(openIssueRow.getByText(/Open|开放/i).first()).toBeVisible()

    // Verify CLOSED badge
    const closedIssueRow = page.locator('text=Test Closed Issue').locator('..')
    await expect(closedIssueRow.getByText(/Closed|关闭/i).first()).toBeVisible()
  })
})
