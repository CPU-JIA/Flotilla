import { Module } from '@nestjs/common'
import { TwoFactorService } from './two-factor.service'
import { TwoFactorController } from './two-factor.controller'
import { PrismaModule } from '../../prisma/prisma.module'

/**
 * 双因素认证模块
 * ECP-A1: SOLID 原则 - 模块化设计
 */
@Module({
  imports: [PrismaModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService],
  exports: [TwoFactorService], // 导出服务供其他模块使用
})
export class TwoFactorModule {}
