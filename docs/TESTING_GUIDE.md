# 测试编写指南

## 目录

- [概述](#概述)
- [测试策略](#测试策略)
- [测试工具栈](#测试工具栈)
- [单元测试规范](#单元测试规范)
- [E2E测试规范](#e2e测试规范)
- [覆盖率要求](#覆盖率要求)
- [最佳实践](#最佳实践)

---

## 概述

本项目采用**分层测试策略**,确保代码质量和功能稳定性:

- **Backend**: Jest单元测试 + E2E测试
- **Frontend**: Playwright E2E测试
- **CI/CD**: 自动化测试集成,覆盖率阈值检查

**测试覆盖率目标**: ≥70% (长期目标80%+)

---

## 测试策略

### 测试金字塔

```
        /\
       /  \        E2E Tests (Playwright)
      /----\       - 关键用户流程
     /      \      - 跨模块集成
    /--------\
   /  Unit    \    Unit Tests (Jest)
  / Tests     \   - 业务逻辑
 /--------------\  - 服务层
```

### 测试范围

| 层级         | 测试类型             | 覆盖率目标   | 工具       |
| ------------ | -------------------- | ------------ | ---------- |
| **单元测试** | 业务逻辑、服务、工具 | 70%+         | Jest       |
| **集成测试** | API端点、数据库交互  | E2E测试覆盖  | Supertest  |
| **E2E测试**  | 用户流程、UI交互     | 关键路径100% | Playwright |

---

## 测试工具栈

### Backend (Jest)

**安装依赖** (已安装):

```bash
pnpm add -D @nestjs/testing jest ts-jest @types/jest supertest @types/supertest
```

**配置文件**:

- `apps/backend/jest.config.js` - 单元测试配置
- `apps/backend/test/jest-e2e.json` - E2E测试配置

**运行命令**:

```bash
cd apps/backend

# 运行所有测试
pnpm test

# 监视模式
pnpm test:watch

# 覆盖率报告
pnpm test:cov

# E2E测试
pnpm test:e2e

# 运行单个测试文件
pnpm jest path/to/file.spec.ts
```

### Frontend (Playwright)

**配置文件**: `apps/frontend/playwright.config.ts`

**运行命令**:

```bash
cd apps/frontend

# 运行所有E2E测试
pnpm test

# 交互式UI模式
pnpm test:ui

# 调试模式
pnpm test:debug

# 生成报告
pnpm test:report
```

---

## 单元测试规范

### 文件结构

```
src/
├── users/
│   ├── users.controller.ts
│   ├── users.controller.spec.ts  ← 控制器测试
│   ├── users.service.ts
│   └── users.service.spec.ts     ← 服务测试
```

### 命名约定

- **测试文件**: `*.spec.ts` (与被测文件同目录)
- **测试套件**: `describe('ClassName', () => {})`
- **测试用例**: `it('should do something', async () => {})`

### Controller 测试模板

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

describe('UsersController', () => {
  let controller: UsersController
  let service: UsersService

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile()

    controller = module.get<UsersController>(UsersController)
    service = module.get<UsersService>(UsersService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers = [{ id: '1', username: 'alice' }]
      mockUsersService.findAll.mockResolvedValue(mockUsers)

      const result = await controller.findAll()

      expect(result).toEqual(mockUsers)
      expect(service.findAll).toHaveBeenCalled()
    })
  })
})
```

### Service 测试模板

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import { PrismaService } from '../prisma/prisma.service'
import { NotFoundException } from '@nestjs/common'

describe('UsersService', () => {
  let service: UsersService
  let prismaService: PrismaService

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const mockUser = { id: '1', username: 'alice' }
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      const result = await service.findOne('1')

      expect(result).toEqual(mockUser)
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException)
    })
  })
})
```

### 测试场景覆盖

每个方法至少包含以下测试:

1. **Happy Path** - 正常流程成功
2. **Error Cases** - 错误处理 (NotFoundException, ConflictException等)
3. **Edge Cases** - 边界条件 (空数组、null值、特殊字符)
4. **Validation** - 输入验证

---

## E2E测试规范

### Playwright 测试结构

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test('should login with valid credentials', async ({ page }) => {
    // Arrange
    const username = 'testuser'
    const password = 'TestPassword123!'

    // Act
    await page.fill('input[name="username"]', username)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')

    // Assert
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'invalid')
    await page.fill('input[name="password"]', 'wrong')
    await page.click('button[type="submit"]')

    await expect(page.locator('.error-message')).toBeVisible()
  })
})
```

### E2E 最佳实践

- 使用 **Page Object Pattern** 提取可复用逻辑
- 利用 `test.beforeEach` 设置初始状态
- 使用明确的选择器 (data-testid优先)
- 避免硬编码超时,使用Playwright自动等待

---

## 覆盖率要求

### 当前覆盖率基准

| 模块              | 当前覆盖率 | 目标 | 状态        |
| ----------------- | ---------- | ---- | ----------- |
| **Overall**       | ~66%       | 70%  | 🟡 接近目标 |
| **auth**          | 87%        | 80%  | ✅ 达标     |
| **raft**          | 61%        | 70%  | 🟡 待提升   |
| **teams**         | 24%        | 70%  | 🔴 需改进   |
| **organizations** | 29%        | 70%  | 🔴 需改进   |
| **webhooks**      | 96%        | 80%  | ✅ 优秀     |

### CI/CD覆盖率检查

覆盖率检查在 `.github/workflows/ci.yml` 中自动运行:

```yaml
- name: Check coverage threshold
  run: |
    cd apps/backend && \
    node -e "const coverage = require('./coverage/coverage-summary.json'); \
    const pct = coverage.total.lines.pct; \
    if (pct < 70) { console.error('❌ Coverage below 70%'); process.exit(1); }"
```

### 覆盖率提升计划

**短期 (本周)**:

- ✅ Teams模块: 0% → 24% (已完成)
- ✅ Organizations模块: 0% → 29% (已完成)
- ✅ Webhooks.controller: 0% → 98% (已完成)

**中期 (本月)**:

- 扩展Teams/Organizations测试至60%+
- 为Pipelines模块添加基础测试
- 为Notifications模块添加基础测试

**长期 (下季度)**:

- 全局覆盖率达到80%+
- 引入Mutation测试 (Stryker)
- 性能测试自动化

---

## 最佳实践

### 1. AAA模式 (Arrange-Act-Assert)

```typescript
it('should create a new user', async () => {
  // Arrange - 准备测试数据
  const createDto = { username: 'alice', email: 'alice@example.com' }
  mockPrisma.user.create.mockResolvedValue({ id: '1', ...createDto })

  // Act - 执行被测方法
  const result = await service.create(createDto)

  // Assert - 验证结果
  expect(result.username).toBe('alice')
  expect(prisma.user.create).toHaveBeenCalledWith({ data: createDto })
})
```

### 2. 使用描述性测试名称

❌ **Bad**:

```typescript
it('test 1', () => {})
it('should work', () => {})
```

✅ **Good**:

```typescript
it('should throw NotFoundException when user does not exist', () => {})
it('should hash password before saving to database', () => {})
```

### 3. Mock外部依赖

始终Mock以下依赖:

- **数据库** (PrismaService, RedisService)
- **外部API** (HTTP clients, Minio, MeiliSearch)
- **时间相关** (`Date.now()`, `setTimeout`)

```typescript
jest.useFakeTimers()
jest.setSystemTime(new Date('2025-01-01'))
```

### 4. 避免测试实现细节

❌ **Bad** - 测试内部实现:

```typescript
expect(service['privateMethod']).toHaveBeenCalled()
```

✅ **Good** - 测试公开行为:

```typescript
expect(result.status).toBe('success')
```

### 5. 独立性原则

每个测试应该独立运行,不依赖其他测试的状态:

```typescript
afterEach(() => {
  jest.clearAllMocks() // 清理Mock状态
})
```

### 6. 测试异常情况

确保测试各种错误场景:

```typescript
it('should handle database connection errors gracefully', async () => {
  mockPrisma.user.findMany.mockRejectedValue(new Error('DB Error'))

  await expect(service.findAll()).rejects.toThrow('DB Error')
})
```

---

## CI/CD 集成

### 测试流程

```
PR创建 → Backend测试 → Frontend测试 → 构建检查 → Lint检查 → 合并
         ↓                ↓
     覆盖率≥70%?      E2E通过?
         ↓                ↓
      上传报告         上传报告
```

### 本地运行完整测试套件

```bash
# 根目录运行所有测试
pnpm test

# 分别运行
cd apps/backend && pnpm test:cov
cd apps/frontend && pnpm test
```

### 覆盖率报告查看

运行测试后,覆盖率报告位于:

- **Backend**: `apps/backend/coverage/lcov-report/index.html`
- **CI Artifacts**: GitHub Actions → Summary → 下载 `backend-coverage`

---

## 持续改进

### 测试质量检查清单

- [ ] 所有新功能都有对应测试
- [ ] 覆盖率不低于当前基准 (66%)
- [ ] 测试命名清晰描述行为
- [ ] 没有被跳过的测试 (`test.skip`)
- [ ] Mock数据贴近真实场景
- [ ] 异步测试正确使用 `async/await`

### Code Review 测试要点

1. **新增代码**: 必须包含对应测试
2. **Bug修复**: 添加回归测试防止再次出现
3. **重构**: 确保测试仍然通过且覆盖率未下降
4. **性能优化**: 添加性能基准测试

---

## 参考资源

- [NestJS Testing文档](https://docs.nestjs.com/fundamentals/testing)
- [Jest官方文档](https://jestjs.io/docs/getting-started)
- [Playwright文档](https://playwright.dev/docs/intro)
- [Testing Library最佳实践](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**最后更新**: 2025-12-23
**维护者**: DevOps Team
