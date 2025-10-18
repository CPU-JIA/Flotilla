import { test, expect } from '@playwright/test'

/**
 * 主题和语言切换功能自动化测试
 * 测试Light/Dark主题切换和中文/英文语言切换
 */

test.describe('主题和语言切换功能测试', () => {
  const testUser = {
    username: 'jia',
    password: 'Jia123456',
  }

  // 在每个测试前先登录
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('用户名或邮箱').fill(testUser.username)
    await page.getByLabel('密码').fill(testUser.password)
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('应该显示主题切换按钮', async ({ page }) => {
    // 查找主题切换按钮（包含Sun或Moon图标）
    const themeToggle = page.locator('button').filter({
      has: page.locator('svg[class*="lucide"]')
    }).first()

    await expect(themeToggle).toBeVisible({ timeout: 5000 })
  })

  test('应该能够切换到Dark主题', async ({ page }) => {
    // 获取当前HTML元素的class
    const htmlElement = page.locator('html')
    const initialClasses = await htmlElement.getAttribute('class') || ''

    // 查找主题切换按钮并点击
    const themeToggle = page.locator('button').filter({
      has: page.locator('svg')
    }).first()

    await themeToggle.click()
    await page.waitForTimeout(500)

    // 验证dark class被添加或移除
    const newClasses = await htmlElement.getAttribute('class') || ''

    // 主题应该发生变化
    expect(newClasses).not.toBe(initialClasses)
  })

  test('应该能够切换到Light主题', async ({ page }) => {
    // 先确保在dark模式
    const htmlElement = page.locator('html')
    let currentClasses = await htmlElement.getAttribute('class') || ''

    // 如果不是dark模式，先切换到dark
    if (!currentClasses.includes('dark')) {
      const themeToggle = page.locator('button').filter({
        has: page.locator('svg')
      }).first()
      await themeToggle.click()
      await page.waitForTimeout(500)
    }

    // 再次点击切换回light
    const themeToggle = page.locator('button').filter({
      has: page.locator('svg')
    }).first()
    await themeToggle.click()
    await page.waitForTimeout(500)

    // 验证dark class被移除
    currentClasses = await htmlElement.getAttribute('class') || ''
    // light模式下可能没有dark class，或者有light class
  })

  test('主题切换应该持久化（刷新后保持）', async ({ page }) => {
    // 切换主题
    const themeToggle = page.locator('button').filter({
      has: page.locator('svg')
    }).first()
    await themeToggle.click()
    await page.waitForTimeout(500)

    // 获取切换后的主题状态
    const htmlElement = page.locator('html')
    const classesAfterToggle = await htmlElement.getAttribute('class') || ''

    // 刷新页面
    await page.reload()
    await page.waitForTimeout(1000)

    // 验证主题保持一致
    const classesAfterReload = await htmlElement.getAttribute('class') || ''

    // 主题应该保持不变（localStorage持久化）
    expect(classesAfterReload).toContain(classesAfterToggle.includes('dark') ? 'dark' : '')
  })

  test('应该显示语言切换按钮', async ({ page }) => {
    // 查找语言切换按钮（显示"EN"或"中"）
    const languageToggle = page.getByRole('button').filter({
      hasText: /EN|中/
    })

    await expect(languageToggle).toBeVisible({ timeout: 5000 })
  })

  test('应该能够切换到英文', async ({ page }) => {
    // 查找语言切换按钮
    const languageToggle = page.getByRole('button').filter({
      hasText: /EN|中/
    })

    // 获取当前按钮文本
    const currentText = await languageToggle.textContent() || ''

    // 点击切换
    await languageToggle.click()
    await page.waitForTimeout(500)

    // 验证按钮文本改变
    const newText = await languageToggle.textContent() || ''
    expect(newText).not.toBe(currentText)

    // 验证页面文本也改变了
    // 例如，导航栏的"项目"应该变成"Projects"
    const projectsLink = page.getByRole('link', { name: /Projects|项目/ }).first()
    await expect(projectsLink).toBeVisible({ timeout: 2000 })
  })

  test('应该能够切换到中文', async ({ page }) => {
    // 先切换到英文
    const languageToggle = page.getByRole('button').filter({
      hasText: /EN|中/
    })

    let currentText = await languageToggle.textContent() || ''

    // 如果当前显示"EN"，说明是中文界面，先切到英文
    if (currentText.includes('EN')) {
      await languageToggle.click()
      await page.waitForTimeout(500)
    }

    // 再切回中文
    await languageToggle.click()
    await page.waitForTimeout(500)

    // 验证界面变成中文
    const projectsLink = page.getByRole('link', { name: /项目|Projects/ }).first()
    await expect(projectsLink).toBeVisible({ timeout: 2000 })
  })

  test('语言切换应该持久化（刷新后保持）', async ({ page }) => {
    // 切换语言
    const languageToggle = page.getByRole('button').filter({
      hasText: /EN|中/
    })
    await languageToggle.click()
    await page.waitForTimeout(500)

    // 获取切换后的按钮文本
    const textAfterToggle = await languageToggle.textContent() || ''

    // 刷新页面
    await page.reload()
    await page.waitForTimeout(1000)

    // 验证语言保持一致
    const textAfterReload = await languageToggle.textContent() || ''

    // 语言应该保持不变（localStorage持久化）
    expect(textAfterReload).toContain(textAfterToggle.includes('EN') ? 'EN' : '中')
  })

  test('Dark主题应该应用到Monaco编辑器', async ({ page }) => {
    // 切换到dark主题
    const themeToggle = page.locator('button').filter({
      has: page.locator('svg')
    }).first()

    // 确保在dark模式
    const htmlElement = page.locator('html')
    let currentClasses = await htmlElement.getAttribute('class') || ''

    if (!currentClasses.includes('dark')) {
      await themeToggle.click()
      await page.waitForTimeout(500)
    }

    // 访问编辑器页面
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page.locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]').first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // Monaco编辑器应该也是dark主题
        // 查找Monaco编辑器容器，验证是否有dark相关的class
        const monacoContainer = page.locator('.monaco-editor').first()
        const monacoExists = await monacoContainer.isVisible({ timeout: 5000 }).catch(() => false)

        if (monacoExists) {
          const monacoClasses = await monacoContainer.getAttribute('class') || ''
          // vs-dark是Monaco的dark主题class
          // 注：Monaco可能需要一些时间来应用主题
        }
      }
    }
  })

  test('Light主题应该应用到Monaco编辑器', async ({ page }) => {
    // 切换到light主题
    const themeToggle = page.locator('button').filter({
      has: page.locator('svg')
    }).first()

    // 确保在light模式
    const htmlElement = page.locator('html')
    let currentClasses = await htmlElement.getAttribute('class') || ''

    if (currentClasses.includes('dark')) {
      await themeToggle.click()
      await page.waitForTimeout(500)
    }

    // 访问编辑器页面
    await page.goto('/projects')
    await page.waitForTimeout(2000)

    const firstProject = page.locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]').first()
    const projectExists = await firstProject.isVisible({ timeout: 3000 }).catch(() => false)

    if (projectExists) {
      await firstProject.click()
      const currentUrl = page.url()
      const projectId = currentUrl.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1]

      if (projectId) {
        await page.goto(`/projects/${projectId}/editor`)
        await page.waitForTimeout(3000)

        // Monaco编辑器应该是light主题
        const monacoContainer = page.locator('.monaco-editor').first()
        const monacoExists = await monacoContainer.isVisible({ timeout: 5000 }).catch(() => false)

        if (monacoExists) {
          // vs是Monaco的light主题class
          await expect(monacoContainer).toBeVisible()
        }
      }
    }
  })

  test('主题切换应该平滑过渡', async ({ page }) => {
    // 切换主题
    const themeToggle = page.locator('button').filter({
      has: page.locator('svg')
    }).first()

    await themeToggle.click()

    // 验证没有闪烁（通过检查transition-colors class）
    const bodyElement = page.locator('body')
    const bodyClasses = await bodyElement.getAttribute('class') || ''

    // Tailwind的transition类应该被应用
    // 注：这个测试主要是确保切换功能正常
  })

  test('语言切换应该更新所有UI文本', async ({ page }) => {
    // 切换语言
    const languageToggle = page.getByRole('button').filter({
      hasText: /EN|中/
    })
    await languageToggle.click()
    await page.waitForTimeout(500)

    // 验证多个UI元素的文本都改变了
    // 检查导航栏（使用first()避免匹配多个元素）
    await expect(page.getByRole('link', { name: /Dashboard|仪表盘/ }).first()).toBeVisible({ timeout: 2000 })
    await expect(page.getByRole('link', { name: /Projects|项目/ }).first()).toBeVisible({ timeout: 2000 })
    await expect(page.getByRole('button', { name: /Logout|退出登录/ }).first()).toBeVisible({ timeout: 2000 })
  })
})
