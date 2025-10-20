# Website Dockerfile - 多阶段构建
FROM node:22-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

# 设置工作目录
WORKDIR /app

# 复制 website 配置文件
COPY website/package.json website/pnpm-lock.yaml* ./
COPY website/tsconfig.json website/next.config.ts website/postcss.config.mjs ./
COPY website/i18n.config.ts ./

# 安装依赖
FROM base AS deps
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY website/src ./src
COPY website/public ./public
COPY website/i18n ./i18n

# 设置 Next.js 环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm run build

# 生产阶段
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app

# 复制必要文件
COPY --from=base /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/i18n ./i18n

# 暴露端口
EXPOSE 3003

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3003

# 启动命令
CMD ["pnpm", "start", "-p", "3003"]
