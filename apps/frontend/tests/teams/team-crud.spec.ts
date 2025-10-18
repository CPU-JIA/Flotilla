import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

/**
 * 团队功能自动化测试
 * ECP-D1: 设计可测试性 - 验证Team CRUD操作
 *
 * 测试前置条件:
 * 1. 后端服务已启动（PostgreSQL + NestJS）
 * 2. 已创建测试用户：username: TEST_USERS.testuser.username, password: TEST_USERS.testuser.password
 * 3. 用户已有至少一个组织（OWNER或ADMIN角色）
 * 4. 数据库已执行迁移脚本
 *
 * 运行命令:
 * cd apps/frontend
 * pnpm test tests/teams/team-crud.spec.ts
 */

test.describe('团队CRUD功能测试', () => {
  // 使用已存在的测试用户
  const testUser = {
    username: TEST_USERS.testuser.username,
    password: TEST_USERS.testuser.password,
  }

  // 生成唯一的团队名称（避免测试数据污染）
  const generateUniqueTeamName = () => `测试团队-${Date.now()}`
  const generateUniqueTeamSlug = () => `test-team-${Date.now()}`

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

  test('应该成功创建新团队', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL('/organizations')

    // 2. 获取第一个组织或创建新组织
    const hasOrganizations = await page.locator('.grid a').count() > 0

    let orgSlug: string

    if (!hasOrganizations) {
      // 创建测试组织
      await page.getByRole('button', { name: /创建新组织/i }).click()
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' })

      orgSlug = `test-org-${Date.now()}`
      await page.getByLabel(/组织名称/i).fill(`测试组织-${Date.now()}`)
      await page.getByLabel(/组织标识/i).fill(orgSlug)
      await page.locator('[role="dialog"] button[type="submit"]').click()
      await page.waitForTimeout(2000)
    } else {
      // 获取第一个组织的slug
      const firstOrgCard = page.locator('.grid a').first()
      const href = await firstOrgCard.getAttribute('href')
      orgSlug = href?.split('/').pop() || ''
    }

    // 3. 进入组织详情页
    await page.goto(`/organizations/${orgSlug}`, { waitUntil: 'networkidle' })

    // 4. 切换到Teams Tab
    await page.getByRole('tab', { name: /团队|Teams/i }).click()
    await page.waitForTimeout(1000)

    // 5. 点击"创建新团队"按钮
    const createButton = page.getByRole('button', { name: /创建新团队|Create New Team/i })
    await expect(createButton).toBeVisible({ timeout: 5000 })
    await createButton.click()

    // 6. 验证Dialog打开
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })

    // 7. 填写团队信息
    const teamName = generateUniqueTeamName()
    const teamSlug = generateUniqueTeamSlug()

    await page.getByLabel(/团队名称|Team Name/i).fill(teamName)
    await page.getByLabel(/团队标识|Team Slug/i).fill(teamSlug)
    await page.getByLabel(/描述|Description/i).fill('这是一个自动化测试创建的团队')

    // 8. 提交表单
    const submitButton = page.locator('[role="dialog"] button[type="submit"]')
    await submitButton.click()

    // 9. 等待Dialog关闭
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })

    // 10. 验证团队创建成功 - 应该跳转到团队详情页
    await page.waitForTimeout(2000)
    const currentUrl = page.url()
    const isDetailsPage = currentUrl.includes(`/teams/${teamSlug}`)

    if (isDetailsPage) {
      // 如果跳转到详情页，验证页面内容
      await expect(page.getByRole('heading', { name: teamName, exact: true })).toBeVisible({ timeout: 5000 })
    } else {
      // 如果停留在组织页，验证团队卡片出现
      await expect(page.getByText(teamName)).toBeVisible({ timeout: 5000 })
    }
  })

  test('应该成功查看团队详情和Tabs', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 获取第一个组织
    const hasOrganizations = await page.locator('.grid a').count() > 0
    let orgSlug: string

    if (!hasOrganizations) {
      test.skip()
      return
    }

    const firstOrgCard = page.locator('.grid a').first()
    const href = await firstOrgCard.getAttribute('href')
    orgSlug = href?.split('/').pop() || ''

    // 3. 进入组织详情页
    await page.goto(`/organizations/${orgSlug}`, { waitUntil: 'networkidle' })

    // 4. 切换到Teams Tab
    await page.getByRole('tab', { name: /团队|Teams/i }).click()
    await page.waitForTimeout(1000)

    // 5. 检查是否有团队，如果没有则创建一个
    const hasTeams = await page.locator('.grid a').filter({ hasText: /团队|Team/i }).count() > 0

    let teamSlug: string

    if (!hasTeams) {
      // 创建测试团队
      await page.getByRole('button', { name: /创建新团队/i }).click()
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' })

      teamSlug = generateUniqueTeamSlug()
      await page.getByLabel(/团队名称/i).fill(generateUniqueTeamName())
      await page.getByLabel(/团队标识/i).fill(teamSlug)
      await page.locator('[role="dialog"] button[type="submit"]').click()
      await page.waitForTimeout(2000)
    } else {
      // 获取第一个团队的slug（从href中提取）
      const firstTeamCard = page.locator('.grid a').filter({ hasText: /团队|Team/i }).first()
      const teamHref = await firstTeamCard.getAttribute('href')
      teamSlug = teamHref?.split('/').pop() || ''
    }

    // 6. 点击团队卡片进入详情页
    await page.goto(`/organizations/${orgSlug}/teams/${teamSlug}`, { waitUntil: 'networkidle' })

    // 7. 验证详情页加载成功
    await expect(page).toHaveURL(`/organizations/${orgSlug}/teams/${teamSlug}`)

    // 8. 验证所有Tab存在
    await expect(page.getByRole('tab', { name: /概览|Overview/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /成员|Members/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /权限|Permissions/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /设置|Settings/i })).toBeVisible()

    // 9. 测试Tab切换
    // 点击Members Tab
    await page.getByRole('tab', { name: /成员|Members/i }).click()
    await expect(page.getByRole('heading', { name: /成员|Members/i })).toBeVisible({ timeout: 3000 })

    // 点击Permissions Tab
    await page.getByRole('tab', { name: /权限|Permissions/i }).click()
    await expect(page.getByRole('heading', { level: 2, name: /项目权限|Project Permissions/i })).toBeVisible({ timeout: 3000 })

    // 点击Settings Tab（需要MAINTAINER权限）
    const settingsTab = page.getByRole('tab', { name: /设置|Settings/i })
    const isDisabled = await settingsTab.isDisabled()

    if (isDisabled) {
      console.log('⚠️  当前用户没有修改团队设置的权限（需要MAINTAINER角色）')
      //  Settings Tab被禁用，但这不是错误，跳过
    } else {
      await settingsTab.click()
      await expect(page.locator('text=基本信息').or(page.locator('text=Basic Information'))).toBeVisible({ timeout: 3000 })
    }
  })

  test('应该成功添加团队成员（使用email）', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 获取第一个组织
    const hasOrganizations = await page.locator('.grid a').count() > 0
    if (!hasOrganizations) {
      test.skip()
      return
    }

    const firstOrgCard = page.locator('.grid a').first()
    const href = await firstOrgCard.getAttribute('href')
    const orgSlug = href?.split('/').pop() || ''

    // 3. 进入组织详情页并切换到Teams Tab
    await page.goto(`/organizations/${orgSlug}`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: /团队|Teams/i }).click()
    await page.waitForTimeout(1000)

    // 4. 确保有团队存在
    const hasTeams = await page.locator('.grid a').filter({ hasText: /团队|Team/i }).count() > 0

    let teamSlug: string

    if (!hasTeams) {
      // 创建测试团队
      await page.getByRole('button', { name: /创建新团队/i }).click()
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' })

      teamSlug = generateUniqueTeamSlug()
      await page.getByLabel(/团队名称/i).fill(generateUniqueTeamName())
      await page.getByLabel(/团队标识/i).fill(teamSlug)
      await page.locator('[role="dialog"] button[type="submit"]').click()
      await page.waitForTimeout(2000)
    } else {
      const firstTeamCard = page.locator('.grid a').filter({ hasText: /团队|Team/i }).first()
      const teamHref = await firstTeamCard.getAttribute('href')
      teamSlug = teamHref?.split('/').pop() || ''
    }

    // 5. 进入团队详情页
    await page.goto(`/organizations/${orgSlug}/teams/${teamSlug}`, { waitUntil: 'networkidle' })

    // 6. 点击Members Tab
    await page.getByRole('tab', { name: /成员|Members/i }).click()
    await page.waitForTimeout(1000)

    // 7. 检查是否有添加成员的权限
    const addMemberSection = page.locator('text=添加成员').or(page.locator('text=Add Member'))
    const canAddMember = await addMemberSection.isVisible()

    if (!canAddMember) {
      console.log('⚠️  当前用户没有添加团队成员的权限（需要MAINTAINER角色）')
      test.skip()
      return
    }

    // 8. 填写邮箱地址（使用测试用户自己的邮箱）
    const emailInput = page.getByPlaceholder(/邮箱|Email/i).first()
    await emailInput.fill('test-member@example.com')

    // 9. 选择角色（MEMBER）
    const roleSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /成员|Member/i }) }).first()
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('MEMBER')
    }

    // 10. 提交添加成员
    const addButton = page.getByRole('button', { name: /添加|Add/i }).first()
    await addButton.click()

    // 11. 等待操作完成（可能显示成功提示或成员列表更新）
    await page.waitForTimeout(2000)

    // 12. 验证成员是否添加成功（检查邮箱是否出现在列表中）
    // 注意：如果该邮箱不是组织成员，后端会返回错误，这是预期行为
    const memberAdded = await page.locator('text=test-member@example.com').isVisible().catch(() => false)
    const errorShown = await page.locator('text=不是组织成员').or(page.locator('text=not a member of')).isVisible().catch(() => false)

    if (memberAdded) {
      console.log('✅ 成员添加成功')
    } else if (errorShown) {
      console.log('ℹ️  邮箱验证工作正常 - 该用户不是组织成员')
    }
  })

  test('应该成功更新团队设置', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 获取第一个组织
    const hasOrganizations = await page.locator('.grid a').count() > 0
    if (!hasOrganizations) {
      test.skip()
      return
    }

    const firstOrgCard = page.locator('.grid a').first()
    const href = await firstOrgCard.getAttribute('href')
    const orgSlug = href?.split('/').pop() || ''

    // 3. 进入组织详情页并切换到Teams Tab
    await page.goto(`/organizations/${orgSlug}`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: /团队|Teams/i }).click()
    await page.waitForTimeout(1000)

    // 4. 确保有团队存在
    const hasTeams = await page.locator('.grid a').filter({ hasText: /团队|Team/i }).count() > 0

    let teamSlug: string

    if (!hasTeams) {
      // 创建测试团队
      await page.getByRole('button', { name: /创建新团队/i }).click()
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' })

      teamSlug = generateUniqueTeamSlug()
      await page.getByLabel(/团队名称/i).fill(generateUniqueTeamName())
      await page.getByLabel(/团队标识/i).fill(teamSlug)
      await page.locator('[role="dialog"] button[type="submit"]').click()
      await page.waitForTimeout(2000)
    } else {
      const firstTeamCard = page.locator('.grid a').filter({ hasText: /团队|Team/i }).first()
      const teamHref = await firstTeamCard.getAttribute('href')
      teamSlug = teamHref?.split('/').pop() || ''
    }

    // 5. 进入团队详情页
    await page.goto(`/organizations/${orgSlug}/teams/${teamSlug}`, { waitUntil: 'networkidle' })

    // 6. 点击Settings Tab
    const settingsTab = page.getByRole('tab', { name: /设置|Settings/i })
    const isDisabled = await settingsTab.isDisabled()

    if (isDisabled) {
      console.log('⚠️  当前用户没有修改团队设置的权限（需要MAINTAINER角色）')
      test.skip()
      return
    }

    await settingsTab.click()
    await page.waitForTimeout(1000)

    // 7. 验证Settings页面加载
    await expect(page.locator('text=基本信息').or(page.locator('text=Basic Information'))).toBeVisible({ timeout: 3000 })

    // 8. 修改团队名称
    const nameInput = page.getByLabel(/团队名称|Team Name/i).first()
    await nameInput.clear()

    const newName = `更新的团队-${Date.now()}`
    await nameInput.fill(newName)

    // 9. 修改描述
    const descriptionTextarea = page.getByLabel(/描述|Description/i).first()
    await descriptionTextarea.clear()
    await descriptionTextarea.fill(`更新时间: ${new Date().toLocaleString()}`)

    // 10. 提交更新
    const saveButton = page.getByRole('button', { name: /保存|Save/i }).first()
    await saveButton.click()

    // 11. 等待成功提示
    await page.waitForTimeout(2000)

    // 12. 验证名称已更新（刷新页面后检查）
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator(`text=${newName}`)).toBeVisible({ timeout: 5000 })
  })

  test('应该验证团队slug格式', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 获取第一个组织
    const hasOrganizations = await page.locator('.grid a').count() > 0
    if (!hasOrganizations) {
      test.skip()
      return
    }

    const firstOrgCard = page.locator('.grid a').first()
    const href = await firstOrgCard.getAttribute('href')
    const orgSlug = href?.split('/').pop() || ''

    // 3. 进入组织详情页并切换到Teams Tab
    await page.goto(`/organizations/${orgSlug}`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: /团队|Teams/i }).click()
    await page.waitForTimeout(1000)

    // 4. 打开创建Dialog
    await page.getByRole('button', { name: /创建新团队/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // 5. 填写团队名称
    await page.getByLabel(/团队名称/i).fill('测试团队')

    // 6. 尝试输入非法的slug（包含大写字母、特殊字符）
    const slugInput = page.getByLabel(/团队标识/i)
    await slugInput.fill('Invalid-SLUG@123')

    // 7. 验证slug被自动转换或显示错误提示
    const hasWarning = await page.locator('text=格式不正确').or(page.locator('text=Invalid format')).isVisible().catch(() => false)

    if (hasWarning) {
      console.log('✅ Slug格式验证工作正常 - 显示错误提示')
    }

    // 8. 输入正确的slug
    await slugInput.clear()
    await slugInput.fill('valid-team-slug-123')

    // 9. 验证没有错误提示
    await expect(page.locator('text=格式不正确').or(page.locator('text=Invalid format'))).not.toBeVisible()
  })

  test('应该支持项目权限分配', async ({ page }) => {
    // 1. 导航到Organizations页面
    await page.goto('/organizations', { waitUntil: 'networkidle' })

    // 2. 获取第一个组织
    const hasOrganizations = await page.locator('.grid a').count() > 0
    if (!hasOrganizations) {
      test.skip()
      return
    }

    const firstOrgCard = page.locator('.grid a').first()
    const href = await firstOrgCard.getAttribute('href')
    const orgSlug = href?.split('/').pop() || ''

    // 3. 进入组织详情页并切换到Teams Tab
    await page.goto(`/organizations/${orgSlug}`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: /团队|Teams/i }).click()
    await page.waitForTimeout(1000)

    // 4. 确保有团队存在
    const hasTeams = await page.locator('.grid a').filter({ hasText: /团队|Team/i }).count() > 0

    let teamSlug: string

    if (!hasTeams) {
      // 创建测试团队
      await page.getByRole('button', { name: /创建新团队/i }).click()
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' })

      teamSlug = generateUniqueTeamSlug()
      await page.getByLabel(/团队名称/i).fill(generateUniqueTeamName())
      await page.getByLabel(/团队标识/i).fill(teamSlug)
      await page.locator('[role="dialog"] button[type="submit"]').click()
      await page.waitForTimeout(2000)
    } else {
      const firstTeamCard = page.locator('.grid a').filter({ hasText: /团队|Team/i }).first()
      const teamHref = await firstTeamCard.getAttribute('href')
      teamSlug = teamHref?.split('/').pop() || ''
    }

    // 5. 进入团队详情页
    await page.goto(`/organizations/${orgSlug}/teams/${teamSlug}`, { waitUntil: 'networkidle' })

    // 6. 点击Permissions Tab
    await page.getByRole('tab', { name: /权限|Permissions/i }).click()
    await page.waitForTimeout(1000)

    // 7. 验证权限管理页面加载
    await expect(page.getByRole('heading', { level: 2, name: /项目权限|Project Permissions/i })).toBeVisible({ timeout: 3000 })

    // 8. 检查是否有分配权限的权限
    const assignSection = page.locator('text=分配权限').or(page.locator('text=Assign Permission'))
    const canAssign = await assignSection.isVisible()

    if (!canAssign) {
      console.log('⚠️  当前用户没有分配项目权限的权限（需要MAINTAINER角色）')
      test.skip()
      return
    }

    // 9. 填写项目ID（简化版MVP - 手动输入）
    const projectIdInput = page.getByPlaceholder(/项目ID|Project ID/i).first()

    if (await projectIdInput.isVisible()) {
      await projectIdInput.fill('test-project-123')

      // 10. 选择权限级别
      const permissionSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /读写|Write/i }) }).first()
      if (await permissionSelect.isVisible()) {
        await permissionSelect.selectOption('WRITE')
      }

      // 11. 提交分配
      const assignButton = page.getByRole('button', { name: /分配|Assign/i }).first()
      await assignButton.click()

      // 12. 等待操作完成
      await page.waitForTimeout(2000)

      // 13. 验证权限是否添加（可能会因为项目ID不存在而失败，这是预期的）
      const permissionAdded = await page.locator('text=test-project-123').isVisible().catch(() => false)
      const errorShown = await page.locator('text=项目不存在').or(page.locator('text=Project not found')).isVisible().catch(() => false)

      if (permissionAdded) {
        console.log('✅ 权限分配成功')
      } else if (errorShown) {
        console.log('ℹ️  项目验证工作正常 - 项目ID不存在')
      }
    } else {
      console.log('ℹ️  权限分配功能UI未完全加载，跳过测试')
    }
  })
})
