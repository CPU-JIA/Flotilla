import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置文件
 * 用于自动化测试注册和登录功能
 */
export default defineConfig({
  // 测试目录
  testDir: './tests',

  // 测试超时时间
  timeout: 60000,

  // 全局超时时间
  globalTimeout: 300000,

  // 期望超时时间
  expect: {
    timeout: 15000,
  },

  // 失败时的重试次数
  retries: process.env.CI ? 2 : 0,

  // 并发执行的工作进程数
  workers: process.env.CI ? 1 : undefined,

  // 报告器
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // 全局配置
  use: {
    // 基础 URL - 指向 Docker 容器中的前端服务
    baseURL: 'http://localhost:3000',

    // 截图配置
    screenshot: 'only-on-failure',

    // 视频录制
    video: 'retain-on-failure',

    // 追踪
    trace: 'retain-on-failure',

    // 浏览器上下文选项
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // 导航超时
    navigationTimeout: 10000,

    // 操作超时
    actionTimeout: 10000,
  },

  // 项目配置 - 不同浏览器
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 如需测试其他浏览器，取消注释
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web 服务器配置
  // Playwright 自动启动前端开发服务器
  webServer: {
    command: 'pnpm run dev',
    port: 3000,
    timeout: 120000, // 2分钟启动超时(Next.js首次编译需要时间)
    reuseExistingServer: !process.env.CI, // 本地开发可复用现有服务器,CI环境强制新启动
  },
})
