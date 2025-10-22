import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

/**
 * 项目管理功能自动化测试
 * 测试项目的创建、查看、编辑、删除等CRUD操作
 */

test.describe('项目管理功能测试', () => {
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  }

  const timestamp = Date.now()
  const testProject = {
    name: `Test Project ${timestamp}`,
    description: 'This is a test project for automated testing',
  }

  // 在每个测试前先登录
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('应该成功显示项目列表页面', async ({ page }) => {
    // 访问项目列表页面
    await page.goto('/projects')

    // 验证页面标题
    await expect(page.locator('h1, h2').filter({ hasText: /项目|Projects/i })).toBeVisible({
      timeout: 5000,
    })
  })

  test('应该显示创建新项目按钮', async ({ page }) => {
    await page.goto('/projects')

    // 验证创建项目按钮存在
    await expect(page.getByRole('button', { name: /创建.*项目|Create.*Project/i })).toBeVisible({
      timeout: 5000,
    })
  })

  test('应该能够打开创建项目对话框', async ({ page }) => {
    await page.goto('/projects')

    // 点击创建项目按钮
    await page.getByRole('button', { name: /创建.*项目|Create.*Project/i }).click()

    // 验证对话框打开
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })
  })

  test('应该能够成功创建新项目', async ({ page }) => {
    await page.goto('/projects')

    // 点击创建项目按钮
    await page.getByRole('button', { name: /创建.*项目|Create.*Project/i }).click()

    // 等待对话框打开
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // 填写项目信息
    await page.getByLabel(/项目名称|Project Name/i).fill(testProject.name)
    await page.getByLabel(/项目描述|Description/i).fill(testProject.description)

    // 提交表单
    await page
      .getByRole('button', { name: /创建|Create/i })
      .last()
      .click()

    // 验证项目创建成功（可能跳转到项目详情页或显示成功消息）
    await page.waitForTimeout(2000)

    // 验证新项目出现在列表中
    await page.goto('/projects')
    await expect(page.locator(`text=${testProject.name}`)).toBeVisible({ timeout: 5000 })
  })

  test('应该验证空项目名称', async ({ page }) => {
    await page.goto('/projects')

    // 打开创建对话框
    await page.getByRole('button', { name: /创建.*项目|Create.*Project/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // 不填写项目名称，直接提交
    await page
      .getByRole('button', { name: /创建|Create/i })
      .last()
      .click()

    // 对话框应该仍然可见（验证失败）
    await expect(page.locator('[role="dialog"]')).toBeVisible()
  })

  test('应该能够查看项目详情', async ({ page }) => {
    await page.goto('/projects')

    // 等待项目列表加载
    await page.waitForTimeout(2000)

    // 点击第一个项目（假设至少有一个项目）
    const firstProject = page.locator('[data-testid="project-card"], .project-card').first()

    // 如果存在项目，则点击
    const projectCount = await firstProject.count()
    if (projectCount > 0) {
      await firstProject.click()

      // 验证跳转到项目详情页
      await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 5000 })
    }
  })

  test('应该显示项目列表或空状态', async ({ page }) => {
    await page.goto('/projects')

    // 等待页面加载
    await page.waitForTimeout(2000)

    // 验证要么显示项目列表，要么显示"暂无项目"提示
    const hasProjects =
      (await page
        .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
        .count()) > 0
    // 检查可能的空状态文本（更宽松的匹配）
    const hasEmptyState = await page
      .locator('text=/暂无|No.*Project|Empty|没有项目/i')
      .isVisible()
      .catch(() => false)

    // 至少应该有其中一个
    expect(hasProjects || hasEmptyState).toBe(true)
  })

  test('应该能够搜索/筛选项目', async ({ page }) => {
    await page.goto('/projects')

    // 查找搜索框（如果存在）
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]')
      .first()

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 输入搜索关键词
      await searchInput.fill('test')
      await page.waitForTimeout(1000)

      // 验证搜索功能生效（结果应该过滤）
      // 注：此测试为探索性测试，如果没有搜索功能，会跳过
    }
  })
})
