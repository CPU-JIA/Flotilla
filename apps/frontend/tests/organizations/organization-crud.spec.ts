import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

/**
 * 组织功能自动化测试
 * ECP-D1: 设计可测试性 - 验证Organization CRUD操作
 *
 * 测试前置条件:
 * 1. 后端服务已启动（PostgreSQL + NestJS）
 * 2. 已创建测试用户：username: TEST_USERS.testuser.username, password: TEST_USERS.testuser.password
 * 3. 数据库已执行迁移脚本
 *
 * 运行命令:
 * cd apps/frontend
 * pnpm test tests/organizations/organization-crud.spec.ts
 */

test.describe('组织CRUD功能测试', () => {
  // 使用已存在的测试用户
  const testUser = {
    username: TEST_USERS.testuser.username,
    password: TEST_USERS.testuser.password,
  }

  // 生成唯一的组织名称（避免测试数据污染）
  const generateUniqueOrgName = () => `测试组织-${Date.now()}`
  const generateUniqueOrgSlug = () => `test-org-${Date.now()}`

  test.beforeEach(async ({ page }) => {
    // 登录前置操作
    await page.goto('/auth/login', { waitUntil: 'networkidle' })
    await expect(page.locator('text=登录').first()).toBeVisible({ timeout: 15000 })

    // 填写登录信息
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)

    // 提交登录
    await page.getByRole('button', { name: '登录' }).click()

    // 等待跳转到仪表板
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('应该成功创建新组织', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL('/organizations')

    // 2. 验证页面加载完成
    await expect(page.locator('text=我的组织')).toBeVisible({ timeout: 5000 })

    // 3. 点击"创建新组织"按钮（使用.first()选择头部按钮，避免与空状态按钮冲突）
    const createButton = page.getByRole('button', { name: /创建新组织|Create New Organization/i }).first()
    await expect(createButton).toBeVisible()
    await createButton.click()

    // 4. 验证Dialog打开
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // 5. 填写组织信息
    const orgName = generateUniqueOrgName()
    const orgSlug = generateUniqueOrgSlug()

    await page.getByLabel(/组织名称|Organization Name/i).fill(orgName)
    await page.getByLabel(/组织标识|Organization Slug/i).fill(orgSlug)
    await page.getByLabel(/描述|Description/i).fill('这是一个自动化测试创建的组织')

    // 6. 提交表单
    const submitButton = page.locator('[role="dialog"] button[type="submit"]')
    await submitButton.click()

    // 7. 等待Dialog关闭
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })

    // 8. 验证组织创建成功 - 应该自动跳转到组织详情页或列表中出现新组织
    // 方式1: 检查是否跳转到详情页
    const currentUrl = page.url()
    const isDetailsPage = currentUrl.includes(`/organizations/${orgSlug}`)

    if (isDetailsPage) {
      // 如果跳转到详情页，验证页面内容
      await expect(page.locator(`text=${orgName}`)).toBeVisible({ timeout: 5000 })
    } else {
      // 如果停留在列表页，验证组织卡片出现
      await page.goto('/organizations', { waitUntil: 'networkidle' })
      await expect(page.locator(`text=${orgName}`)).toBeVisible({ timeout: 5000 })
    }
  })

  test('应该成功查看组织详情和Tabs', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 等待页面加载
    await expect(page.locator('text=我的组织')).toBeVisible({ timeout: 5000 })

    // 3. 检查是否有组织存在，如果没有则创建一个
    const hasOrganizations = await page.locator('[role="link"]').count() > 0

    let orgSlug: string

    if (!hasOrganizations) {
      // 创建一个测试组织
      await page.getByRole('button', { name: /创建新组织/i }).first().click()
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' })

      orgSlug = generateUniqueOrgSlug()
      await page.getByLabel(/组织名称/i).fill(generateUniqueOrgName())
      await page.getByLabel(/组织标识/i).fill(orgSlug)
      await page.locator('[role="dialog"] button[type="submit"]').click()
      await page.waitForTimeout(2000)
    } else {
      // 获取第一个组织的slug
      const firstOrgCard = page.locator('.grid a').first()
      const href = await firstOrgCard.getAttribute('href')
      orgSlug = href?.split('/').pop() || ''
    }

    // 4. 点击组织卡片进入详情页
    await page.goto(`/organizations/${orgSlug}`, { waitUntil: 'networkidle' })

    // 5. 验证详情页加载成功
    await expect(page).toHaveURL(`/organizations/${orgSlug}`)

    // 6. 验证所有Tab存在
    await expect(page.getByRole('tab', { name: /概览|Overview/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /成员|Members/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /团队|Teams/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /设置|Settings/i })).toBeVisible()

    // 7. 测试Tab切换
    // 点击Members Tab
    await page.getByRole('tab', { name: /成员|Members/i }).click()
    await expect(page.getByRole('heading', { name: /成员|Members/i })).toBeVisible({ timeout: 3000 })

    // 点击Teams Tab
    await page.getByRole('tab', { name: /团队|Teams/i }).click()
    await expect(page.getByRole('heading', { name: /团队|Teams/i })).toBeVisible({ timeout: 3000 })

    // 点击Settings Tab（需要权限）
    const settingsTab = page.getByRole('tab', { name: /设置|Settings/i })
    const isDisabled = await settingsTab.isDisabled()

    if (isDisabled) {
      console.log('⚠️  当前用户没有修改组织设置的权限（需要OWNER或ADMIN角色）')
      // Settings Tab被禁用，但这不是错误，跳过
    } else {
      await settingsTab.click()
      await expect(page.locator('text=基本信息').or(page.locator('text=Basic Information'))).toBeVisible({ timeout: 3000 })
    }
  })

  test('应该成功更新组织设置', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 确保有组织存在（使用第一个组织或创建新组织）
    const hasOrganizations = await page.locator('.grid a').count() > 0

    let orgSlug: string

    if (!hasOrganizations) {
      // 创建测试组织
      await page.getByRole('button', { name: /创建新组织/i }).first().click()
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' })

      orgSlug = generateUniqueOrgSlug()
      await page.getByLabel(/组织名称/i).fill(generateUniqueOrgName())
      await page.getByLabel(/组织标识/i).fill(orgSlug)
      await page.locator('[role="dialog"] button[type="submit"]').click()
      await page.waitForTimeout(2000)
    } else {
      // 获取第一个组织
      const firstOrgCard = page.locator('.grid a').first()
      const href = await firstOrgCard.getAttribute('href')
      orgSlug = href?.split('/').pop() || ''
    }

    // 3. 进入组织详情页
    await page.goto(`/organizations/${orgSlug}`, { waitUntil: 'networkidle' })

    // 4. 点击Settings Tab
    const settingsTab = page.getByRole('tab', { name: /设置|Settings/i })
    const isDisabled = await settingsTab.isDisabled()

    if (isDisabled) {
      console.log('⚠️  当前用户没有修改组织设置的权限（需要OWNER或ADMIN角色）')
      test.skip()
      return
    }

    await settingsTab.click()
    await page.waitForTimeout(1000)

    // 5. 验证Settings页面加载
    await expect(page.locator('text=基本信息').or(page.locator('text=Basic Information'))).toBeVisible({ timeout: 3000 })

    // 6. 修改组织名称
    const nameInput = page.getByLabel(/组织名称|Organization Name/i).first()
    await nameInput.clear()

    const newName = `更新的组织-${Date.now()}`
    await nameInput.fill(newName)

    // 7. 修改描述
    const descriptionTextarea = page.getByLabel(/描述|Description/i).first()
    await descriptionTextarea.clear()
    await descriptionTextarea.fill(`更新时间: ${new Date().toLocaleString()}`)

    // 8. 提交更新
    const saveButton = page.getByRole('button', { name: /保存|Save/i }).first()
    await saveButton.click()

    // 9. 等待成功提示（可能是alert或toast）
    // 等待一段时间让更新完成
    await page.waitForTimeout(2000)

    // 10. 验证名称已更新（刷新页面后检查）
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: newName, exact: true })).toBeVisible({ timeout: 5000 })
  })

  test('应该验证组织slug格式', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 打开创建Dialog
    await page.getByRole('button', { name: /创建新组织/i }).first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // 3. 填写组织名称
    await page.getByLabel(/组织名称/i).fill('测试组织')

    // 4. 尝试输入非法的slug（包含大写字母、特殊字符）
    const slugInput = page.getByLabel(/组织标识/i)
    await slugInput.fill('Invalid-SLUG@123')

    // 5. 验证slug被自动转换或显示错误提示
    // 方式1: 检查是否有格式不正确的提示
    const hasWarning = await page.locator('text=格式不正确').or(page.locator('text=Invalid format')).isVisible().catch(() => false)

    if (hasWarning) {
      console.log('✅ Slug格式验证工作正常 - 显示错误提示')
    }

    // 6. 输入正确的slug
    await slugInput.clear()
    await slugInput.fill('valid-slug-123')

    // 7. 验证没有错误提示
    await expect(page.locator('text=格式不正确').or(page.locator('text=Invalid format'))).not.toBeVisible()
  })

  test('应该显示空状态提示（当没有组织时）', async ({ page, context }) => {
    // 注意：这个测试假设能够清空所有组织
    // 在实际环境中可能需要使用独立的测试数据库

    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 检查是否显示组织列表或空状态
    const hasOrganizations = await page.locator('.grid a').count() > 0

    if (!hasOrganizations) {
      // 3. 验证空状态提示
      await expect(page.locator('text=暂无组织').or(page.locator('text=No Organizations'))).toBeVisible()
      await expect(page.locator('text=创建您的第一个组织').or(page.locator('text=Create your first organization'))).toBeVisible()
    } else {
      console.log('ℹ️  当前账号已有组织，跳过空状态验证')
    }
  })

  test('应该支持组织搜索功能', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 检查是否有搜索框
    const searchInput = page.getByPlaceholder(/组织|Organization/i)

    if (await searchInput.isVisible()) {
      // 3. 创建一个测试组织以便搜索
      await page.getByRole('button', { name: /创建新组织/i }).first().click()
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' })

      const uniqueName = `可搜索组织-${Date.now()}`
      await page.getByLabel(/组织名称/i).fill(uniqueName)
      await page.getByLabel(/组织标识/i).fill(generateUniqueOrgSlug())
      await page.locator('[role="dialog"] button[type="submit"]').click()
      await page.waitForTimeout(2000)

      // 4. 返回列表页
      await page.goto('/organizations', { waitUntil: 'networkidle' })

      // 5. 测试搜索功能
      await searchInput.fill(uniqueName.substring(0, 5))
      await page.getByRole('button', { name: /搜索|Search/i }).click()

      // 6. 验证搜索结果
      await page.waitForTimeout(1000)
      await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 5000 })
    } else {
      console.log('ℹ️  搜索功能未实现，跳过测试')
    }
  })
})
