import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { CollaborationService } from './collaboration.service'
import { CollaborationGateway } from './collaboration.gateway'
import { PrismaModule } from '../prisma/prisma.module'

/**
 * 实时协作编辑模块
 *
 * ECP-A1: SOLID原则 - 模块化设计，职责清晰
 * ECP-A2: 高内聚低耦合 - 依赖注入，解耦组件
 *
 * 提供：
 * - CollaborationService: 会话管理业务逻辑
 * - CollaborationGateway: WebSocket实时通信
 *
 * 依赖：
 * - PrismaModule: PrismaService数据库访问
 * - JwtModule: JWT身份验证
 */
@Module({
  imports: [
    PrismaModule, // 提供PrismaService
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key',
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],
  providers: [CollaborationService, CollaborationGateway],
  exports: [CollaborationService], // 导出Service供其他模块使用
})
export class CollaborationModule {}
