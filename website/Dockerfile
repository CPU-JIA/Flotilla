# Website Dockerfile - 多阶段构建
FROM node:22-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# 复制 website 代码
COPY website ./website

# 安装依赖
FROM base AS deps
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/website/node_modules ./website/node_modules

# 设置 Next.js 环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN cd website && pnpm run build

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

# 复制 website 应用文件
COPY --from=base /app/website/package.json ./website/
COPY --from=builder /app/website/node_modules ./website/node_modules
COPY --from=builder /app/website/.next ./website/.next
COPY --from=builder /app/website/public ./website/public
COPY --from=builder /app/website/next.config.ts ./website/
COPY --from=base /app/website/i18n ./website/i18n

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

WORKDIR /app/website

# 暴露端口
EXPOSE 3003

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3003

# ✅ SECURITY: Switch to non-root user before running the application
USER nodejs

# 启动命令
CMD ["pnpm", "start", "-p", "3003"]
