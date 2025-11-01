import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

/**
 * Git UI功能自动化测试
 * 测试Clone URL面板、分支选择器和创建分支对话框
 */

test.describe('Git UI功能测试', () => {
  const testUser = {
    username: TEST_USERS.jia.username,
    password: TEST_USERS.jia.password,
  }

  const timestamp = Date.now()
  const testProject = {
    name: `Git Test Project ${timestamp}`,
    description: 'Test project for Git UI features',
  }

  let projectId: string | null = null
  let defaultBranchId: string | null = null

  // 在所有测试前先登录并创建测试项目
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // 登录
    await page.goto('/auth/login')
    await page.getByLabel(/用户名|Username/i).fill(testUser.username)
    await page.getByLabel(/密码|Password/i).fill(testUser.password)
    await page.getByRole('button', { name: /登录|Login/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // 创建测试项目
    await page.goto('/projects')
    await page.getByRole('button', { name: /创建.*项目|Create.*Project/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })
    await page.getByLabel(/项目名称|Project Name/i).fill(testProject.name)
    await page.getByLabel(/项目描述|Description/i).fill(testProject.description)
    await page
      .getByRole('button', { name: /创建|Create/i })
      .last()
      .click()

    // 等待项目创建完成并提取projectId
    await page.waitForTimeout(2000)
    const url = page.url()
    const match = url.match(/\/projects\/([^/?]+)/)
    if (match) {
      projectId = match[1]
    }

    // 初始化Repository
    if (projectId) {
      await page.goto(`/projects/${projectId}`)
      // 查找并点击"初始化代码仓库"按钮
      const initButton = page.getByRole('button', {
        name: /初始化.*仓库|Initialize.*Repository/i,
      })
      if (await initButton.isVisible({ timeout: 2000 })) {
        await initButton.click()
        await page.waitForTimeout(3000) // 等待初始化完成
        // 刷新页面以确保状态更新
        await page.reload()
      }

      // 获取默认分支ID
      await page.waitForTimeout(1000)
      const historyButton = page.getByRole('button', { name: /版本.*历史|Version.*History/i })
      if (await historyButton.isVisible({ timeout: 2000 })) {
        await historyButton.click()
        await page.waitForTimeout(1000)
        // 从URL中提取branchId
        const historyUrl = page.url()
        const branchMatch = historyUrl.match(/branchId=([^&]+)/)
        if (branchMatch) {
          defaultBranchId = branchMatch[1]
        }
      }
    }

    await context.close()
  })

  // 在每个测试前先登录
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel(/用户名|Username/i).fill(testUser.username)
    await page.getByLabel(/密码|Password/i).fill(testUser.password)
    await page.getByRole('button', { name: /登录|Login/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('应该在项目详情页显示Clone URL面板', async ({ page }) => {
    if (!projectId) {
      test.skip()
      return
    }

    // 访问项目详情页
    await page.goto(`/projects/${projectId}`)

    // 等待页面加载
    await page.waitForTimeout(1000)

    // 验证Clone URL面板标题存在
    await expect(page.locator('text=/Git Clone URL|Git.*URL/i')).toBeVisible({ timeout: 5000 })

    // 验证URL输入框存在
    await expect(page.locator('input[value*="/api/repo/"]')).toBeVisible()
  })

  test('应该能够复制Clone URL到剪贴板', async ({ page, context }) => {
    if (!projectId) {
      test.skip()
      return
    }

    // 授予剪贴板权限
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.goto(`/projects/${projectId}`)
    await page.waitForTimeout(1000)

    // 点击复制按钮
    const copyButton = page.getByRole('button', { name: /复制|Copy/i }).first()
    await copyButton.click()

    // 验证按钮文本变为"已复制"或"Copied"
    await expect(page.getByRole('button', { name: /已复制|Copied/i }).first()).toBeVisible({
      timeout: 2000,
    })

    // 验证剪贴板内容
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain('/api/repo/')
    expect(clipboardText).toContain(projectId!)
  })

  test('应该能够展开和折叠使用指南', async ({ page }) => {
    if (!projectId) {
      test.skip()
      return
    }

    await page.goto(`/projects/${projectId}`)
    await page.waitForTimeout(1000)

    // 点击"查看使用指南"按钮
    const guideButton = page.getByRole('button', { name: /查看.*指南|Show.*Guide/i })
    await guideButton.click()

    // 验证使用指南内容可见（使用更精确的选择器）
    await expect(page.locator('code:has-text("git clone")')).toBeVisible({ timeout: 2000 })

    // 再次点击应该隐藏指南
    const hideButton = page.getByRole('button', { name: /隐藏.*指南|Hide.*Guide/i })
    await hideButton.click()
    await page.waitForTimeout(500)

    // 验证git clone命令不再可见（指南已折叠）
    await expect(page.locator('code:has-text("git clone")')).not.toBeVisible({ timeout: 2000 })
  })

  test('应该在版本历史页显示分支选择器', async ({ page }) => {
    if (!projectId || !defaultBranchId) {
      test.skip()
      return
    }

    // 访问版本历史页并带上branchId
    await page.goto(`/projects/${projectId}/history?branchId=${defaultBranchId}`)
    await page.waitForTimeout(1000)

    // 验证分支选择器存在（查找包含"main"或"选择分支"的按钮）
    const branchSelector = page.locator('button').filter({ hasText: /main|选择分支|Select/ }).first()
    await expect(branchSelector).toBeVisible({ timeout: 5000 })
  })

  test('应该显示创建分支按钮', async ({ page }) => {
    if (!projectId || !defaultBranchId) {
      test.skip()
      return
    }

    // 访问版本历史页
    await page.goto(`/projects/${projectId}/history?branchId=${defaultBranchId}`)
    await page.waitForTimeout(1000)

    // 验证创建分支按钮存在
    await expect(
      page.getByRole('button', { name: /创建.*分支|Create.*Branch/i })
    ).toBeVisible({ timeout: 5000 })
  })

  test('应该能够打开创建分支对话框', async ({ page }) => {
    if (!projectId || !defaultBranchId) {
      test.skip()
      return
    }

    await page.goto(`/projects/${projectId}/history?branchId=${defaultBranchId}`)
    await page.waitForTimeout(1000)

    // 点击创建分支按钮
    await page.getByRole('button', { name: /创建.*分支|Create.*Branch/i }).click()

    // 验证对话框打开
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // 验证对话框标题
    await expect(page.locator('text=/创建.*分支|Create.*Branch/i').first()).toBeVisible()
  })

  test('应该验证分支名称输入', async ({ page }) => {
    if (!projectId || !defaultBranchId) {
      test.skip()
      return
    }

    await page.goto(`/projects/${projectId}/history?branchId=${defaultBranchId}`)
    await page.waitForTimeout(1000)

    // 打开创建分支对话框
    await page.getByRole('button', { name: /创建.*分支|Create.*Branch/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    const branchNameInput = page.getByLabel(/分支名称|Branch Name/i)

    // 测试空分支名：按钮应该被禁用
    await branchNameInput.fill('')
    const emptyButton = page.locator('[role="dialog"]').getByRole('button', { name: /创建|Create/i }).last()
    await expect(emptyButton).toBeDisabled({ timeout: 2000 })

    // 测试无效字符：填入内容启用按钮，点击后显示错误
    await branchNameInput.fill('invalid@branch#name')
    await page.locator('[role="dialog"]').getByRole('button', { name: /创建|Create/i }).last().click()
    await expect(
      page.locator('text=/只能包含|can only contain|字母|letters|数字|numbers/i').first()
    ).toBeVisible({ timeout: 2000 })

    // 测试以斜杠开头
    await branchNameInput.fill('/invalid-branch')
    await page.locator('[role="dialog"]').getByRole('button', { name: /创建|Create/i }).last().click()
    await expect(page.locator('text=/斜杠|slash/i').first()).toBeVisible({ timeout: 2000 })

    // 测试连续斜杠
    await branchNameInput.fill('feature//invalid')
    await page.locator('[role="dialog"]').getByRole('button', { name: /创建|Create/i }).last().click()
    await expect(page.locator('text=/斜杠|slash/i').first()).toBeVisible({ timeout: 2000 })

    // 测试有效的分支名：按钮应该启用
    await branchNameInput.fill('feature/test-validation')
    const validButton = page.locator('[role="dialog"]').getByRole('button', { name: /创建|Create/i }).last()
    await expect(validButton).toBeEnabled({ timeout: 2000 })
    // 不点击创建，避免实际创建分支
  })

  test('应该能够成功创建新分支', async ({ page }) => {
    if (!projectId || !defaultBranchId) {
      test.skip()
      return
    }

    await page.goto(`/projects/${projectId}/history?branchId=${defaultBranchId}`)
    await page.waitForTimeout(1000)

    // 打开创建分支对话框
    await page.getByRole('button', { name: /创建.*分支|Create.*Branch/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // 填写分支名称
    const newBranchName = `test-branch-${Date.now()}`
    await page.getByLabel(/分支名称|Branch Name/i).fill(newBranchName)

    // 提交表单
    await page
      .getByRole('button', { name: /创建|Create/i })
      .last()
      .click()

    // 等待创建完成
    await page.waitForTimeout(2000)

    // 验证对话框已关闭
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 })

    // 刷新页面并验证新分支出现在选择器中
    await page.reload()
    await page.waitForTimeout(1000)

    // 点击分支选择器
    const branchSelector = page.locator('button').filter({ hasText: /main|选择分支|Select/ }).first()
    await branchSelector.click()

    // 验证新分支出现在下拉列表中
    await expect(page.getByRole('option', { name: newBranchName })).toBeVisible({ timeout: 3000 })
  })
})
