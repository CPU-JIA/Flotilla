## 🔒 Git HTTP 使用指南

Flotilla 支持标准的 Git HTTP Smart Protocol，可以使用 git clone/fetch/push 操作。

### 🔐 认证方式

Git HTTP 端点使用 **HTTP Basic Authentication** 进行认证。

#### 方式1: URL内嵌凭据

```bash
# Clone (读取)
git clone http://username:password@localhost:4000/repo/projectId

# Push (写入)
git push http://username:password@localhost:4000/repo/projectId
```

#### 方式2: Git Credential Helper (推荐)

```bash
# 配置credential helper (凭据存储)
git config --global credential.helper store

# Clone (首次会提示输入用户名和密码)
git clone http://localhost:4000/repo/projectId
# 输入用户名: your-username
# 输入密码: your-password

# 之后的操作会自动使用存储的凭据
git pull
git push
```

#### 方式3: Public 项目 (仅读取)

```bash
# Public 项目无需认证即可clone
git clone http://localhost:4000/repo/publicProjectId
```

### 🔐 权限说明

| 操作                      | 所需权限 | 说明                             |
| ------------------------- | -------- | -------------------------------- |
| **git clone / git fetch** | READ     | 任何项目成员或Public项目匿名用户 |
| **git push**              | WRITE    | MEMBER及以上角色 (VIEWER只读)    |
| **分支保护检查**          | -        | push时自动验证分支保护规则       |

### ⚠️ 安全建议

1. **不要在URL中明文存储密码** - 使用credential helper
2. **使用HTTPS** - 生产环境强制HTTPS (凭据加密传输)
3. **定期更换密码** - 使用Token版本控制，密码修改后旧Token自动失效

---
