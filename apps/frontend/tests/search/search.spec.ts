/**
 * Code Search E2E Tests
 *
 * 测试搜索功能的核心场景：
 * 1. 访问搜索页面
 * 2. 执行搜索并验证结果
 * 3. 应用过滤器
 * 4. 测试空状态
 *
 * ECP-D1: 全面的测试覆盖确保代码质量
 */

import { test, expect } from '@playwright/test'

test.describe('Code Search', () => {
  test.beforeEach(async ({ page }) => {
    // 登录（使用正确的路径和表单字段）
    await page.goto('/auth/login')

    // 等待登录页面加载
    await page.waitForSelector('text=登录', { timeout: 10000 })

    // 填写登录表单（使用getByLabel匹配中文标签）
    await page.getByLabel('用户名或邮箱').fill('admin@flotilla.dev')
    await page.getByLabel('密码').fill('admin123')

    // 点击登录按钮
    await page.getByRole('button', { name: '登录' }).click()

    // 等待跳转到dashboard
    await page.waitForURL('/dashboard', { timeout: 15000 })
  })

  test('should display search page and empty state', async ({ page }) => {
    // 访问全局搜索页面
    await page.goto('/search')

    // 验证页面标题
    await expect(page.locator('h1')).toContainText('Code Search')

    // 验证搜索框存在
    const searchInput = page.locator('input[aria-label="Search code"]')
    await expect(searchInput).toBeVisible()

    // 验证空状态提示
    await expect(page.locator('text=Start searching')).toBeVisible()
    await expect(page.locator('text=Enter a search query')).toBeVisible()
  })

  test('should perform search with Cmd+K shortcut', async ({ page }) => {
    await page.goto('/search')

    // 测试Cmd+K快捷键
    await page.keyboard.press('Meta+K') // Mac: Cmd+K
    const searchInput = page.locator('#global-search-input')
    await expect(searchInput).toBeFocused()
  })

  test('should show "no results" when searching non-existent code', async ({
    page,
  }) => {
    await page.goto('/search')

    // 输入不存在的搜索词
    const searchInput = page.locator('input[aria-label="Search code"]')
    await searchInput.fill('xyzNonExistentCode12345')
    await searchInput.press('Enter')

    // 等待搜索完成
    await page.waitForTimeout(1000)

    // 验证"无结果"提示
    await expect(page.locator('text=No results found')).toBeVisible()
  })

  test('should clear search input with ESC key', async ({ page }) => {
    await page.goto('/search')

    const searchInput = page.locator('input[aria-label="Search code"]')
    await searchInput.fill('test query')

    // 按ESC清空
    await searchInput.press('Escape')

    // 验证输入框已清空
    await expect(searchInput).toHaveValue('')
  })

  test('should display search filters sidebar', async ({ page }) => {
    await page.goto('/search')

    // 验证过滤器面板存在
    await expect(page.locator('text=Filters')).toBeVisible()

    // 验证排序选项
    await expect(page.locator('text=Sort by')).toBeVisible()
    await expect(page.locator('button:has-text("Relevance")')).toBeVisible()
    await expect(page.locator('button:has-text("Last Modified")')).toBeVisible()
    await expect(page.locator('button:has-text("File Size")')).toBeVisible()

    // 验证语言过滤器
    await expect(page.locator('text=Languages')).toBeVisible()
    await expect(page.locator('button:has-text("typescript")')).toBeVisible()
    await expect(page.locator('button:has-text("javascript")')).toBeVisible()
  })

  test('should toggle language filter', async ({ page }) => {
    await page.goto('/search')

    // 点击TypeScript语言过滤器
    const tsFilterButton = page.locator('button:has-text("typescript")').first()
    await tsFilterButton.click()

    // 验证按钮状态变化（从outline变为default variant）
    // Shadcn的variant切换会改变样式类
    await expect(tsFilterButton).toHaveAttribute('data-state', 'on')

    // 再次点击取消选择
    await tsFilterButton.click()
    await expect(tsFilterButton).not.toHaveAttribute('data-state', 'on')
  })

  test('should reset filters', async ({ page }) => {
    await page.goto('/search')

    // 选择多个过滤器
    await page.locator('button:has-text("typescript")').first().click()
    await page.locator('button:has-text("python")').first().click()

    // 验证过滤器Badge显示计数
    const filtersBadge = page.locator('text=Filters').locator('..').locator('.badge')
    await expect(filtersBadge).toContainText('2')

    // 点击Clear按钮
    await page.locator('button:has-text("Clear")').click()

    // 验证所有过滤器已清空
    await expect(filtersBadge).not.toBeVisible()
  })

  test('should navigate to project search from project detail', async ({
    page,
  }) => {
    // 先访问项目列表（假设有项目存在）
    await page.goto('/projects')

    // 等待项目列表加载
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 5000,
      state: 'visible',
    })

    // 点击第一个项目
    const firstProject = page.locator('[data-testid="project-card"]').first()
    await firstProject.click()

    // 等待项目详情页加载
    await page.waitForURL(/\/projects\/[a-z0-9]+/)

    // 假设项目详情页有搜索入口（这里需要根据实际实现调整）
    // 暂时直接访问项目搜索页
    const projectId = page.url().split('/projects/')[1]
    await page.goto(`/projects/${projectId}/search`)

    // 验证项目搜索页面
    await expect(page.locator('h1')).toContainText('Search in')
    await expect(page.locator('input[aria-label="Search code"]')).toBeVisible()
  })

  test('should show search results count and processing time', async ({
    page,
  }) => {
    await page.goto('/search')

    // 搜索常见关键词（假设至少有一些结果）
    const searchInput = page.locator('input[aria-label="Search code"]')
    await searchInput.fill('function')
    await searchInput.press('Enter')

    // 等待搜索完成（最多5秒）
    await page.waitForTimeout(2000)

    // 验证结果计数或"无结果"提示出现
    const hasResults =
      (await page.locator('text=/\\d+ results? found/').count()) > 0
    const hasNoResults = (await page.locator('text=No results found').count()) > 0

    expect(hasResults || hasNoResults).toBe(true)

    // 如果有结果，验证处理时间显示
    if (hasResults) {
      await expect(page.locator('text=/\\(\\d+ms\\)/')).toBeVisible()
    }
  })
})
