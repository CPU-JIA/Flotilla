import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

/**
 * 个人设置功能自动化测试
 * 测试用户资料编辑和密码修改功能
 * ECP-D1: 可测试性设计 - 完整的E2E测试覆盖
 */

test.describe('个人设置功能测试', () => {
  const testUser = {
    username: TEST_USERS.testuser.username,
    password: TEST_USERS.testuser.password,
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

  test('应该能够从Dashboard导航到个人设置页面', async ({ page }) => {
    // 点击个人设置卡片
    await page.getByText('个人设置').first().click()

    // 验证跳转到设置页面
    await expect(page).toHaveURL(/\/settings/, { timeout: 5000 })

    // 验证页面标题
    await expect(page.getByRole('heading', { name: '个人设置' })).toBeVisible()
  })

  test('应该正确显示个人设置页面内容', async ({ page }) => {
    await page.goto('/settings')

    // 验证基本信息部分
    await expect(page.getByRole('heading', { name: '基本信息' })).toBeVisible()
    await expect(page.getByLabel('用户名')).toBeVisible()
    await expect(page.getByLabel('邮箱地址')).toBeVisible()
    await expect(page.getByLabel('个人简介')).toBeVisible()
    await expect(page.getByLabel('头像URL')).toBeVisible()

    // 验证密码修改部分
    await expect(page.getByRole('heading', { name: '修改密码' })).toBeVisible()
    await expect(page.getByLabel('当前密码')).toBeVisible()
    await expect(page.locator('#newPassword')).toBeVisible()
    await expect(page.getByLabel('确认新密码')).toBeVisible()
  })

  test('应该能够更新个人简介', async ({ page }) => {
    await page.goto('/settings')

    // 获取个人简介输入框
    const bioTextarea = page.getByLabel('个人简介')

    // 更新个人简介
    const newBio = `测试简介更新 - ${Date.now()}`
    await bioTextarea.clear()
    await bioTextarea.fill(newBio)

    // 点击保存按钮
    await page.getByRole('button', { name: /保存修改/i }).click()

    // 验证成功提示
    await expect(page.getByText(/更新成功/i)).toBeVisible({ timeout: 5000 })
  })

  test('应该验证用户名最小长度', async ({ page }) => {
    await page.goto('/settings')

    // 尝试输入过短的用户名
    const usernameInput = page.getByLabel('用户名')
    await usernameInput.clear()
    await usernameInput.fill('ab') // 少于3个字符

    // 点击保存按钮
    await page.getByRole('button', { name: /保存修改/i }).click()

    // 验证错误提示（HTML5验证或自定义验证）
    // 由于是required minLength=3，浏览器会阻止提交
    const validationMessage = await usernameInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    )
    expect(validationMessage).not.toBe('')
  })

  test('应该显示密码要求提示', async ({ page }) => {
    await page.goto('/settings')

    // 验证密码要求提示
    await expect(page.getByText('密码要求：')).toBeVisible()
    await expect(page.getByText(/至少8个字符/)).toBeVisible()
    await expect(page.getByText(/包含至少一个大写字母/)).toBeVisible()
    await expect(page.getByText(/包含至少一个小写字母/)).toBeVisible()
    await expect(page.getByText(/包含至少一个数字/)).toBeVisible()
  })

  test('应该验证新密码不能为空', async ({ page }) => {
    await page.goto('/settings')

    // 填写当前密码但不填写新密码
    await page.getByLabel('当前密码').fill(testUser.password)

    // 点击修改密码按钮
    await page.getByRole('button', { name: /修改密码/i }).click()

    // 验证HTML5 required验证阻止提交
    const newPasswordInput = page.locator('#newPassword')
    const validationMessage = await newPasswordInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    )
    expect(validationMessage).not.toBe('')
  })

  test('应该验证两次输入的新密码必须一致', async ({ page }) => {
    await page.goto('/settings')

    // 填写表单
    await page.getByLabel('当前密码').fill(testUser.password)
    await page.locator('#newPassword').fill('NewPassword123')
    await page.getByLabel('确认新密码').fill('DifferentPassword123')

    // 点击修改密码按钮
    await page.getByRole('button', { name: /修改密码/i }).click()

    // 验证错误提示
    await expect(page.getByText(/两次输入的新密码不一致/i)).toBeVisible({ timeout: 3000 })
  })

  test('应该验证邮箱地址为只读', async ({ page }) => {
    await page.goto('/settings')

    // 验证邮箱输入框为禁用状态
    const emailInput = page.getByLabel('邮箱地址')
    await expect(emailInput).toBeDisabled()

    // 验证提示文字
    await expect(page.getByText('邮箱地址不支持修改')).toBeVisible()
  })

  test('应该显示字符计数器', async ({ page }) => {
    await page.goto('/settings')

    // 输入一些文本
    const bioTextarea = page.getByLabel('个人简介')
    await bioTextarea.clear()
    await bioTextarea.fill('测试文本')

    // 验证字符计数器更新
    await expect(page.getByText(/\d+ \/ 500 字符/)).toBeVisible()
  })

  test('未登录用户应该被重定向到登录页', async ({ page, context }) => {
    // 清除所有cookie和localStorage（模拟未登录状态）
    await context.clearCookies()
    await page.evaluate(() => localStorage.clear())

    // 尝试访问设置页面
    await page.goto('/settings')

    // 应该被重定向到登录页
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
  })
})
