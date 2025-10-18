import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';

/**
 * 监控模块
 * ECP-A1: 单一职责 - 系统监控和健康检查功能
 */
@Module({
  controllers: [MonitoringController],
})
export class MonitoringModule {}
