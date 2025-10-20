# 🐳 Docker 一键启动指南

## 快速开始

### 前置要求

- Docker Desktop (Windows/Mac) 或 Docker Engine (Linux)
- Docker Compose V2

### 一键启动所有服务

```bash
# 1. 克隆项目
git clone <repository-url>
cd Cloud-Dev-Platform

# 2. 复制环境变量配置
cp .env.example .env

# 3. 启动所有服务（一键启动）
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

## 服务列表

启动后可访问以下服务：

| 服务 | 端口 | 访问地址 | 说明 |
|------|------|---------|------|
| **Frontend** | 3000 | http://localhost:3000 | 前端应用 (Next.js) |
| **Website** | 3003 | http://localhost:3003 | 官网 (Next.js + i18n) |
| **Backend API** | 4000 | http://localhost:4000/api | 后端 API (NestJS) |
| **Swagger Docs** | 4000 | http://localhost:4000/api/docs | API 文档 |
| **PostgreSQL** | 5434 | localhost:5434 | 主数据库 |
| **Redis** | 6380 | localhost:6380 | 缓存/会话 |
| **MinIO Console** | 9001 | http://localhost:9001 | 对象存储控制台 |
| **MinIO API** | 9000 | localhost:9000 | S3 兼容 API |

## 常用命令

### 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose up -d backend
docker-compose up -d frontend
docker-compose up -d website

# 启动基础设施服务
docker-compose up -d postgres redis minio

# 启动并查看日志
docker-compose up
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除卷（清空数据）
docker-compose down -v

# 停止特定服务
docker-compose stop backend
```

### 查看状态

```bash
# 查看所有容器状态
docker-compose ps

# 查看日志
docker-compose logs

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f website

# 查看最近100行日志
docker-compose logs --tail=100
```

### 重建服务

```bash
# 重建所有服务
docker-compose build

# 重建特定服务
docker-compose build backend
docker-compose build frontend
docker-compose build website

# 强制无缓存重建
docker-compose build --no-cache

# 重建并重启
docker-compose up -d --build
```

### 进入容器

```bash
# 进入后端容器
docker exec -it flotilla-backend sh

# 进入前端容器
docker exec -it flotilla-frontend sh

# 进入官网容器
docker exec -it flotilla-website sh

# 进入数据库容器
docker exec -it flotilla-postgres sh
```

### 数据库操作

```bash
# 连接数据库
docker exec -it flotilla-postgres psql -U devplatform -d cloud_dev_platform

# 运行数据库迁移（Backend 容器内）
docker exec -it flotilla-backend pnpm prisma migrate deploy

# 查看数据库日志
docker-compose logs -f postgres
```

## 服务健康检查

所有服务都配置了健康检查：

```bash
# 查看健康状态
docker-compose ps

# 健康检查状态说明：
# - healthy: 服务正常
# - starting: 正在启动
# - unhealthy: 服务异常
```

## 环境变量

关键环境变量配置（在 `.env` 文件中）：

```bash
# 数据库
DATABASE_URL=postgresql://devplatform:devplatform123@postgres:5432/cloud_dev_platform

# Redis
REDIS_URL=redis://:redis123@redis:6379

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2025
JWT_EXPIRATION=7d

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## 故障排查

### 端口占用

```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000

# Linux/Mac
lsof -i :3000
lsof -i :4000

# 杀死占用端口的进程（Windows）
taskkill /PID <进程ID> /F
```

### 清理 Docker 资源

```bash
# 停止所有容器
docker-compose down

# 删除所有未使用的镜像
docker image prune -a

# 删除所有未使用的卷
docker volume prune

# 删除所有未使用的网络
docker network prune

# 清理所有未使用的资源
docker system prune -a --volumes
```

### 查看容器资源使用

```bash
# 查看所有容器资源使用情况
docker stats

# 查看特定容器
docker stats flotilla-backend flotilla-frontend
```

## 生产部署建议

1. **更改默认密码**: 修改 `.env` 中的所有密码和密钥
2. **启用 HTTPS**: 在前端配置 nginx 反向代理
3. **数据备份**: 定期备份 PostgreSQL 和 MinIO 数据
4. **监控**: 配置日志收集和监控系统
5. **资源限制**: 在 docker-compose.yml 中添加 CPU 和内存限制

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 开发模式 vs 生产模式

### 开发模式（本地）

```bash
# 使用 pnpm dev
pnpm install
pnpm dev
```

### 生产模式（Docker）

```bash
# 使用 docker-compose
docker-compose up -d
```

## 更新服务

```bash
# 1. 拉取最新代码
git pull

# 2. 重建镜像
docker-compose build --no-cache

# 3. 重启服务
docker-compose up -d

# 4. 查看日志确认
docker-compose logs -f
```

## 容器命名规范

所有容器统一使用 `flotilla-` 前缀：

- `flotilla-postgres` - PostgreSQL 数据库
- `flotilla-redis` - Redis 缓存
- `flotilla-minio` - MinIO 对象存储
- `flotilla-backend` - NestJS 后端
- `flotilla-frontend` - Next.js 前端应用
- `flotilla-website` - Next.js 官网
- `flotilla-postgres-replica` - PostgreSQL 从库（可选）

## 网络架构

所有服务运行在同一网络 `cloud-dev-network` 中，服务间可通过服务名互相访问：

- Backend → Postgres: `postgres:5432`
- Backend → Redis: `redis:6379`
- Backend → MinIO: `minio:9000`
- Frontend → Backend: `backend:4000` (容器内) 或 `http://localhost:4000` (宿主机)

## 数据持久化

以下数据通过 Docker Volumes 持久化：

- `postgres_data`: PostgreSQL 数据
- `postgres_replica_data`: PostgreSQL 从库数据
- `redis_data`: Redis 数据
- `minio_data`: MinIO 对象存储数据

数据存储位置：
```bash
# Windows: C:\ProgramData\docker\volumes\
# Linux: /var/lib/docker/volumes/
# Mac: ~/Library/Containers/com.docker.docker/Data/vms/0/
```

## 支持

如遇问题，请查看：

1. 容器日志: `docker-compose logs -f <service-name>`
2. 容器状态: `docker-compose ps`
3. 健康检查: `docker inspect <container-name> | grep Health -A 10`

---

**快速启动命令总结：**

```bash
# 完整流程
git clone <repo>
cd Cloud-Dev-Platform
cp .env.example .env
docker-compose up -d
docker-compose logs -f
```

访问 http://localhost:3000 开始使用！
