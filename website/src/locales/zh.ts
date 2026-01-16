export default {
  nav: {
    home: '首页',
    docs: '文档',
    showcase: '演示',
    blog: '博客',
    about: '关于',
    faq: '常见问题',
    login: '登录',
    register: '注册',
  },
  hero: {
    tagline: '我们不只是托管代码，我们构建共识。',
    subtitle: '让分布式团队像分布式系统一样可靠',
    cta: '免费开始构建',
    secondaryCta: '观看演示',
  },
  stats: {
    opensource: '100% 开源',
    license: 'MIT 许可证',
    failover: '150ms 故障转移',
    election: 'Leader 选举',
    coverage: '80%+ 测试覆盖',
    e2e: 'Playwright E2E',
    setup: '10分钟 启动',
    docker: 'Docker Compose',
    docs: '6+ 设计文档',
    academic: '学术严谨',
    i18n: 'zh/en 原生',
    native: '国际化',
  },
  features: {
    raft: {
      title: '生产级 Raft 共识',
      description:
        '真正的分布式共识，不是演示。基于 WebSocket 的实时通信，持久化日志存储，自动 Leader 选举和日志复制。当 Leader 失效时，集群在 150 毫秒内选举出新 Leader。这就是可靠系统的运作方式。',
      highlight: '150ms 故障转移，零停机',
    },
    global: {
      title: '全球化设计，非事后补丁',
      description:
        '国际化不是插件，而是从第一行代码就融入架构。中英双语支持，UI 文本同步翻译，自动保存语言偏好，文化适配的用户体验。技术应该打破语言边界，而不是强化它。',
      highlight: '100% UI 覆盖，零硬编码字符串',
    },
    academic: {
      title: '学术严谨 + 生产就绪',
      description:
        '这不是周末项目。完整的软件工程生命周期：需求分析 → 架构设计 → 实现 → 测试 → 文档化。每一行代码都有设计文档支撑。每一个功能都有测试覆盖。每一个决策都遵循 ECP 工程准则：SOLID、DRY、KISS、防御性编程。',
      highlight: '80%+ 测试覆盖，100% 文档化',
    },
    typescript: {
      title: '全栈 TypeScript，一流工具链',
      description:
        'Next.js 15 + React 19 前端。NestJS 11 + Prisma 6 后端。Monaco Editor 代码编辑器。Playwright E2E 测试。PostgreSQL、Redis、MinIO 基础设施。我们使用最好的工具，因为你值得。开发者体验优先，始终如一。',
      highlight: 'Monorepo 架构，pnpm workspace',
    },
    testing: {
      title: '信心十足地发布',
      description:
        '完整的 Playwright E2E 测试套件覆盖认证、组织、团队、项目、文件管理和主题切换。每一个用户流程都经过测试。每一个边界情况都得到处理。合并前必须全绿。生产级系统就是这样发布的。',
      highlight: '9 个测试套件，50+ 测试用例',
    },
    opensource: {
      title: '真正开源，永久免费',
      description:
        'MIT 许可证。Fork、修改、基于它构建、售卖都可以。我们不相信开源核心的诱饵式转换。每一个功能都是开源的。每一个决策都是透明的。这才是社区驱动开发的正确方式。欢迎贡献，一起构建共识。',
      highlight: '无供应商锁定，支持自托管',
    },
  },
  footer: {
    tagline: '我们构建共识。',
    copyright: '© 2025 Flotilla. 创建者：JIA',
    quickLinks: '快速链接',
    quickStart: '快速开始',
    architecture: '架构文档',
    apiReference: 'API 参考',
    contributing: '贡献指南',
    more: '更多',
    about: '关于我们',
    roadmap: '路线图',
    license: '许可证（MIT）',
    privacy: '隐私政策',
    changelog: '更新日志',
  },
} as const
