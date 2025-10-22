import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

/**
 * 仪表板功能自动化测试
 * 测试用户登录后的主页功能
 */

test.describe('仪表板功能测试', () => {
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  }

  // 在每个测试前先登录
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/auth/login')
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)
    await page.getByRole('button', { name: '登录' }).click()

    // 等待跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('应该成功显示仪表板页面', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/Flotilla/i)

    // 验证导航栏存在
    await expect(page.locator('header')).toBeVisible()

    // 验证用户名显示（限定在header内避免匹配多个元素）
    await expect(page.locator('header').getByText(testUser.username).first()).toBeVisible()
  })

  test('应该显示导航菜单', async ({ page }) => {
    // 验证导航链接存在
    await expect(page.getByRole('link', { name: /仪表盘|Dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /项目|Projects/i }).first()).toBeVisible()
  })

  test('应该能够通过导航栏跳转到项目页面', async ({ page }) => {
    // 点击项目链接（使用first()避免匹配多个元素）
    await page
      .getByRole('link', { name: /项目|Projects/i })
      .first()
      .click()

    // 验证跳转到项目页面
    await expect(page).toHaveURL(/\/projects/, { timeout: 5000 })
  })

  test('应该显示登出按钮', async ({ page }) => {
    // 验证登出按钮存在
    await expect(page.getByRole('button', { name: /退出登录|Logout/i })).toBeVisible()
  })

  test('应该能够成功登出', async ({ page }) => {
    // 点击登出按钮
    await page.getByRole('button', { name: /退出登录|Logout/i }).click()

    // 验证跳转回登录页面
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
  })

  test('应该显示主题切换按钮', async ({ page }) => {
    // 验证主题切换按钮存在（Sun或Moon图标）
    const themeButton = page.locator('button').filter({ has: page.locator('svg') })
    await expect(themeButton.first()).toBeVisible()
  })

  test('应该显示语言切换按钮', async ({ page }) => {
    // 验证语言切换按钮存在
    const languageButton = page.getByRole('button').filter({ hasText: /EN|中/ })
    await expect(languageButton).toBeVisible()
  })

  test('未登录用户应该被重定向到登录页', async ({ page, context }) => {
    // 清除所有cookie和localStorage（模拟未登录状态）
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())

    // 尝试访问仪表板
    await page.goto('/dashboard')

    // 应该被重定向到登录页
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
  })
})
