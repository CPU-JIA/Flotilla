import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * 通知模块
 *
 * 提供通知管理功能：
 * - 创建、查询、更新、删除通知
 * - 通知偏好设置管理
 * - WebSocket实时推送
 *
 * ECP-A1: SOLID原则 - 模块化设计，清晰的职责边界
 */
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway], // 导出服务和Gateway供其他模块使用
})
export class NotificationsModule {}
