import { test, expect } from '@playwright/test'

test('调试登录页面结构', async ({ page }) => {
  await page.goto('/auth/login', { waitUntil: 'networkidle' })

  // 等待几秒确保页面完全加载
  await page.waitForTimeout(3000)

  // 输出页面 HTML
  const html = await page.content()
  console.log('Page HTML:', html.substring(0, 2000))

  // 尝试查找"登录"文本
  const loginText = await page.locator('text=登录').count()
  console.log('Found "登录" text:', loginText, 'times')

  // 查找所有 heading 元素
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
  console.log('Headings found:', headings.length)
  for (const heading of headings) {
    const text = await heading.textContent()
    console.log('Heading text:', text)
  }

  // 尝试不同的选择器
  await expect(page.locator('text=登录').first()).toBeVisible({ timeout: 5000 })
})
