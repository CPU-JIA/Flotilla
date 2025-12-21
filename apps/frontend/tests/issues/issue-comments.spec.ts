/**
 * Issue Comments E2E Tests
 *
 * Tests Issue Comments functionality:
 * - Create comment with Markdown support
 * - Edit comment
 * - Delete comment with confirmation
 * - Markdown content rendering (code blocks, bold, links)
 * - Comment timeline display and sorting
 *
 * ECP-D1: Testability - Comprehensive E2E coverage
 * Technical Implementation:
 * - CommentForm component (textarea + submit/update/cancel buttons)
 * - CommentsList component (timeline with edit/delete actions)
 * - MarkdownPreview for rendering
 */

import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

test.describe('Issue Comments', () => {
  // Use jia user (SUPER_ADMIN) to avoid project creation limits
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  }

  const timestamp = Date.now()
  let projectId: string
  let _issueNumber: number

  // Setup: Login and create project + issue before each test
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

    const projectName = `Test Project for Comments ${Date.now()}`
    await page.getByLabel(/项目名称|Project Name/i).fill(projectName)
    await page.getByLabel(/项目描述|Description/i).fill('Test project for comment E2E tests')

    const createButton = page.getByRole('button', { name: /创建|Create/i }).last()
    await createButton.waitFor({ state: 'visible', timeout: 5000 })
    await expect(createButton).toBeEnabled({ timeout: 5000 })
    await createButton.click()

    // Extract project ID from URL
    await page.waitForURL(/\/projects\/[^\/]+/, { timeout: 10000 })
    const url = page.url()
    projectId = url.match(/\/projects\/([^\/]+)/)?.[1] || ''
    expect(projectId).toBeTruthy()

    // Create test issue
    await page.goto(`/projects/${projectId}/issues/new`)
    await page.getByLabel(/Title/i).fill(`Test Issue for Comments ${timestamp}`)
    await page.getByPlaceholder(/Detailed description/i).fill('This issue is for testing comments')
    await page.getByRole('button', { name: /Create Issue/i }).click()

    // Wait for redirect and extract issue number
    await expect(page).toHaveURL(/\/issues\/\d+/, { timeout: 10000 })
    const issueUrl = page.url()
    const match = issueUrl.match(/\/issues\/(\d+)/)
    expect(match).toBeTruthy()
    issueNumber = parseInt(match![1])

    // Verify we're on the issue detail page
    await expect(page.getByRole('heading').filter({ hasText: /Test Issue for Comments/ })).toBeVisible({
      timeout: 5000,
    })
  })

  test('should create a comment and display it in timeline', async ({ page }) => {
    // Verify "Add a comment" section exists
    await expect(page.getByRole('heading', { name: /Add a comment/i })).toBeVisible({ timeout: 5000 })

    // Fill comment form - locate textarea by role
    const commentText = 'This is my first comment on this issue'
    await page.getByRole('textbox', { name: /留下评论|Leave a comment/i }).fill(commentText)

    // Submit comment
    await page.getByRole('button', { name: /评论|Comment/i }).click()

    // Verify comment appears in timeline with author username
    await expect(page.locator('text=' + testUser.username).first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=' + commentText)).toBeVisible({ timeout: 3000 })

    // Verify comment count updated (Comments (1))
    await expect(page.getByRole('heading', { name: /Comments.*\(1\)/i })).toBeVisible({ timeout: 3000 })
  })

  test('should edit an existing comment', async ({ page }) => {
    // Create initial comment
    const initialText = 'Initial comment text'
    await page.getByRole('textbox', { name: /留下评论|Leave a comment/i }).fill(initialText)
    await page.getByRole('button', { name: /评论|Comment/i }).click()
    await expect(page.locator('text=' + initialText)).toBeVisible({ timeout: 5000 })

    // Click Edit button (Edit icon button)
    await page.getByRole('button', { name: /Edit|编辑/i }).first().click()

    // Verify edit mode - Cancel button should appear
    await page.getByRole('button', { name: /Cancel|取消/i }).waitFor({ timeout: 3000 })

    // Modify comment text - in edit mode, textarea already has text
    const updatedText = 'Updated comment text with modifications'
    const textarea = page.getByRole('textbox', { name: /留下评论|Leave a comment/i }).first()
    await textarea.clear()
    await textarea.fill(updatedText)

    // Click Update button
    await page.getByRole('button', { name: /更新|Update/i }).click()

    // Verify updated text displayed
    await expect(page.locator('text=' + updatedText)).toBeVisible({ timeout: 5000 })

    // Verify "(edited)" indicator appears
    await expect(page.locator('text=/\\(edited\\)/i')).toBeVisible({ timeout: 3000 })

    // Verify old text no longer visible
    await expect(page.locator('text=' + initialText)).not.toBeVisible()
  })

  test('should delete a comment with confirmation', async ({ page }) => {
    // Create comment to delete
    const commentToDelete = 'This comment will be deleted'
    await page.getByRole('textbox', { name: /留下评论|Leave a comment/i }).fill(commentToDelete)
    await page.getByRole('button', { name: /评论|Comment/i }).click()
    await expect(page.locator('text=' + commentToDelete)).toBeVisible({ timeout: 5000 })

    // Setup dialog handler to accept confirmation
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toMatch(/delete/i)
      await dialog.accept()
    })

    // Click Delete button (Trash icon button)
    await page.getByRole('button', { name: /Delete|删除/i }).first().click()

    // Wait for comment to be removed from DOM
    await page.waitForTimeout(2000)

    // Verify comment no longer visible
    await expect(page.locator('text=' + commentToDelete)).not.toBeVisible()

    // Verify Comments count decreased or shows (0)
    // Note: After deleting the only comment, "No comments" message should appear
    // But we just verify the comment is gone, as UI may vary
  })

  test('should render Markdown content correctly', async ({ page }) => {
    // Create comment with various Markdown elements
    const markdownComment = `
# Heading 1
## Heading 2

This is **bold text** and this is *italic text*.

Here is a code block:
\`\`\`javascript
function hello() {
  console.log("Hello World");
}
\`\`\`

And an inline code: \`const x = 42\`

- List item 1
- List item 2
- List item 3

[Link to example](https://example.com)
    `.trim()

    await page.getByRole('textbox', { name: /留下评论|Leave a comment/i }).fill(markdownComment)
    await page.getByRole('button', { name: /评论|Comment/i }).click()

    // Wait for comment to appear
    await page.waitForTimeout(2000)

    // Verify Markdown rendered as HTML
    // Bold text
    await expect(page.locator('strong').filter({ hasText: 'bold text' })).toBeVisible({ timeout: 5000 })

    // Italic text
    await expect(page.locator('em, i').filter({ hasText: 'italic text' })).toBeVisible()

    // Code block
    await expect(page.locator('pre code, code[class*="language-"]').filter({ hasText: /hello/ })).toBeVisible()

    // Inline code
    await expect(page.locator('code').filter({ hasText: 'const x = 42' })).toBeVisible()

    // List items
    await expect(page.locator('ul li, ol li').filter({ hasText: 'List item 1' })).toBeVisible()

    // Link
    await expect(page.locator('a[href="https://example.com"]').filter({ hasText: 'Link to example' })).toBeVisible()

    // Headings - use .first() to avoid strict mode violation
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'Heading' }).first()).toBeVisible()
  })

  test('should display comments in chronological order', async ({ page }) => {
    // Create multiple comments with delays to ensure different timestamps
    const comments = [
      'First comment',
      'Second comment',
      'Third comment',
    ]

    for (const comment of comments) {
      await page.getByRole('textbox', { name: /留下评论|Leave a comment/i }).fill(comment)
      await page.getByRole('button', { name: /评论|Comment/i }).click()
      await page.waitForTimeout(1500) // Delay to ensure different createdAt times
    }

    // Wait for all comments to be visible
    await expect(page.locator('text=Third comment')).toBeVisible({ timeout: 5000 })

    // Get all comment containers
    const commentContainers = page.locator('.border.rounded-lg.p-4') // CommentsList uses this class

    // Verify order: First comment should appear before Second, Second before Third
    const firstCommentIndex = await commentContainers.locator('text=First comment').first().evaluate((el) => {
      const parent = el.closest('.border.rounded-lg.p-4')
      const allComments = Array.from(document.querySelectorAll('.border.rounded-lg.p-4'))
      return parent ? allComments.indexOf(parent) : -1
    })

    const secondCommentIndex = await commentContainers.locator('text=Second comment').first().evaluate((el) => {
      const parent = el.closest('.border.rounded-lg.p-4')
      const allComments = Array.from(document.querySelectorAll('.border.rounded-lg.p-4'))
      return parent ? allComments.indexOf(parent) : -1
    })

    const thirdCommentIndex = await commentContainers.locator('text=Third comment').first().evaluate((el) => {
      const parent = el.closest('.border.rounded-lg.p-4')
      const allComments = Array.from(document.querySelectorAll('.border.rounded-lg.p-4'))
      return parent ? allComments.indexOf(parent) : -1
    })

    // Assert chronological order
    expect(firstCommentIndex).toBeLessThan(secondCommentIndex)
    expect(secondCommentIndex).toBeLessThan(thirdCommentIndex)

    // Verify relative time indicators exist (e.g., "just now", "1 minute ago")
    const relativeTimeIndicators = page.locator('text=/just now|ago|刚刚/i')
    await expect(relativeTimeIndicators.first()).toBeVisible({ timeout: 3000 })
  })
})
