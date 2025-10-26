# Git HTTP Smart Protocol 使用指南

## 概述

Flotilla平台实现了完整的Git HTTP Smart Protocol，支持标准Git客户端通过HTTP协议进行clone、fetch和push操作。

**实现状态**: ✅ 100% Functional (Verified 2025-10-26)

---

## 快速开始

### 1. Clone仓库

```bash
git clone http://localhost:4000/api/repo/{PROJECT_ID}
```

**示例**:
```bash
git clone http://localhost:4000/api/repo/cmh74cgrp0002xbuwtdv3t7g3 my-project
cd my-project
```

### 2. 添加Remote（现有本地仓库）

```bash
git remote add origin http://localhost:4000/api/repo/{PROJECT_ID}
git push -u origin main
```

### 3. 日常操作

```bash
# 拉取最新更改
git pull origin main

# 推送更改
git add .
git commit -m "feat: add new feature"
git push origin main

# 创建并推送新分支
git checkout -b feature/new-feature
git push origin feature/new-feature
```

---

## URL格式

### 基础URL

```
http://{HOST}:{PORT}/api/repo/{PROJECT_ID}
```

**参数说明**:
- `HOST`: 服务器主机地址（开发环境: localhost）
- `PORT`: 服务器端口（默认: 4000）
- `PROJECT_ID`: 项目的CUID（从项目详情页获取）

**示例**:
- 本地开发: `http://localhost:4000/api/repo/cmh74cgrp0002xbuwtdv3t7g3`
- 生产环境: `https://flotilla.com/api/repo/{PROJECT_ID}`

---

## 支持的Git操作

| 操作 | 命令 | 状态 |
|------|------|------|
| **Clone** | `git clone http://.../repo/{id}` | ✅ |
| **Fetch** | `git fetch origin` | ✅ |
| **Pull** | `git pull origin main` | ✅ |
| **Push** | `git push origin main` | ✅ |
| **Push新分支** | `git push origin feature-branch` | ✅ |
| **删除远程分支** | `git push origin --delete branch-name` | ✅ |
| **Force Push** | `git push --force origin main` | ⚠️ 可用但不推荐 |

---

## HTTP Smart Protocol Endpoints

Flotilla实现了完整的Git HTTP Smart Protocol，包含以下endpoints：

### 1. Info/Refs Endpoint

**请求**:
```
GET /api/repo/{PROJECT_ID}/info/refs?service=git-upload-pack
GET /api/repo/{PROJECT_ID}/info/refs?service=git-receive-pack
```

**响应**: Git pkt-line格式的refs列表

**用途**: Git客户端discovery阶段，获取仓库的refs（branches, tags）

### 2. Upload Pack Endpoint (Clone/Fetch)

**请求**:
```
POST /api/repo/{PROJECT_ID}/git-upload-pack
Content-Type: application/x-git-upload-pack-request
```

**响应**: Git packfile (application/x-git-upload-pack-result)

**用途**: 传输Git objects给客户端（clone/fetch）

### 3. Receive Pack Endpoint (Push)

**请求**:
```
POST /api/repo/{PROJECT_ID}/git-receive-pack
Content-Type: application/x-git-receive-pack-request
```

**响应**: Push result (application/x-git-receive-pack-result)

**用途**: 接收客户端推送的Git objects和refs更新

---

## 认证方式

### 当前状态（Phase 1）

**所有Git endpoints标记为 `@Public()`**，无需认证即可访问。

**原因**:
- Phase 1专注于功能验证
- 简化开发和测试流程

### 未来计划（Phase 2）

**HTTP Basic Authentication**:
```bash
git clone http://username:token@localhost:4000/api/repo/{PROJECT_ID}
```

**Personal Access Token (PAT)**:
```bash
# 使用PAT作为密码
git clone http://username@localhost:4000/api/repo/{PROJECT_ID}
Password: {YOUR_PERSONAL_ACCESS_TOKEN}
```

**OAuth 2.0**:
```bash
# 通过OAuth flow获取token
git clone http://oauth2:{TOKEN}@localhost:4000/api/repo/{PROJECT_ID}
```

---

## 技术实现细节

### 架构

```
Git Client (git CLI)
    ↓ HTTP Smart Protocol
NestJS GitHttpController
    ↓ Spawn git http-backend
System Git Binary (git http-backend)
    ↓ Read/Write
Bare Git Repository (filesystem)
```

### 关键文件

**Backend实现**:
- `apps/backend/src/git/git-http.controller.ts` - HTTP endpoints
- `apps/backend/src/git/protocols/http-smart.service.ts` - Git http-backend wrapper
- `apps/backend/src/config/git.config.ts` - Repository storage path

**存储配置**:
- 默认路径: `apps/backend/repos/{PROJECT_ID}/`
- 环境变量: `GIT_STORAGE_PATH` (可覆盖默认路径)
- 仓库格式: Bare repository (无 `.git` 子目录)

### Body Parser配置

```typescript
// apps/backend/src/main.ts
app.use('/api/repo/:projectId/git-upload-pack',
  bodyParser.raw({ type: '*/*', limit: '50mb' }));
app.use('/api/repo/:projectId/git-receive-pack',
  bodyParser.raw({ type: '*/*', limit: '50mb' }));
```

**限制**:
- 最大packfile大小: 50MB
- 适用于中小型仓库
- 大型仓库建议使用SSH协议（Phase 2）

---

## 故障排查

### 问题1: git clone失败 "Repository not found"

**原因**: 项目ID错误或仓库未初始化

**解决**:
```bash
# 1. 确认项目ID正确
curl http://localhost:4000/api/projects/{PROJECT_ID}

# 2. 检查仓库是否存在
ls -la apps/backend/repos/{PROJECT_ID}

# 3. 如果不存在，初始化仓库
curl -X POST http://localhost:4000/api/git/{PROJECT_ID}/init \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"authorName": "Your Name", "authorEmail": "you@example.com"}'
```

### 问题2: git push失败 "unable to access"

**原因**: Backend服务未运行或端口错误

**解决**:
```bash
# 1. 检查backend是否运行
curl http://localhost:4000/api

# 2. 检查端口配置
# .env文件中确认PORT=4000

# 3. 检查防火墙/代理设置
```

### 问题3: push后看不到新commit

**原因**: 可能是分支问题

**解决**:
```bash
# 1. 检查当前分支
git branch -a

# 2. 确认push到正确分支
git push origin {BRANCH_NAME}

# 3. 验证服务器端仓库
cd apps/backend/repos/{PROJECT_ID}
git log --oneline --all
```

### 问题4: "error: RPC failed; HTTP 413"

**原因**: Packfile超过50MB限制

**解决**:
```bash
# 方案1: 调整body parser limit (main.ts)
limit: '100mb'  // 增加限制

# 方案2: 使用Git shallow clone
git clone --depth 1 http://localhost:4000/api/repo/{PROJECT_ID}

# 方案3: 分批push小的commits
```

---

## 性能优化建议

### 1. 大型仓库优化

```bash
# 使用shallow clone
git clone --depth 1 http://localhost:4000/api/repo/{PROJECT_ID}

# 仅克隆特定分支
git clone -b main --single-branch http://localhost:4000/api/repo/{PROJECT_ID}

# 使用sparse-checkout
git clone --filter=blob:none http://localhost:4000/api/repo/{PROJECT_ID}
```

### 2. 网络优化

```bash
# 启用Git压缩
git config --global core.compression 9

# 使用HTTP/2
# 生产环境使用HTTPS + HTTP/2

# 启用Git protocol v2
git config --global protocol.version 2
```

### 3. 服务器端优化

```bash
# Git仓库垃圾回收
cd apps/backend/repos/{PROJECT_ID}
git gc --aggressive --prune=now

# 定期打包objects
git repack -a -d

# 清理悬空对象
git fsck --unreachable
git prune
```

---

## 限制与已知问题

### 当前限制

1. **无认证**: 所有仓库当前为public（Phase 2将添加认证）
2. **单服务器**: 无分布式Git replica（Phase 3规划）
3. **无LFS支持**: Git Large File Storage尚未实现
4. **无Shallow clone优化**: 服务器端尚未优化shallow clone性能

### 与GitHub/GitLab的差异

| 功能 | Flotilla (Phase 1) | GitHub/GitLab |
|------|-------------------|---------------|
| HTTP Smart Protocol | ✅ | ✅ |
| SSH Protocol | ❌ (Phase 2) | ✅ |
| Git LFS | ❌ | ✅ |
| GPG签名验证 | ❌ | ✅ |
| 分支保护 | ⚠️ PR层面 (Phase 1.3) | ✅ Git push层面 |
| Webhooks | ❌ (Phase 4) | ✅ |

---

## 测试验证

### 验证脚本

完整的验证脚本位于项目根目录：
- `test-git-complete.sh` - 完整的clone/push测试
- `test-git-init.sh` - 仓库初始化测试
- `test-git-init-retry.sh` - 初始化重试机制测试

### 手动验证步骤

```bash
# 1. 注册测试用户
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "git_tester", "email": "test@example.com", "password": "Test123!"}'

# 2. 创建测试项目
TOKEN="your_access_token"
curl -X POST http://localhost:4000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-repo", "description": "Test repository"}'

# 3. 获取项目ID
PROJECT_ID="..."  # 从响应中获取

# 4. Clone仓库
git clone http://localhost:4000/api/repo/$PROJECT_ID test-clone
cd test-clone

# 5. 创建修改并push
echo "# Test" > TEST.md
git add TEST.md
git commit -m "test: add TEST.md"
git push origin main

# 6. 验证服务器端
cd ../../apps/backend/repos/$PROJECT_ID
git log --oneline --all
```

---

## 分支保护集成 (Branch Protection)

**实现状态**: ✅ Fully Implemented (2025-10-26)

### 概述

Flotilla通过Git pre-receive hook实现了Git push层面的分支保护，在代码推送到服务器时实时验证分支保护规则，确保企业级代码安全。

### 工作原理

```
用户执行 git push
    ↓
Git客户端发送pack data
    ↓
Git服务器接收数据
    ↓
执行 pre-receive hook (BEFORE accepting refs)
    ↓
Hook查询Branch Protection API
    ↓
验证规则:
  - requirePullRequest (禁止直接push)
  - allowForcePushes (禁止force push)
  - allowDeletions (禁止删除分支)
    ↓
  [PASS] ✅ 接受push
  [FAIL] ❌ 拒绝push,返回错误信息
```

### 支持的保护规则

| 规则 | 说明 | Hook行为 |
|------|------|----------|
| `requirePullRequest` | 要求通过Pull Request更新 | ❌ 阻止所有直接push |
| `allowForcePushes` | 是否允许强制推送 | ❌ 阻止force push |
| `allowDeletions` | 是否允许删除分支 | ❌ 阻止branch deletion |
| `requiredApprovingReviews` | 所需审批数量 | ⚠️ PR层面验证 |

### Hook安装

Pre-receive hook在仓库初始化时自动安装:

```typescript
// apps/backend/src/git/git.service.ts
async init(projectId: string, defaultBranch = 'main'): Promise<void> {
  // ...
  await this.installPreReceiveHook(dir, projectId);
}
```

**Hook位置**: `apps/backend/repos/{PROJECT_ID}/hooks/pre-receive`

### API集成

Hook通过公开API端点获取分支保护规则:

```bash
# API endpoint (无需认证)
GET /api/projects/:projectId/branch-protection

# 响应示例
[
  {
    "branchPattern": "main",
    "requirePullRequest": true,
    "allowForcePushes": false,
    "allowDeletions": false
  }
]
```

**为什么GET端点公开?**
- Pre-receive hook在Git服务器上下文运行,无法提供用户JWT token
- 分支保护规则是公开策略,不包含敏感信息
- 仅GET端点公开,POST/PATCH/DELETE仍需认证

### 错误消息示例

#### 1. Direct Push被阻止

```bash
$ git push origin main
remote: [BRANCH PROTECTION] Direct push to 'main' is not allowed
remote: [BRANCH PROTECTION] This branch is protected and requires pull requests
remote: [BRANCH PROTECTION]
remote: [BRANCH PROTECTION] To update this branch:
remote: [BRANCH PROTECTION]   1. Create a feature branch: git checkout -b feature/my-changes
remote: [BRANCH PROTECTION]   2. Push your changes: git push origin feature/my-changes
remote: [BRANCH PROTECTION]   3. Create a Pull Request through the web interface
remote: [BRANCH PROTECTION]   4. Wait for approval and merge via PR
To http://localhost:4000/api/repo/cmh761u400002xbekzqfn3g9t
 ! [remote rejected] main -> main (pre-receive hook declined)
error: failed to push some refs
```

#### 2. Force Push被阻止

```bash
$ git push origin main --force
remote: [BRANCH PROTECTION] Detected force push to: main
remote: [BRANCH PROTECTION] Force push to 'main' is not allowed
remote: [BRANCH PROTECTION] Branch protection rule prevents force push operations
remote: [BRANCH PROTECTION]
remote: [BRANCH PROTECTION] To force push, either:
remote: [BRANCH PROTECTION]   1. Update branch protection rules to allow force pushes
remote: [BRANCH PROTECTION]   2. Use a regular (fast-forward) push
To http://localhost:4000/api/repo/cmh761u400002xbekzqfn3g9t
 ! [remote rejected] main -> main (pre-receive hook declined)
error: failed to push some refs
```

#### 3. Branch Deletion被阻止

```bash
$ git push origin :main
remote: [BRANCH PROTECTION] Checking branch deletion permission for: main
remote: [BRANCH PROTECTION] Branch 'main' is protected against deletion
remote: [BRANCH PROTECTION] To delete this branch, update branch protection rules first
To http://localhost:4000/api/repo/cmh761u400002xbekzqfn3g9t
 ! [remote rejected] main (pre-receive hook declined)
error: failed to push some refs
```

### 配置分支保护

```bash
# 1. 创建分支保护规则
curl -X POST http://localhost:4000/api/projects/$PROJECT_ID/branch-protection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchPattern": "main",
    "requirePullRequest": true,
    "allowForcePushes": false,
    "allowDeletions": false
  }'

# 2. 测试direct push (应该被阻止)
git push origin main

# 3. 正确的工作流程
git checkout -b feature/my-feature
git push origin feature/my-feature
# 然后通过Web界面创建PR
```

### E2E测试验证

所有分支保护场景已通过E2E测试:

```bash
# 测试脚本位于项目根目录
test-data/
├── test-user.json                  # 测试用户凭证
├── branch-protection.json          # 分支保护规则
├── push-test-output.txt            # Direct push测试结果
├── force-push-test-output.txt      # Force push测试结果
└── branch-delete-test-output.txt   # Branch deletion测试结果
```

**测试结果**:
- ✅ Direct push to protected branch - BLOCKED
- ✅ Force push to protected branch - BLOCKED
- ✅ Branch deletion - BLOCKED

### Fail-Open策略

如果无法获取分支保护规则(API不可达),hook采用fail-open策略:

```bash
remote: [BRANCH PROTECTION] Cannot fetch branch protection rules (HTTP 500), allowing push
```

**原因**: 确保向后兼容性,避免因API故障导致所有Git操作中断。

**安全考虑**: 生产环境应监控hook失败率,并配置API高可用。

### 故障排查

#### Hook未执行

1. 检查hook文件是否存在:
```bash
ls -la apps/backend/repos/$PROJECT_ID/hooks/pre-receive
```

2. 检查hook权限(Unix/Linux):
```bash
chmod +x apps/backend/repos/$PROJECT_ID/hooks/pre-receive
```

3. 检查backend日志:
```bash
# 搜索hook安装日志
grep "pre-receive" apps/backend/logs/*.log
```

#### API返回401

确保branch protection API endpoint是公开的:

```typescript
// apps/backend/src/branch-protection/branch-protection.controller.ts
@Get('projects/:projectId/branch-protection')
@Public() // 必须有此装饰器
findAll(@Param('projectId') projectId: string) {
  return this.branchProtectionService.findAll(projectId);
}
```

#### 跨平台兼容性

- **Windows**: Git Bash自动处理hook执行(bash脚本通过`#!/bin/bash`)
- **Unix/Linux/macOS**: 需要执行权限(chmod +x)
- **Docker**: 确保容器内安装了git和curl

---

## 相关文档

- [Git HTTP Transfer Protocols](https://git-scm.com/docs/http-protocol)
- [Git Pack Protocol](https://git-scm.com/docs/pack-protocol)
- [git-http-backend(1) Manual](https://git-scm.com/docs/git-http-backend)

---

## 更新日志

### 2025-10-26 - Branch Protection Integration ✅
- ✅ 实现Git pre-receive hook自动安装
- ✅ 集成Branch Protection API查询
- ✅ 支持requirePullRequest验证(阻止直接push)
- ✅ 支持allowForcePushes验证(阻止force push)
- ✅ 支持allowDeletions验证(阻止branch deletion)
- ✅ 提供详细的用户友好错误消息
- ✅ E2E测试全部通过
- 🔧 修复hook路径解析bug (dist/src/git → dist/git)
- 🔧 修复API认证问题 (添加@Public装饰器)

### 2025-10-26 - Initial Implementation
- ✅ 实现完整的Git HTTP Smart Protocol
- ✅ 支持clone/fetch/push操作
- ✅ 使用系统git http-backend
- ✅ 100%功能验证通过

### Phase 2 (已完成)
- ✅ Git push层面的分支保护 (2025-10-26)
- 🔲 HTTP Basic Authentication
- 🔲 Personal Access Token

### Phase 3 (计划)
- 🔲 SSH Protocol支持
- 🔲 Git LFS支持
- 🔲 分布式仓库replica
- 🔲 性能监控和优化

---

**最后更新**: 2025-10-26 (Branch Protection Integration)
**验证状态**: ✅ Fully Functional
**维护者**: Flotilla Platform Team
