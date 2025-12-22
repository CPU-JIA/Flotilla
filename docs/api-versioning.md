# Flotilla API 版本控制指南

## 概述

Flotilla API 使用 **URI 版本控制** 策略来管理 API 的演进和向后兼容性。所有 API 端点都带有明确的版本前缀，确保客户端能够稳定地集成我们的服务。

## 版本控制策略

### URI 版本控制

所有 API 端点遵循以下格式：

```
/api/v{version}/{resource}
```

**示例：**
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/projects` - 获取项目列表
- `POST /api/v1/projects/{id}/issues` - 创建 Issue

### 当前版本

- **主版本**: v1
- **发布日期**: 2024
- **状态**: 稳定（Stable）

## 版本演进规则

### 1. 向后兼容的变更（不需要新版本）

以下变更被认为是向后兼容的，可以在现有版本中实施：

- ✅ 添加新的端点
- ✅ 添加新的可选参数
- ✅ 添加新的响应字段
- ✅ 修复 Bug
- ✅ 性能优化
- ✅ 内部实现改进

### 2. 破坏性变更（需要新的主版本）

以下变更被认为是破坏性的，需要发布新的主版本（v2, v3 等）：

- ❌ 移除或重命名端点
- ❌ 移除或重命名请求/响应字段
- ❌ 更改字段的数据类型
- ❌ 更改必需参数
- ❌ 更改认证机制
- ❌ 更改错误响应格式

## 版本生命周期

### 阶段 1: 稳定（Stable）
- 完全支持和维护
- 接收 Bug 修复和安全补丁
- 推荐用于生产环境

### 阶段 2: 弃用（Deprecated）
- 宣布弃用日期（通常在新版本发布时）
- 继续支持至少 **6 个月**
- 响应头包含弃用警告：`X-API-Deprecated: true; version=v1; sunset=2025-12-31`
- 建议客户端迁移到新版本

### 阶段 3: 停用（Sunset）
- 不再接受新的集成
- 仅提供严重 Bug 和安全修复
- 最后支持日期明确公布

### 阶段 4: 下线（Retired）
- API 端点返回 410 Gone 状态码
- 强制要求升级到新版本

## 迁移指南

### 从旧版本迁移到 v1

#### 1. 更新 API 基础 URL

**之前（无版本）：**
```javascript
const API_BASE_URL = 'http://localhost:4000/api'
```

**现在（v1）：**
```javascript
const API_BASE_URL = 'http://localhost:4000/api/v1'
```

#### 2. 更新所有 API 调用

**之前：**
```http
POST /api/auth/login
GET /api/projects
POST /api/projects/123/issues
```

**现在：**
```http
POST /api/v1/auth/login
GET /api/v1/projects
POST /api/v1/projects/123/issues
```

#### 3. 更新环境变量

**.env 文件：**
```bash
# 之前
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# 现在
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

#### 4. 更新 Cookie 路径（如果使用认证）

**后端 Cookie 路径：**
```javascript
// refreshToken Cookie 路径
path: '/api/v1/auth/refresh'  // 之前: '/api/auth/refresh'
```

## 版本检测

### 通过响应头

所有 API 响应都包含版本信息头：

```http
X-API-Version: 1.0
X-API-Deprecated: false
```

### 通过 Swagger 文档

访问 Swagger UI 查看当前 API 版本和所有可用端点：

```
http://localhost:4000/api/docs
```

## 最佳实践

### 客户端实现建议

1. **使用环境变量管理 API URL**
   ```javascript
   const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
   ```

2. **集中管理 API 调用**
   ```javascript
   // lib/api.ts
   export const api = {
     auth: {
       login: (data) => apiRequest('/auth/login', { method: 'POST', body: data }),
       // ...
     },
     // ...
   }
   ```

3. **监听弃用警告**
   ```javascript
   function apiRequest(endpoint, options) {
     const response = await fetch(`${API_BASE_URL}${endpoint}`, options)

     // 检查弃用警告
     const deprecated = response.headers.get('X-API-Deprecated')
     if (deprecated === 'true') {
       console.warn('API endpoint is deprecated:', endpoint)
     }

     return response
   }
   ```

4. **实现版本回退机制**
   ```javascript
   async function apiRequestWithFallback(endpoint, options, versions = ['v2', 'v1']) {
     for (const version of versions) {
       try {
         return await fetch(`/api/${version}${endpoint}`, options)
       } catch (error) {
         console.warn(`API ${version} failed, trying next version`)
       }
     }
     throw new Error('All API versions failed')
   }
   ```

## 特殊端点

### 不受版本控制的端点

以下端点不包含版本前缀（因为它们有特殊用途）：

- `GET /monitoring/health` - 健康检查（用于负载均衡器）
- `GET /repo/{projectId}/info/refs` - Git HTTP Smart Protocol
- `POST /repo/{projectId}/git-upload-pack` - Git 克隆/拉取
- `POST /repo/{projectId}/git-receive-pack` - Git 推送

这些端点的稳定性由其各自的协议标准保证。

## 版本历史

### v1 (2024-present)

**发布日期**: 2024

**主要特性**:
- 完整的 REST API
- JWT 认证（HttpOnly Cookie）
- 基于角色的权限控制（RBAC）
- Git HTTP Smart Protocol 支持
- WebSocket 实时通知
- MeiliSearch 代码搜索
- Raft 分布式共识

**端点总览**:
- **认证**: `/api/v1/auth/*`
- **用户**: `/api/v1/users/*`
- **项目**: `/api/v1/projects/*`
- **仓库**: `/api/v1/projects/{id}/repository/*`
- **Issues**: `/api/v1/projects/{id}/issues/*`
- **Pull Requests**: `/api/v1/pull-requests/*`
- **组织**: `/api/v1/organizations/*`
- **团队**: `/api/v1/organizations/{slug}/teams/*`
- **搜索**: `/api/v1/search`
- **通知**: `/api/v1/notifications/*`
- **管理员**: `/api/v1/admin/*`
- **文件**: `/api/v1/files/*`
- **审计日志**: `/api/v1/audit/*`
- **Raft 集群**: `/api/v1/raft-cluster/*`

## 未来版本规划

### v2 (计划中)

**可能包含的变更**:
- GraphQL API 支持
- 改进的分页机制（Cursor-based pagination）
- 批量操作端点
- Webhook 系统

**迁移时间表**:
- v2 Beta: TBD
- v2 Stable: TBD
- v1 弃用: v2 稳定后 6 个月
- v1 下线: v2 稳定后 12 个月

## 支持与反馈

如果您在 API 版本迁移过程中遇到问题，请：

1. 查阅 [API 文档](http://localhost:4000/api/docs)
2. 阅读 [CHANGELOG.md](../CHANGELOG.md)
3. 提交 [GitHub Issue](https://github.com/your-org/flotilla/issues)
4. 联系技术支持

## 相关文档

- [API 文档（Swagger）](http://localhost:4000/api/docs)
- [认证指南](./authentication.md)
- [权限系统](./permissions.md)
- [错误处理](./error-handling.md)
- [速率限制](./rate-limiting.md)

---

**最后更新**: 2024-12-22
**维护者**: Flotilla Team
