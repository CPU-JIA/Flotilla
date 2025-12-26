# 前端 Dockerfile - 多阶段构建
FROM node:22-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

# 配置国内镜像加速
RUN pnpm config set registry https://registry.npmmirror.com

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# 复制前端代码
COPY apps/frontend ./apps/frontend

# 安装依赖
FROM base AS deps
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

# 设置 Next.js 环境变量
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN cd apps/frontend && pnpm run build

# 生产阶段
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

# ⚠️ SECURITY: Create non-root user to run the application
# Running as root is a security risk in production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# 复制 workspace 配置和依赖
COPY --from=base /app/pnpm-workspace.yaml ./
COPY --from=base /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# 复制前端应用文件
COPY --from=base /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=builder /app/apps/frontend/next.config.ts ./apps/frontend/
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

WORKDIR /app/apps/frontend

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# ✅ SECURITY: Switch to non-root user before running the application
USER nodejs

# 启动命令
CMD ["pnpm", "start"]
