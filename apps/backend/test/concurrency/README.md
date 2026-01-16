# 原子计数器并发测试 - 运行指南

## 📋 测试概述

本测试套件验证 Flotilla 的原子计数器（Issue/PR 编号生成）在高并发场景下的正确性和性能。

### 测试文件位置

- **测试套件**: `apps/backend/test/concurrency/atomic-counters.e2e-spec.ts`
- **辅助函数**: `apps/backend/test/concurrency/concurrency-test.helper.ts`

## 🎯 测试场景

### 1. Issue 编号并发测试

| 测试场景 | 并发数 | 性能目标 | 验证项           |
| -------- | ------ | -------- | ---------------- |
| 基础并发 | 10     | < 1秒    | 编号连续、无重复 |
| 中等并发 | 50     | < 5秒    | 编号唯一、无冲突 |
| 高并发   | 100    | < 10秒   | 编号唯一、无冲突 |
| 连续创建 | 20     | N/A      | 编号严格递增     |

### 2. PR 编号并发测试

| 测试场景 | 并发数 | 性能目标 | 验证项           |
| -------- | ------ | -------- | ---------------- |
| 基础并发 | 10     | < 1秒    | 编号连续、无重复 |

### 3. 混合并发测试

| 测试场景        | 并发数     | 性能目标 | 验证项             |
| --------------- | ---------- | -------- | ------------------ |
| Issue + PR 混合 | 10 (5+5)   | < 2秒    | 两个计数器独立工作 |
| 高负载混合      | 50 (25+25) | < 5秒    | 无死锁、无竞态条件 |

### 4. 性能基准测试

| 测试场景     | 并发数 | 性能目标 | 验证项          |
| ------------ | ------ | -------- | --------------- |
| 基准测试     | 100    | < 10秒   | 平均响应时间    |
| 数据库一致性 | N/A    | N/A      | 最大编号 = 总数 |

## 🚀 运行测试

### 前置条件

#### 1. 启动基础设施服务

```bash
# 在项目根目录
docker-compose up -d
```

确保以下服务运行正常：

- PostgreSQL (端口 5434)
- Redis (端口 6380)
- MinIO (端口 9000/9001)
- MeiliSearch (端口 7700)

#### 2. 运行数据库迁移

```bash
cd apps/backend
pnpm prisma migrate dev
```

#### 3. 配置环境变量

确保 `apps/backend/.env` 包含以下配置：

```env
DATABASE_URL="postgresql://user:password@localhost:5434/flotilla?schema=public"
OAUTH_ENCRYPTION_KEY="test_key_for_e2e_testing_12345678901234567890"
JWT_SECRET="test_jwt_secret_1234567890123456789012345678901234567890"
JWT_REFRESH_SECRET="test_jwt_refresh_secret_1234567890123456789012345678901234567890"
TWO_FACTOR_ENCRYPTION_KEY="test_2fa_key_12345678901234567890123456789012"
```

### 运行测试命令

#### 运行所有并发测试

```bash
cd apps/backend
pnpm test:e2e --testPathPattern=atomic-counters
```

#### 运行特定测试组

```bash
# Issue 编号并发测试
pnpm test:e2e --testPathPattern=atomic-counters -t "Issue Number Concurrency"

# PR 编号并发测试
pnpm test:e2e --testPathPattern=atomic-counters -t "PR Number Concurrency"

# 混合并发测试
pnpm test:e2e --testPathPattern=atomic-counters -t "Mixed Concurrency"

# 性能基准测试
pnpm test:e2e --testPathPattern=atomic-counters -t "Performance Benchmarks"
```

#### 查看详细日志

```bash
pnpm test:e2e --testPathPattern=atomic-counters --verbose
```

## ✅ 验证标准

### 正确性验证

- ✅ **编号连续**: 从 1 开始，无跳号
- ✅ **编号唯一**: 无重复编号
- ✅ **计数器独立**: Issue 和 PR 计数器互不干扰
- ✅ **数据库一致性**: 最大编号 = 总记录数

### 性能验证

- ✅ **10并发**: < 1秒
- ✅ **50并发**: < 5秒
- ✅ **100并发**: < 10秒
- ✅ **无死锁**: 所有请求都能成功完成
- ✅ **无竞态条件**: 原子操作保证数据一致性

## 📊 预期输出示例

```bash
PASS test/concurrency/atomic-counters.e2e-spec.ts
  Atomic Counters - Concurrency Tests (e2e)
    Issue Number Concurrency
      ✓ should generate sequential numbers under 10 concurrent requests (245ms)
      ✅ 10 concurrent Issue creates completed in 245ms
      ✓ should handle 50 concurrent requests without conflicts (987ms)
      ✅ 50 concurrent Issue creates completed in 987ms
      ✓ should maintain consistency under 100 concurrent creates (1823ms)
      ✅ 100 concurrent Issue creates completed in 1823ms
      ✓ should maintain consistency under rapid sequential creates (156ms)
      ✅ Sequential Issue creates maintain correct order
    PR Number Concurrency
      ✓ should generate sequential PR numbers under concurrent load (312ms)
      ✅ 10 concurrent PR creates completed in 312ms
    Mixed Concurrency
      ✓ should handle Issue and PR creation concurrently (423ms)
      ✅ Mixed 10 concurrent creates (5 Issues + 5 PRs) completed in 423ms
      ✓ should not have deadlocks under high mixed load (2145ms)
      ✅ Heavy mixed load (50 concurrent creates) completed in 2145ms without deadlocks
    Performance Benchmarks
      ✓ should complete 100 concurrent creates in under 10 seconds (2987ms)
      ✅ 100 concurrent creates completed in 2987ms
         Average time per create: 29.87ms
      ✓ should verify database consistency after all tests (45ms)
      ✅ Database consistency verified:
         Total Issues: 285, Max Number: 285
         Total PRs: 45, Max Number: 45

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        12.456 s
```

## 🔧 故障排查

### 数据库连接失败

```
Error: Can't reach database server at 127.0.0.1:5434
```

**解决方案**:

```bash
# 检查 Docker 服务是否运行
docker-compose ps

# 重启数据库服务
docker-compose restart postgres
```

### 测试超时

```
Error: Timeout - Async callback was not invoked within the 5000 ms timeout
```

**解决方案**:

- 增加 Jest 超时配置（已在 `test/jest-e2e.json` 中配置）
- 检查数据库性能
- 减少并发数量

### OAUTH_ENCRYPTION_KEY 错误

```
Error: OAUTH_ENCRYPTION_KEY must be at least 32 characters long
```

**解决方案**:

```bash
# 在 .env 中添加
echo 'OAUTH_ENCRYPTION_KEY="test_key_for_e2e_testing_12345678901234567890"' >> apps/backend/.env
```

## 📝 技术实现细节

### 原子计数器实现

```typescript
// apps/backend/src/issues/issues.service.ts
private async getNextIssueNumber(projectId: string): Promise<number> {
  const project = await this.prisma.$queryRaw<Array<{ nextissuenumber: number }>>`
    UPDATE projects
    SET "nextIssueNumber" = "nextIssueNumber" + 1
    WHERE id = ${projectId}
    RETURNING "nextIssueNumber"
  `;
  return project[0].nextissuenumber;
}
```

### 关键特性

1. **原子性**: 使用数据库的 `UPDATE ... RETURNING` 语句保证原子操作
2. **隔离性**: 每个计数器独立（Issue 和 PR 分别计数）
3. **一致性**: 数据库约束 `@@unique([projectId, number])` 防止重复
4. **性能**: 直接 SQL 查询，避免 ORM 开销

## 🎓 学习参考

### 相关文件

- 数据库模型: `apps/backend/prisma/schema.prisma` (line 196-198)
- Issue Service: `apps/backend/src/issues/issues.service.ts` (line 29-44)
- PR Service: `apps/backend/src/pull-requests/pull-requests.service.ts` (line 44-59)

### 并发测试最佳实践

1. 使用真实的数据库而非 Mock
2. 测试多种并发级别 (10, 50, 100)
3. 验证数据一致性而非仅性能
4. 清理测试数据，避免污染
5. 记录性能指标，建立基线

## 📈 性能优化建议

如果测试性能不达标，可考虑：

1. **数据库优化**
   - 增加连接池大小
   - 优化索引
   - 调整 PostgreSQL 配置

2. **应用层优化**
   - 批量操作
   - 缓存预热
   - 减少不必要的查询

3. **基础设施优化**
   - 使用 SSD 存储
   - 增加数据库内存
   - 优化网络延迟

## 📚 附加资源

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [PostgreSQL Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html)
- [Prisma Raw Database Access](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
