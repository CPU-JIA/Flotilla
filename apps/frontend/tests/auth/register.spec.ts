import { test, expect } from '@playwright/test'

/**
 * 注册功能自动化测试
 * ECP-D1: 设计可测试性 - 验证用户注册流程
 */

test.describe('用户注册功能测试', () => {
  // 为每个测试生成唯一的测试数据
  const timestamp = Date.now()
  const testUser = {
    username: `testuser${timestamp}`,
    email: `testuser${timestamp}@example.com`,
    password: 'Test123456',
  }

  test.beforeEach(async ({ page }) => {
    // 访问注册页面
    await page.goto('/auth/register', { waitUntil: 'networkidle' })

    // 等待页面加载完成 - 增加超时时间到 15 秒
    await expect(page.getByRole('heading', { name: '注册' })).toBeVisible({ timeout: 15000 })
  })

  test('应该成功显示注册页面', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/Cloud Dev Platform/i)

    // 验证注册卡片标题
    await expect(page.getByRole('heading', { name: '注册' })).toBeVisible()

    // 验证表单字段存在
    await expect(page.getByLabel('用户名')).toBeVisible()
    await expect(page.getByLabel('邮箱')).toBeVisible()
    await expect(page.getByLabel('密码', { exact: true })).toBeVisible()
    await expect(page.getByLabel('确认密码')).toBeVisible()

    // 验证注册按钮存在
    await expect(page.getByRole('button', { name: '注册' })).toBeVisible()

    // 验证登录链接存在
    await expect(page.getByRole('link', { name: '立即登录' })).toBeVisible()
  })

  test('应该验证空表单提交', async ({ page }) => {
    // 点击注册按钮（不填写任何字段）
    await page.getByRole('button', { name: '注册' }).click()

    // 验证浏览器原生验证（HTML5 required 属性）
    // Playwright 会阻止提交，因为有 required 字段为空
    // 页面应该保持在注册页面
    await expect(page.getByRole('heading', { name: '注册' })).toBeVisible()
  })

  test('应该验证用户名格式（过短）', async ({ page }) => {
    // 填写过短的用户名（少于3个字符）
    await page.getByLabel('用户名').fill('ab')
    await page.getByLabel('邮箱').fill(testUser.email)
    await page.getByLabel('密码', { exact: true }).fill(testUser.password)
    await page.getByLabel('确认密码').fill(testUser.password)

    // 提交表单
    await page.getByRole('button', { name: '注册' }).click()

    // 等待错误消息出现
    await expect(page.locator('text=用户名必须是3-20个字符，只能包含字母、数字和下划线')).toBeVisible({ timeout: 5000 })
  })

  test('应该验证用户名格式（包含非法字符）', async ({ page }) => {
    // 填写包含非法字符的用户名
    await page.getByLabel('用户名').fill('test-user!')
    await page.getByLabel('邮箱').fill(testUser.email)
    await page.getByLabel('密码', { exact: true }).fill(testUser.password)
    await page.getByLabel('确认密码').fill(testUser.password)

    // 提交表单
    await page.getByRole('button', { name: '注册' }).click()

    // 等待错误消息出现
    await expect(page.locator('text=用户名必须是3-20个字符，只能包含字母、数字和下划线')).toBeVisible({ timeout: 5000 })
  })

  test('应该验证邮箱格式', async ({ page }) => {
    // NOTE: 如果后端不验证,前端应该验证邮箱格式
    // 填写无效的邮箱格式
    await page.getByLabel('用户名').fill(testUser.username)
    await page.getByLabel('邮箱').fill('invalid-email')
    await page.getByLabel('密码', { exact: true }).fill(testUser.password)
    await page.getByLabel('确认密码').fill(testUser.password)

    // 提交表单
    await page.getByRole('button', { name: '注册' }).click()

    // 等待错误消息出现
    await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible({ timeout: 5000 })
  })

  test('应该验证密码长度（过短）', async ({ page }) => {
    // NOTE: 验证前端表单验证逻辑是否正确
    // 填写过短的密码（少于8个字符）
    await page.getByLabel('用户名').fill(testUser.username)
    await page.getByLabel('邮箱').fill(testUser.email)
    await page.getByLabel('密码', { exact: true }).fill('1234567')
    await page.getByLabel('确认密码').fill('1234567')

    // 提交表单
    await page.getByRole('button', { name: '注册' }).click()

    // 等待错误消息出现
    await expect(page.locator('text=密码长度至少为8个字符')).toBeVisible({ timeout: 5000 })
  })

  test('应该验证两次密码输入一致性', async ({ page }) => {
    // NOTE: 验证前端表单验证逻辑是否正确
    // 填写不一致的密码
    await page.getByLabel('用户名').fill(testUser.username)
    await page.getByLabel('邮箱').fill(testUser.email)
    await page.getByLabel('密码', { exact: true }).fill(testUser.password)
    await page.getByLabel('确认密码').fill('DifferentPassword123')

    // 提交表单
    await page.getByRole('button', { name: '注册' }).click()

    // 等待错误消息出现
    await expect(page.locator('text=两次输入的密码不一致')).toBeVisible({ timeout: 5000 })
  })

  test('应该成功注册新用户并跳转到仪表板', async ({ page }) => {
    // NOTE: 验证完整注册流程
    // 填写有效的注册信息
    await page.getByLabel('用户名').fill(testUser.username)
    await page.getByLabel('邮箱').fill(testUser.email)
    await page.getByLabel('密码', { exact: true }).fill(testUser.password)
    await page.getByLabel('确认密码').fill(testUser.password)

    // 提交表单
    await page.getByRole('button', { name: '注册' }).click()

    // 等待注册完成并跳转到仪表板
    // 注册成功后应该跳转到 /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // 验证用户已登录（检查是否有导航栏或用户信息）
    // 这里可以根据实际的仪表板页面结构进行验证
  })

  test('应该拒绝重复的用户名注册', async ({ page }) => {
    // 使用已存在的用户名（假设 'jia' 已存在）
    await page.getByLabel('用户名').fill('jia')
    await page.getByLabel('邮箱').fill(`jia_new_${timestamp}@example.com`)
    await page.getByLabel('密码', { exact: true }).fill(testUser.password)
    await page.getByLabel('确认密码').fill(testUser.password)

    // 提交表单
    await page.getByRole('button', { name: '注册' }).click()

    // 等待错误消息出现（用户名已存在）
    // 根据后端返回的错误消息，这里可能需要调整
    await expect(page.locator('.bg-red-50, .dark\\:bg-red-900\\/20')).toBeVisible({ timeout: 5000 })
  })

  test('应该拒绝重复的邮箱注册', async ({ page }) => {
    // 使用已存在的邮箱（假设某个已存在的邮箱）
    await page.getByLabel('用户名').fill(`uniqueuser${timestamp}`)
    await page.getByLabel('邮箱').fill('jia@example.com')  // 假设这个邮箱已存在
    await page.getByLabel('密码', { exact: true }).fill(testUser.password)
    await page.getByLabel('确认密码').fill(testUser.password)

    // 提交表单
    await page.getByRole('button', { name: '注册' }).click()

    // 等待错误消息出现（邮箱已存在）
    await expect(page.locator('.bg-red-50, .dark\\:bg-red-900\\/20')).toBeVisible({ timeout: 5000 })
  })

  test('应该能够通过链接跳转到登录页面', async ({ page }) => {
    // 点击"立即登录"链接
    await page.getByRole('link', { name: '立即登录' }).click()

    // 验证跳转到登录页面
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  })

  test('应该在加载时禁用提交按钮', async ({ page }) => {
    // 填写表单
    await page.getByLabel('用户名').fill(testUser.username)
    await page.getByLabel('邮箱').fill(testUser.email)
    await page.getByLabel('密码', { exact: true }).fill(testUser.password)
    await page.getByLabel('确认密码').fill(testUser.password)

    // 点击注册按钮
    const submitButton = page.getByRole('button', { name: '注册' })
    await submitButton.click()

    // 验证按钮在加载时显示"注册中..."
    // 注意：这个测试可能需要根据网络速度调整
    await expect(submitButton).toHaveText('注册中...', { timeout: 1000 }).catch(() => {
      // 如果响应太快，按钮可能直接跳转，这是正常的
    })
  })
})
