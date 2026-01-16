# 性能基准测试 - 原子计数器优化

## 概述

本目录包含针对原子计数器优化的性能基准测试。这些测试量化验证了从 `SELECT + INSERT` 方式迁移到 `UPDATE ... RETURNING` 原子操作的性能改进。

## 测试文件

### 1. `performance.utils.ts`

性能测试工具函数库，包含：

- 百分位数计算
- 标准差计算
- 性能指标分析
- 报告格式化

### 2. `performance-report.generator.ts`

性能报告生成器，支持：

- 生成详细的性能报告
- 对比分析（修复前后）
- Markdown和JSON格式输出
- 性能总结生成

### 3. `atomic-counters.perf.spec.ts`

综合性能基准测试套件，包含：

- 原子计数器优化分析
- 数据库查询效率验证
- 性能阈值检查
- 可扩展性分析
- 优化建议

### 4. `issue-creation.perf.spec.ts`

Issue创建性能测试，包含：

- 响应时间基准测试（50次迭代）
- PR创建时间对比
- 吞吐量测试（5秒内创建数量）
- 并发创建测试
- 数据库查询分析

### 5. `pull-request-creation.perf.spec.ts`

PR创建性能测试，包含：

- 响应时间基准测试（30次迭代）
- Issue vs PR创建时间对比
- 吞吐量测试（3秒内创建数量）
- 并发创建测试
- 原子计数器验证

## 运行测试

### 前置条件

```bash
# 安装依赖
pnpm install

# 启动基础设施
docker-compose up -d

# 运行数据库迁移
cd apps/backend
pnpm prisma migrate dev
```

### 运行所有性能测试

```bash
cd apps/backend

# 运行所有性能测试
pnpm jest --config jest-perf.config.js

# 或使用npm脚本（如果已配置）
pnpm test:perf
```

### 运行特定测试

```bash
# 只运行Issue创建性能测试
pnpm jest --config jest-perf.config.js issue-creation.perf.spec.ts

# 只运行PR创建性能测试
pnpm jest --config jest-perf.config.js pull-request-creation.perf.spec.ts

# 只运行综合性能测试
pnpm jest --config jest-perf.config.js atomic-counters.perf.spec.ts
```

### 生成详细报告

```bash
# 运行测试并生成详细输出
pnpm jest --config jest-perf.config.js --verbose

# 生成覆盖率报告
pnpm jest --config jest-perf.config.js --coverage
```

## 性能指标

### Issue创建性能目标

| 指标         | 目标值      | 说明                    |
| ------------ | ----------- | ----------------------- |
| 平均响应时间 | < 200ms     | 单次Issue创建平均耗时   |
| P95响应时间  | < 300ms     | 95%的请求在此时间内完成 |
| P99响应时间  | < 500ms     | 99%的请求在此时间内完成 |
| 吞吐量       | > 5 ops/sec | 每秒创建Issue数量       |

### PR创建性能目标

| 指标         | 目标值      | 说明                    |
| ------------ | ----------- | ----------------------- |
| 平均响应时间 | < 250ms     | 单次PR创建平均耗时      |
| P95响应时间  | < 400ms     | 95%的请求在此时间内完成 |
| P99响应时间  | < 600ms     | 99%的请求在此时间内完成 |
| 吞吐量       | > 3 ops/sec | 每秒创建PR数量          |

## 性能改进分析

### 原子计数器优化

**旧方式（SELECT + INSERT）**

```
1. SELECT "nextIssueNumber" FROM projects WHERE id = ?
   └─ 查询时间: ~10ms
2. INSERT INTO issues (number, ...) VALUES (?, ...)
   └─ 查询时间: ~15ms
─────────────────────────────────────────────────
总耗时: ~25ms + 2次网络往返
风险: SELECT和INSERT之间存在竞态条件
```

**新方式（UPDATE RETURNING）**

```
1. UPDATE projects SET "nextIssueNumber" = "nextIssueNumber" + 1
   WHERE id = ? RETURNING "nextIssueNumber"
   └─ 查询时间: ~12ms (原子操作)
─────────────────────────────────────────────────
总耗时: ~12ms + 1次网络往返
优势: 原子操作，无竞态条件
```

### 预期改进

- ✅ 响应时间提升 50% (25ms → 12ms)
- ✅ 数据库往返次数减少 50% (2 → 1)
- ✅ 完全消除竞态条件
- ✅ 并发负载下可扩展性更好

## 测试输出示例

```
📊 Issue Creation Response Time:
  - Count: 50
  - Total Time: 8234.56ms
  - Average: 164.69ms
  - Min: 120.45ms
  - Max: 245.32ms
  - P50: 160.12ms
  - P95: 210.34ms
  - P99: 235.67ms
  - StdDev: 28.45ms

✅ Issue Creation Throughput:
  - Duration: 5000.00ms
  - Count: 32
  - Throughput: 6.40 creates/sec
  - Avg Time Per Op: 156.25ms
```

## 报告生成

性能测试完成后，会自动生成JSON格式的详细报告：

```
📄 Report saved to: test/performance/reports/benchmark-2024-01-15T10-30-45-123Z.json
```

报告包含：

- 测试时间戳
- 环境信息（Node版本、平台、CPU数量）
- 详细的性能指标
- 性能建议
- 测试状态（PASS/WARNING/FAIL）

## 性能优化建议

### 高优先级（易实现，高收益）

1. **连接池优化**
   - 根据并发用户数调整Prisma连接池大小
   - 预期改进: 5-10%

2. **查询缓存**
   - 缓存项目元数据（TTL: 5分钟）
   - 预期改进: 10-15%

### 中优先级（中等难度，中等收益）

3. **异步通知**
   - 将通知发送移至异步队列（Bull/RabbitMQ）
   - 预期改进: 20-30%

4. **批量操作**
   - 支持批量创建Issue/PR的端点
   - 预期改进: 30-50%

### 低优先级（难实现，高收益）

5. **读副本**
   - 使用数据库读副本处理读操作
   - 预期改进: 15-20%

6. **数据库分片**
   - 按项目ID分片数据库
   - 预期改进: 30-50%

## 故障排除

### 测试超时

如果测试超时，检查：

1. 数据库连接是否正常
2. 是否有其他进程占用资源
3. 增加Jest超时时间：`--testTimeout=180000`

### 性能指标不达标

如果性能指标未达到目标：

1. 检查数据库索引是否正确创建
2. 验证数据库连接池配置
3. 检查系统资源使用情况
4. 查看数据库慢查询日志

### 并发测试失败

如果并发测试失败：

1. 检查数据库连接池大小
2. 验证是否有死锁
3. 检查事务隔离级别
4. 增加测试超时时间

## 相关文档

- [ECP工程原则](../../docs/ECP.md)
- [性能优化指南](../../docs/PERFORMANCE.md)
- [数据库设计](../../docs/DATABASE.md)

## 贡献

如需添加新的性能测试：

1. 在 `test/performance/` 目录创建新文件
2. 使用 `*.perf.spec.ts` 命名约定
3. 导入性能工具函数
4. 遵循AAA测试模式
5. 添加详细的性能指标输出

## 许可证

MIT
