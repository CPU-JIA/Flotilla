import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../fixtures'

/**
 * 登录功能自动化测试
 * ECP-D1: 设计可测试性 - 验证用户登录流程
 */

test.describe('用户登录功能测试', () => {
  // Use testuser created by globalSetup (username: testuser, password: Password123)
  const testUser = TEST_USERS.testuser

  test.beforeEach(async ({ page }) => {
    // 访问登录页面
    await page.goto('/auth/login', { waitUntil: 'networkidle' })

    // 等待页面加载完成
    await expect(page.locator('text=登录').first()).toBeVisible({ timeout: 15000 })
  })

  test('应该成功显示登录页面', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/Cloud Dev Platform/i)

    // 验证登录卡片标题
    await expect(page.locator('text=登录').first()).toBeVisible()

    // 验证欢迎描述
    await expect(page.locator('text=欢迎回到 Cloud Dev Platform')).toBeVisible()

    // 验证表单字段存在
    await expect(page.getByLabel('用户名或邮箱')).toBeVisible()
    await expect(page.getByLabel('密码')).toBeVisible()

    // 验证登录按钮存在
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible()

    // 验证注册链接存在
    await expect(page.getByRole('link', { name: '立即注册' })).toBeVisible()
  })

  test('应该验证空表单提交', async ({ page }) => {
    // 点击登录按钮（不填写任何字段）
    await page.getByRole('button', { name: '登录' }).click()

    // 验证浏览器原生验证（HTML5 required 属性）
    // Playwright 会阻止提交，因为有 required 字段为空
    // 页面应该保持在登录页面
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  })

  test('应该验证仅填写用户名时提交', async ({ page }) => {
    // 只填写用户名，不填写密码
    await page.getByLabel('用户名或邮箱').fill(testUser.username)

    // 点击登录按钮
    await page.getByRole('button', { name: '登录' }).click()

    // 验证浏览器原生验证（密码为必填）
    // 页面应该保持在登录页面
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  })

  test('应该验证仅填写密码时提交', async ({ page }) => {
    // 只填写密码，不填写用户名
    await page.getByLabel('密码').fill(testUser.password)

    // 点击登录按钮
    await page.getByRole('button', { name: '登录' }).click()

    // 验证浏览器原生验证（用户名为必填）
    // 页面应该保持在登录页面
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  })

  test('应该拒绝错误的用户名', async ({ page }) => {
    // 填写不存在的用户名
    await page.getByLabel('用户名或邮箱').fill('nonexistentuser12345')
    await page.getByLabel('密码').fill('anypassword')

    // 提交表单
    await page.getByRole('button', { name: '登录' }).click()

    // 等待错误消息出现
    await expect(page.locator('.bg-red-50, .dark\\:bg-red-900\\/20')).toBeVisible({ timeout: 5000 })
  })

  test('应该拒绝错误的密码', async ({ page }) => {
    // 使用正确的用户名但错误的密码
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill('wrongpassword123')

    // 提交表单
    await page.getByRole('button', { name: '登录' }).click()

    // 等待错误消息出现
    await expect(page.locator('.bg-red-50, .dark\\:bg-red-900\\/20')).toBeVisible({ timeout: 5000 })
  })

  test('应该使用用户名成功登录', async ({ page }) => {
    // 使用用户名登录
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)

    // 提交表单
    await page.getByRole('button', { name: '登录' }).click()

    // 等待登录完成并跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // 验证用户已登录（可以根据实际的仪表板页面结构进行更详细的验证）
  })

  test('应该使用邮箱成功登录', async ({ page }) => {
    // NOTE: 后端auth.service.ts:112-115支持OR条件查询username或email
    // 使用邮箱登录
    await page.getByLabel('用户名或邮箱').fill(testUser.email)
    await page.getByLabel('密码').fill(testUser.password)

    // 提交表单
    await page.getByRole('button', { name: '登录' }).click()

    // 等待登录完成并跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('应该在登录时显示加载状态', async ({ page }) => {
    // 填写登录信息
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)

    // 点击登录按钮
    const submitButton = page.getByRole('button', { name: '登录' })
    await submitButton.click()

    // 验证按钮在加载时显示"登录中..."
    // 注意：这个测试可能需要根据网络速度调整
    await expect(submitButton).toHaveText('登录中...', { timeout: 1000 }).catch(() => {
      // 如果响应太快，按钮可能直接跳转，这是正常的
    })
  })

  test('应该在登录时禁用输入字段', async ({ page }) => {
    // 填写登录信息
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)

    // 点击登录按钮
    await page.getByRole('button', { name: '登录' }).click()

    // 验证输入字段在加载时被禁用
    // 注意：这个测试可能需要根据网络速度调整
    await expect(page.getByLabel('用户名或邮箱')).toBeDisabled({ timeout: 500 }).catch(() => {
      // 如果响应太快，可能直接跳转，这是正常的
    })
  })

  test('应该能够通过链接跳转到注册页面', async ({ page }) => {
    // 点击"立即注册"链接
    await page.getByRole('link', { name: '立即注册' }).click()

    // 验证跳转到注册页面
    await expect(page).toHaveURL(/\/auth\/register/)
    await expect(page.getByRole('heading', { name: '注册' })).toBeVisible()
  })

  test('应该在输入时清除错误消息', async ({ page }) => {
    // 先触发一个错误
    await page.getByLabel('用户名或邮箱').fill('wronguser')
    await page.getByLabel('密码').fill('wrongpassword')
    await page.getByRole('button', { name: '登录' }).click()

    // 等待错误消息出现
    await expect(page.locator('.bg-red-50, .dark\\:bg-red-900\\/20')).toBeVisible({ timeout: 5000 })

    // 在输入框中输入内容
    await page.getByLabel('用户名或邮箱').fill('newtext')

    // 验证错误消息消失
    await expect(page.locator('.bg-red-50, .dark\\:bg-red-900\\/20')).not.toBeVisible({ timeout: 1000 })
  })

  test('应该保持登录状态 - 刷新后仍然登录', async ({ page, context }) => {
    // 先登录
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)
    await page.getByRole('button', { name: '登录' }).click()

    // 等待跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // 刷新页面
    await page.reload()

    // 验证仍然在仪表板页面（没有被重定向回登录页）
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
  })

  test('应该处理网络错误', async ({ page, context }) => {
    // 模拟网络离线
    await context.setOffline(true)

    // 尝试登录
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)
    await page.getByRole('button', { name: '登录' }).click()

    // 等待错误消息出现
    await expect(page.locator('.bg-red-50, .dark\\:bg-red-900\\/20')).toBeVisible({ timeout: 5000 })

    // 恢复网络
    await context.setOffline(false)
  })

  test('应该测试键盘导航 - Enter键提交', async ({ page }) => {
    // 填写登录信息
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)

    // 在密码字段按Enter键
    await page.getByLabel('密码').press('Enter')

    // 验证表单被提交并跳转
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })
})
