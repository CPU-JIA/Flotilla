# 后端 Dockerfile - 多阶段构建
FROM node:22-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# 复制后端代码
COPY apps/backend ./apps/backend

# 安装依赖（包括 dev dependencies，因为需要编译 TypeScript）
FROM base AS deps
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# 生成 Prisma Client
RUN cd apps/backend && npx prisma generate

# 构建 NestJS 应用
RUN cd apps/backend && pnpm run build

# 生产阶段
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app

# 复制 workspace 配置和依赖
COPY --from=base /app/pnpm-workspace.yaml ./
COPY --from=base /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# 复制后端应用文件
COPY --from=base /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

# 暴露端口
EXPOSE 4000

# 设置环境变量
ENV NODE_ENV=production

# 启动命令
CMD ["node", "dist/main.js"]
