import { Module } from '@nestjs/common';
import { BranchProtectionService } from './branch-protection.service';
import { BranchProtectionController } from './branch-protection.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * 分支保护规则Module
 *
 * 提供分支保护规则的功能模块
 *
 * 功能：
 * - 为项目的特定分支配置保护策略
 * - 要求PR审核才能合并
 * - 设置最少审核人数
 * - 防止未经审核的代码合并
 */
@Module({
  imports: [PrismaModule],
  controllers: [BranchProtectionController],
  providers: [BranchProtectionService],
  exports: [BranchProtectionService], // 导出Service供其他模块使用（如PR merge验证）
})
export class BranchProtectionModule {}
