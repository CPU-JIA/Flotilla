# Flotilla 部署指南

## 🚀 生产环境部署

### 前置要求

- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+
- MinIO (S3兼容存储)
- MeiliSearch 1.10+ (可选，用于代码搜索)
- Node.js 20+ (如果不使用Docker)

---

## 📋 部署步骤

### Step 1: 环境变量配置

#### 后端 (apps/backend/.env)

```bash
# 必须配置 (CRITICAL)
NODE_ENV=production
DATABASE_URL=<生产数据库URL>
JWT_SECRET=<32+字符强密钥>
JWT_REFRESH_SECRET=<32+字符强密钥>
INITIAL_ADMIN_EMAIL=<管理员邮箱>

# 安全配置
ENABLE_CSRF=true
REQUIRE_EMAIL_VERIFICATION=true

# 性能配置
DATABASE_CONNECTION_LIMIT=20
DATABASE_POOL_TIMEOUT=20

# Redis
REDIS_URL=<Redis连接URL>

# MinIO
MINIO_ENDPOINT=<MinIO地址>
MINIO_ACCESS_KEY=<访问密钥>
MINIO_SECRET_KEY=<密钥>
MINIO_BUCKET=flotilla

# 邮件服务 (SMTP)
SMTP_HOST=<SMTP主机>
SMTP_PORT=587
SMTP_USER=<SMTP用户名>
SMTP_PASS=<SMTP密码>
SMTP_FROM_EMAIL=<发件邮箱>

# CORS
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

#### 前端 (apps/frontend/.env.production)

```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

### Step 2: 数据库迁移

```bash
cd apps/backend

# 应用迁移
pnpm prisma migrate deploy

# 生成Prisma Client
pnpm prisma generate

# (可选) 如果从旧版本升级，运行数据迁移
ts-node -r tsconfig-paths/register prisma/migrate-assignees.ts
```

---

### Step 3: 使用 Docker 部署

#### 方式1: Docker Compose (推荐)

```bash
# 1. 编辑 docker-compose.yml
# 2. 配置环境变量
cp .env.example .env
# 编辑 .env

# 3. 启动所有服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 5. 检查健康状态
curl http://localhost:4000/api
```

#### 方式2: 单独部署

**后端**:
```bash
cd apps/backend
docker build -t flotilla-backend .
docker run -d \
  --name flotilla-backend \
  -p 4000:4000 \
  --env-file .env \
  flotilla-backend
```

**前端**:
```bash
cd apps/frontend
docker build -t flotilla-frontend .
docker run -d \
  --name flotilla-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.your-domain.com \
  flotilla-frontend
```

---

### Step 4: 配置反向代理 (Nginx)

```nginx
# API 后端
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 支持 (通知系统)
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}

# 前端应用
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 安全检查清单

部署前必须完成以下安全检查：

- [ ] JWT_SECRET 和 JWT_REFRESH_SECRET 已设置为强密钥 (≥32字符)
- [ ] INITIAL_ADMIN_EMAIL 已配置
- [ ] ENABLE_CSRF=true (生产环境)
- [ ] REQUIRE_EMAIL_VERIFICATION=true
- [ ] HTTPS 已配置 (SSL证书)
- [ ] CORS_ALLOWED_ORIGINS 仅包含可信域名
- [ ] 数据库使用强密码
- [ ] Redis 启用密码保护
- [ ] MinIO 使用强凭据
- [ ] 邮件服务凭据已配置
- [ ] 防火墙规则已配置 (仅开放必要端口)

---

## 📊 健康检查

### API 健康检查
```bash
curl http://your-domain.com/api
# 期望: "Hello World!"

curl http://your-domain.com/api/docs
# 期望: Swagger UI页面
```

### 数据库连接
```bash
curl http://your-domain.com/api/monitoring/health
# 期望: { "status": "ok", "database": "connected" }
```

---

## 🔄 Breaking Changes (v1.0 → v1.1)

### 认证API响应格式变化

**旧版本 (v1.0)**:
```json
POST /api/auth/login
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

**新版本 (v1.1)**:
```json
POST /api/auth/login
{
  "user": { ... }
}
// Token现在通过HttpOnly Cookie传输
```

**前端迁移**:
```typescript
// ❌ 旧代码 (不再工作)
const { accessToken, user } = await api.auth.login(data)
localStorage.setItem('accessToken', accessToken)

// ✅ 新代码
const { user } = await api.auth.login(data)
// Cookie自动设置，无需手动操作

// ✅ 必须配置
fetch(url, { credentials: 'include' })
```

### Issue/PR assignees 结构变化

**旧版本**:
```typescript
issue.assigneeIds: string[]  // ['user-1', 'user-2']
```

**新版本**:
```typescript
issue.assignees: [{
  id: 'assignee-1',
  userId: 'user-1',
  user: { id, username, email },
  assignedAt: Date
}]
```

### Git HTTP 现在需要认证

**旧版本**: 无需认证即可clone/push
**新版本**: 必须使用 Basic Auth

```bash
# ❌ 旧方式 (不再工作)
git clone http://localhost:4000/repo/projectId

# ✅ 新方式
git clone http://username:password@localhost:4000/repo/projectId
```

---

## 🛠️ 故障排除

### Cookie跨域问题

**症状**: 登录成功但刷新页面后未登录

**解决**:
1. 确保后端CORS配置 `credentials: true`
2. 前端所有请求配置 `credentials: 'include'`
3. Cookie的 `sameSite` 属性设置为 `strict` 或 `lax`
4. HTTPS环境下 `secure: true`

### Git HTTP 认证失败

**症状**: git clone 提示 401 Unauthorized

**解决**:
```bash
# 使用credential helper
git config --global credential.helper store
git clone http://localhost:4000/repo/projectId
# 输入正确的用户名和密码
```

### CSRF Token 验证失败

**症状**: API 请求返回 403 CSRF token validation failed

**解决**:
1. 确保生产环境 `ENABLE_CSRF=true`
2. 前端请求自动附加 `X-XSRF-TOKEN` header (已在api.ts中配置)
3. 检查Cookie `XSRF-TOKEN` 是否存在

---

## 📞 支持

- **Issues**: https://github.com/CPU-JIA/Flotilla/issues
- **Email**: jia202520@gmail.com
- **Documentation**: ./docs/

---

**Deployed with**: Docker | Nginx | PostgreSQL | Redis | MinIO | MeiliSearch
**Monitored by**: Prisma Logging | Custom Middleware
**Secured by**: 7-Layer Security Stack
