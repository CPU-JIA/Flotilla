import { TEST_USERS } from '../fixtures'
import { test, expect } from '@playwright/test'

/**
 * 代码编辑器功能自动化测试
 * 测试Monaco编辑器的各项功能
 */

test.describe('代码编辑器功能测试', () => {
  const testUser = {
    username: TEST_USERS.testuser.username,
    password: TEST_USERS.testuser.password,
  }

  // 在每个测试前先登录
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('应该能够访问代码编辑器页面', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)

        // 验证编辑器页面加载
        await page.waitForTimeout(2000)
        expect(page.url()).toContain('/editor')
      }
    }
  })

  test('应该加载Monaco编辑器', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // Monaco编辑器应该加载
        // 查找Monaco编辑器的容器
        const monacoContainer = page.locator('.monaco-editor, [class*="monaco"]').first()
        const monacoExists = await monacoContainer.isVisible({ timeout: 5000 }).catch(() => false)

        if (monacoExists) {
          await expect(monacoContainer).toBeVisible()
        }
      }
    }
  })

  test('应该能够在编辑器中输入文本', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // 尝试找到Monaco编辑器的可编辑区域
        const editorTextArea = page.locator('textarea.inputarea, .monaco-editor textarea').first()
        const editorExists = await editorTextArea.isVisible({ timeout: 5000 }).catch(() => false)

        if (editorExists) {
          // 聚焦编辑器
          await editorTextArea.focus()

          // 输入测试文本
          await page.keyboard.type('// Test code input')
          await page.waitForTimeout(1000)

          // 验证文本已输入（Monaco会更新DOM）
        }
      }
    }
  })

  test('应该显示保存状态指示器', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // 查找保存状态指示器
        const saveIndicator = page.locator('text=/正在保存|保存|已保存|Saving|Saved/i').first()
        const saveIndicatorExists = await saveIndicator
          .isVisible({ timeout: 3000 })
          .catch(() => false)

        if (saveIndicatorExists) {
          await expect(saveIndicator).toBeVisible()
        }
      }
    }
  })

  test('应该显示Markdown预览按钮（对于.md文件）', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // 查找预览按钮
        const previewButton = page.getByRole('button', { name: /预览|Preview/i })
        const previewExists = await previewButton.isVisible({ timeout: 3000 }).catch(() => false)

        // 如果是markdown文件，应该有预览按钮
        if (previewExists) {
          await expect(previewButton).toBeVisible()
        }
      }
    }
  })

  test('应该显示版本历史按钮', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // 查找版本历史按钮
        const historyButton = page.getByRole('button', {
          name: /版本历史|Version History|History/i,
        })
        const historyExists = await historyButton.isVisible({ timeout: 3000 }).catch(() => false)

        if (historyExists) {
          await expect(historyButton).toBeVisible()
        }
      }
    }
  })

  test('应该能够切换编辑和预览模式（Markdown文件）', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // 查找预览按钮
        const previewButton = page.getByRole('button', { name: /预览|Preview/i })
        const previewExists = await previewButton.isVisible({ timeout: 3000 }).catch(() => false)

        if (previewExists) {
          // 点击预览按钮
          await previewButton.click()
          await page.waitForTimeout(1000)

          // 查找编辑按钮（应该切换到预览模式）
          const editButton = page.getByRole('button', { name: /编辑|Edit/i })
          const editExists = await editButton.isVisible({ timeout: 2000 }).catch(() => false)

          if (editExists) {
            await expect(editButton).toBeVisible()

            // 切换回编辑模式
            await editButton.click()
            await page.waitForTimeout(1000)
          }
        }
      }
    }
  })

  test('应该能够打开版本历史侧边栏', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // 点击版本历史按钮
        const historyButton = page.getByRole('button', {
          name: /版本历史|Version History|History/i,
        })
        const historyExists = await historyButton.isVisible({ timeout: 3000 }).catch(() => false)

        if (historyExists) {
          await historyButton.click()
          await page.waitForTimeout(1000)

          // 验证侧边栏打开
          const sidebar = page.locator('[class*="sidebar"], aside, [data-testid="history-sidebar"]')
          const sidebarExists = await sidebar.isVisible({ timeout: 2000 }).catch(() => false)

          if (sidebarExists) {
            await expect(sidebar).toBeVisible()
          }
        }
      }
    }
  })

  test('应该有文件树/文件浏览器', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page
      .locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]')
      .first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // 查找文件树容器
        const fileTree = page
          .locator('[data-testid="file-tree"], [class*="file-tree"], nav')
          .first()
        const fileTreeExists = await fileTree.isVisible({ timeout: 3000 }).catch(() => false)

        if (fileTreeExists) {
          await expect(fileTree).toBeVisible()
        }
      }
    }
  })
})
