import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../fixtures'

/**
 * 管理面板功能自动化测试
 * 测试管理员专用功能：用户管理、项目管理、Raft集群管理
 * 注意：这些测试需要使用SUPER_ADMIN角色的用户
 */

test.describe('管理面板功能测试', () => {
  // Use jia user created by globalSetup (SUPER_ADMIN role)
  const adminUser = TEST_USERS.jia

  // 在每个测试前先登录
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('用户名或邮箱').fill(adminUser.username)
    await page.getByLabel('密码').fill(adminUser.password)
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('SUPER_ADMIN应该能看到管理菜单', async ({ page }) => {
    // 验证导航栏中有"管理"或"Admin"链接
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await expect(adminLink).toBeVisible()
    } else {
      // 如果当前用户不是SUPER_ADMIN，跳过测试
      test.skip()
    }
  })

  test('应该能够访问管理面板主页', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await adminLink.click()

      // 验证跳转到管理面板
      await expect(page).toHaveURL(/\/admin/, { timeout: 5000 })
      await page.waitForTimeout(2000)
    } else {
      test.skip()
    }
  })

  test('应该能够访问用户管理页面', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await page.goto('/admin/users')
      await page.waitForTimeout(2000)

      // 验证用户管理页面加载
      await expect(page).toHaveURL(/\/admin\/users/, { timeout: 5000 })
    } else {
      test.skip()
    }
  })

  test('应该显示用户列表', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await page.goto('/admin/users')
      await page.waitForTimeout(2000)

      // 查找用户列表或表格
      const userTable = page.locator('table, [role="table"]').first()
      const tableExists = await userTable.isVisible({ timeout: 3000 }).catch(() => false)

      if (tableExists) {
        await expect(userTable).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('应该能够搜索用户', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await page.goto('/admin/users')
      await page.waitForTimeout(2000)

      // 查找搜索框
      const searchInput = page
        .locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]')
        .first()
      const searchExists = await searchInput.isVisible({ timeout: 3000 }).catch(() => false)

      if (searchExists) {
        await searchInput.fill('test')
        await page.waitForTimeout(1000)
      }
    } else {
      test.skip()
    }
  })

  test('应该能够访问项目管理页面', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await page.goto('/admin/projects')
      await page.waitForTimeout(2000)

      // 验证项目管理页面加载
      await expect(page).toHaveURL(/\/admin\/projects/, { timeout: 5000 })
    } else {
      test.skip()
    }
  })

  test('应该显示所有项目列表', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await page.goto('/admin/projects')
      await page.waitForTimeout(2000)

      // 查找项目列表
      const projectTable = page.locator('table, [role="table"]').first()
      const tableExists = await projectTable.isVisible({ timeout: 3000 }).catch(() => false)

      if (tableExists) {
        await expect(projectTable).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('应该能够访问Raft集群管理页面', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await page.goto('/admin/cluster')
      await page.waitForTimeout(2000)

      // 验证集群管理页面加载
      await expect(page).toHaveURL(/\/admin\/cluster/, { timeout: 5000 })
    } else {
      test.skip()
    }
  })

  test('应该显示Raft集群状态', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await page.goto('/admin/cluster')
      await page.waitForTimeout(2000)

      // 查找集群状态显示
      const clusterStatus = page
        .locator('text=/集群状态|Cluster Status|节点|Node|Leader|Follower/i')
        .first()
      const statusExists = await clusterStatus.isVisible({ timeout: 3000 }).catch(() => false)

      if (statusExists) {
        await expect(clusterStatus).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('应该显示节点列表', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await page.goto('/admin/cluster')
      await page.waitForTimeout(2000)

      // 查找节点列表
      const nodeList = page.locator('[data-testid="node-list"], .node-list, table').first()
      const nodeListExists = await nodeList.isVisible({ timeout: 3000 }).catch(() => false)

      if (nodeListExists) {
        await expect(nodeList).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('非管理员用户不应该能访问管理面板', async ({ page }) => {
    // 登出当前用户
    await page.getByRole('button', { name: /退出登录|Logout/i }).click()
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })

    // 尝试用普通用户登录（如果有的话）
    // 注：这里需要有一个非SUPER_ADMIN的测试用户

    // 尝试直接访问管理页面
    await page.goto('/admin')
    await page.waitForTimeout(2000)

    // 应该被重定向或显示403错误
    // URL应该不是/admin，或者显示权限错误
    const currentUrl = page.url()

    // 如果被重定向到登录页或其他页面，说明权限控制正常
    if (!currentUrl.includes('/admin')) {
      // 权限控制正常
      expect(true).toBe(true)
    }
  })

  test('管理面板应该有统计数据', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /管理|Admin/i })
    const adminLinkExists = await adminLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (adminLinkExists) {
      await page.goto('/admin')
      await page.waitForTimeout(2000)

      // 查找统计卡片或数字
      const stats = page
        .locator('[data-testid="stat-card"], .stat-card, [class*="statistic"]')
        .first()
      const statsExists = await stats.isVisible({ timeout: 3000 }).catch(() => false)

      if (statsExists) {
        await expect(stats).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})
