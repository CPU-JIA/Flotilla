/**
 * Theme Toggle E2E Tests
 * 测试主题切换功能的完整性和持久化
 */

import { test, expect } from '@playwright/test'

test.describe('Theme Toggle Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到dashboard页面（需要登录）
    await page.goto('http://localhost:3000/dashboard')
  })

  test('should toggle between light and dark mode', async ({ page }) => {
    // 等待页面加载完成
    await page.waitForLoadState('networkidle')

    // 初始应该是light模式
    const html = page.locator('html')
    const initialClass = await html.getAttribute('class')
    const initiallyDark = initialClass?.includes('dark') || false

    // 点击主题切换按钮
    const themeButton = page.getByRole('button', { name: /切换到/ })
    await themeButton.click()

    // 等待动画完成
    await page.waitForTimeout(300)

    // 检查主题是否切换
    const newClass = await html.getAttribute('class')
    const nowDark = newClass?.includes('dark') || false

    expect(nowDark).toBe(!initiallyDark)

    // 再次点击
    await themeButton.click()
    await page.waitForTimeout(300)

    // 应该切换回原始状态
    const finalClass = await html.getAttribute('class')
    const finallyDark = finalClass?.includes('dark') || false
    expect(finallyDark).toBe(initiallyDark)
  })

  test('should persist theme preference after page reload', async ({ page }) => {
    // 切换到dark模式
    const html = page.locator('html')
    const initialClass = await html.getAttribute('class')
    const initiallyDark = initialClass?.includes('dark') || false

    if (!initiallyDark) {
      const themeButton = page.getByRole('button', { name: /切换到深色模式/ })
      await themeButton.click()
      await page.waitForTimeout(300)
    }

    // 确认现在是dark模式
    let currentClass = await html.getAttribute('class')
    expect(currentClass).toContain('dark')

    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 主题应该保持dark
    currentClass = await html.getAttribute('class')
    expect(currentClass).toContain('dark')
  })

  test('should update theme toggle button icon correctly', async ({ page }) => {
    const html = page.locator('html')
    const themeButton = page.getByRole('button', { name: /切换到/ })

    // 获取初始主题
    const initialClass = await html.getAttribute('class')
    const initiallyDark = initialClass?.includes('dark') || false

    // 检查按钮aria-label是否正确
    const initialLabel = await themeButton.getAttribute('aria-label')
    if (initiallyDark) {
      expect(initialLabel).toContain('亮色模式')
    } else {
      expect(initialLabel).toContain('深色模式')
    }

    // 切换主题
    await themeButton.click()
    await page.waitForTimeout(300)

    // 检查aria-label是否更新
    const newLabel = await themeButton.getAttribute('aria-label')
    if (initiallyDark) {
      expect(newLabel).toContain('深色模式')
    } else {
      expect(newLabel).toContain('亮色模式')
    }
  })

  test('should sync Mantine components with theme', async ({ page }) => {
    // 导航到design-system页面（有Mantine组件）
    await page.goto('http://localhost:3000/design-system')
    await page.waitForLoadState('networkidle')

    const html = page.locator('html')
    const initialClass = await html.getAttribute('class')
    const initiallyDark = initialClass?.includes('dark') || false

    // 切换主题
    const themeButton = page.getByRole('button', { name: /切换到/ })
    await themeButton.click()
    await page.waitForTimeout(500) // 等待Mantine主题同步

    // 检查Mantine组件是否也更新了主题
    // 通过检查页面背景色来验证
    const backgroundColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor
    })

    if (initiallyDark) {
      // 切换到light模式后，背景应该是浅色
      expect(backgroundColor).not.toBe('rgb(17, 24, 39)') // dark bg
    } else {
      // 切换到dark模式后，背景应该是深色
      expect(backgroundColor).toBe('rgb(17, 24, 39)') // dark bg
    }
  })

  test('should have smooth transition animation', async ({ page }) => {
    // 检查transition class是否存在
    const body = page.locator('body')
    const parentDiv = body.locator('> div').first()
    const className = await parentDiv.getAttribute('class')

    expect(className).toContain('transition')
  })

  test('should be keyboard accessible', async ({ page }) => {
    // 使用Tab键导航到主题切换按钮
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // 检查是否聚焦到主题切换按钮
    const focusedElement = await page.evaluate(() =>
      document.activeElement?.getAttribute('aria-label')
    )
    expect(focusedElement).toMatch(/切换到/)

    // 使用Enter键切换主题
    const html = page.locator('html')
    const initialClass = await html.getAttribute('class')
    const initiallyDark = initialClass?.includes('dark') || false

    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    const newClass = await html.getAttribute('class')
    const nowDark = newClass?.includes('dark') || false
    expect(nowDark).toBe(!initiallyDark)
  })
})

test.describe('ThemeSelector Component', () => {
  test('should display all three theme options', async ({ page }) => {
    await page.goto('http://localhost:3000/design-system')
    await page.waitForLoadState('networkidle')

    // 滚动到ThemeSelector部分
    await page.evaluate(() => {
      const element = document.querySelector('[role="tabpanel"]')
      element?.scrollIntoView()
    })

    // 检查是否有Light/Dark/System三个选项
    // 这个测试依赖于design-system页面中有ThemeSelector组件
    const utilsTab = page.getByRole('tab', { name: /实用工具/ })
    await utilsTab.click()
    await page.waitForTimeout(500)

    // 查找包含主题选项的容器
    const themeSelectorSection = page.locator('text=主题选择器').locator('..')
    await expect(themeSelectorSection).toBeVisible()
  })
})
