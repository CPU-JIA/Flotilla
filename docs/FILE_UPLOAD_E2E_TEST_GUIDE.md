# 文件上传 E2E 测试运行指南

**Phase 4 P4.3**: 文件上传安全测试（真实 MinIO 环境）

## 测试概述

本测试套件验证文件上传功能的安全性和可靠性，包括：

### UI 级别测试（Playwright）
- ✅ 正常文件上传（1KB, 10MB）
- ❌ 文件大小限制验证（拒绝 > 100MB）
- ❌ 路径遍历攻击防护
- ❌ 文件类型白名单验证
- ✅ 并发上传多个文件
- ✅ 文件下载和删除
- 🔒 权限验证（非成员禁止上传）
- ⚡ 压力测试（10个文件快速上传）

### API 级别测试（直接调用后端）
- ✅ MinIO 存储和检索
- ✅ 文件元数据验证

## 前置条件

### 1. 启动基础设施服务

**选项 A：使用 Docker Compose**（推荐）

```bash
# 启动所有服务
docker-compose up -d

# 或仅启动必需服务
docker-compose up -d postgres redis minio meilisearch
```

**选项 B：本地开发环境**

确保以下服务正在运行：
- PostgreSQL (端口 5434)
- Redis (端口 6380)
- MinIO (端口 9000, 9001)
- MeiliSearch (端口 7700)

### 2. 验证 MinIO 连接

```bash
# 访问 MinIO Console
open http://localhost:9001

# 登录凭证
# 用户名: minioadmin
# 密码: minioadmin123

# 检查 bucket 是否存在
# Bucket 名称: cloud-dev-platform
```

### 3. 配置环境变量

确保后端 `.env` 文件包含：

```bash
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=cloud-dev-platform
```

### 4. 运行数据库迁移

```bash
cd apps/backend
pnpm prisma migrate dev
pnpm prisma generate
```

### 5. 启动开发服务器

```bash
# 根目录
pnpm dev

# 或分别启动
# 终端 1: 后端
cd apps/backend && pnpm start:dev

# 终端 2: 前端
cd apps/frontend && pnpm dev
```

## 运行测试

### 运行完整测试套件

```bash
cd apps/frontend

# 运行文件上传安全测试
pnpm playwright test tests/files/file-upload-security.spec.ts

# 带 UI 模式运行（推荐调试）
pnpm playwright test tests/files/file-upload-security.spec.ts --ui

# 仅运行特定测试
pnpm playwright test tests/files/file-upload-security.spec.ts -g "应该成功上传合法的小文件"
```

### 运行所有文件管理测试

```bash
# 包括基础文件管理测试和安全测试
pnpm playwright test tests/files/
```

### 调试模式

```bash
# 使用调试模式运行
pnpm playwright test tests/files/file-upload-security.spec.ts --debug

# 生成详细日志
pnpm playwright test tests/files/file-upload-security.spec.ts --reporter=list --verbose
```

## 测试场景详解

### 场景 1: 正常文件上传

**测试文件**:
- `test-small.js` (1KB)
- `test-medium.ts` (10MB)

**验证点**:
- 文件成功上传到 MinIO
- 文件出现在前端文件列表
- 文件大小和名称正确

**预期结果**: ✅ 测试通过

---

### 场景 2: 文件大小限制

**测试文件**:
- `test-large.zip` (101MB)

**验证点**:
- 后端拒绝上传
- 前端显示错误消息："文件大小超过 100MB 限制"

**预期结果**: ❌ 上传被拒绝，显示错误提示

---

### 场景 3: 路径遍历攻击

**恶意文件名**:
```
../../../etc/passwd
..\\..\\..\\windows\\system32\\config\\sam
test/../../secret.txt
./../admin/config.json
```

**验证点**:
- 后端清理文件名，移除路径遍历字符
- 恶意文件名不会出现在文件系统中
- 文件被拒绝或文件名被清理为安全值

**预期结果**: ❌ 恶意文件名被清理或拒绝

---

### 场景 4: 文件类型白名单

**非法扩展名**:
- `.exe`, `.bat`, `.dll`, `.so.old`, `.sh.bak`

**合法扩展名**:
- `.js`, `.ts`, `.py`, `.java`, `.cpp`, `.go`, `.rs`, `.md`, `.json`

**验证点**:
- 非法扩展名被拒绝
- 合法扩展名被接受

**预期结果**:
- ❌ 非法文件被拒绝
- ✅ 合法文件被接受

---

### 场景 5: 并发上传

**测试文件**:
- 3个文件同时上传

**验证点**:
- 所有文件都成功上传
- 没有数据竞争或冲突
- MinIO 正确处理并发请求

**预期结果**: ✅ 所有文件成功上传

---

### 场景 6: 权限验证

**测试步骤**:
1. 用户 A 登录并进入项目 X
2. 用户 A 登出
3. 用户 B（非项目成员）登录
4. 用户 B 尝试访问项目 X 并上传文件

**验证点**:
- 用户 B 无法访问项目 X 的文件页面
- 显示 403 Forbidden 或被重定向

**预期结果**: ❌ 用户 B 被拒绝访问

---

### 场景 7: 压力测试

**测试文件**:
- 10个文件快速连续上传（间隔 500ms）

**验证点**:
- 至少 70% 的文件成功上传
- 系统不会崩溃或挂起
- MinIO 和后端正确处理高并发

**预期结果**: ⚡ 至少 7/10 文件成功上传

---

## 预期测试结果

### 通过率目标

- **正常流程测试**: 100% 通过（4/4）
- **安全边界测试**: 100% 通过（4/4）
- **集成测试**: 100% 通过（2/2）
- **总体通过率**: 100% (10/10)

### 性能基准

| 指标 | 目标 | 备注 |
|-----|------|------|
| 1KB 文件上传时间 | < 2s | 包括 UI 交互时间 |
| 10MB 文件上传时间 | < 10s | 依赖网络速度 |
| 并发 3 文件上传时间 | < 8s | 所有文件完成 |
| 压力测试通过率 | ≥ 70% | 10 文件中至少 7 个 |

### 测试报告

测试完成后，查看报告：

```bash
# HTML 报告
open apps/frontend/playwright-report/index.html

# 或使用 Playwright 内置服务器
cd apps/frontend
pnpm playwright show-report
```

## 故障排查

### 问题 1: MinIO 连接失败

**错误**: `connect ECONNREFUSED 127.0.0.1:9000`

**解决方法**:
```bash
# 检查 MinIO 是否运行
docker ps | grep minio

# 如果未运行，启动 MinIO
docker-compose up -d minio

# 检查日志
docker logs flotilla-minio
```

---

### 问题 2: Bucket 不存在

**错误**: `The specified bucket does not exist`

**解决方法**:
```bash
# 访问 MinIO Console: http://localhost:9001
# 登录: minioadmin / minioadmin123
# 创建 bucket: cloud-dev-platform

# 或使用 mc CLI
mc alias set local http://localhost:9000 minioadmin minioadmin123
mc mb local/cloud-dev-platform
```

---

### 问题 3: 文件上传按钮不可见

**原因**: 项目不存在或用户无权限

**解决方法**:
```bash
# 运行全局 setup 创建测试数据
cd apps/frontend
pnpm playwright test --project=chromium --grep="@setup"

# 或手动创建测试项目
curl -X POST http://localhost:4000/api/projects \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test Project","description":"For E2E testing"}'
```

---

### 问题 4: 测试超时

**错误**: `Test timeout of 60000ms exceeded`

**解决方法**:
```bash
# 增加超时时间（playwright.config.ts）
# timeout: 120000  // 改为 2 分钟

# 或在测试中设置
test.setTimeout(120000);
```

---

### 问题 5: 文件权限问题（Linux/Mac）

**错误**: `EACCES: permission denied`

**解决方法**:
```bash
# 修复临时目录权限
chmod 755 /tmp
chmod 755 /tmp/flotilla-test-*

# 或使用不同的临时目录
export TMPDIR=~/tmp
mkdir -p ~/tmp
```

## CI/CD 集成

在 GitHub Actions 中运行测试：

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: devplatform
          POSTGRES_PASSWORD: devplatform123
          POSTGRES_DB: cloud_dev_platform
        ports:
          - 5434:5432

      redis:
        image: redis:7-alpine
        ports:
          - 6380:6379

      minio:
        image: minio/minio:latest
        env:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin123
        ports:
          - 9000:9000
          - 9001:9001
        options: >-
          --health-cmd "curl -f http://localhost:9000/minio/health/live"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run migrations
        run: |
          cd apps/backend
          pnpm prisma migrate deploy
          pnpm prisma generate

      - name: Start backend
        run: cd apps/backend && pnpm start:dev &

      - name: Start frontend
        run: cd apps/frontend && pnpm dev &

      - name: Wait for services
        run: sleep 30

      - name: Run E2E tests
        run: cd apps/frontend && pnpm playwright test tests/files/file-upload-security.spec.ts

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/frontend/playwright-report
```

## 性能优化建议

### 1. 使用 Testcontainers（可选）

如果需要完全隔离的测试环境，可以使用 Testcontainers：

```bash
cd apps/backend
pnpm add -D @testcontainers/minio testcontainers
```

```typescript
// test-setup.ts
import { MinioContainer } from '@testcontainers/minio';

let minioContainer: MinioContainer;

export async function setup() {
  minioContainer = await new MinioContainer('minio/minio:latest')
    .withAccessKey('minioadmin')
    .withSecretKey('minioadmin123')
    .start();

  process.env.MINIO_ENDPOINT = minioContainer.getHost();
  process.env.MINIO_PORT = String(minioContainer.getMappedPort(9000));
}

export async function teardown() {
  await minioContainer.stop();
}
```

### 2. 并行测试

```bash
# 使用多个 worker 并行运行
pnpm playwright test tests/files/ --workers=4
```

### 3. 复用浏览器上下文

```typescript
// 使用 test.describe.configure() 复用上下文
test.describe.configure({ mode: 'serial' });
```

## 相关文档

- [Playwright 文档](https://playwright.dev/)
- [MinIO 文档](https://min.io/docs/)
- [Testcontainers 文档](https://node.testcontainers.org/)
- [Phase 3 文件上传安全报告](../docs/reports/PHASE_3_COMPLETION_REPORT.md)

---

**创建时间**: 2025-12-04
**Phase**: 4 P4.3
**维护者**: Claude (Sonnet 4.5)
**相关文件**:
- `apps/frontend/tests/files/file-upload-security.spec.ts`
- `apps/backend/src/files/files.service.ts`
- `apps/backend/src/files/files.service.spec.ts`
