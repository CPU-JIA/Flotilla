import { Module } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';
import { CommonModule } from '../common/common.module';

/**
 * Pipelines Module
 * ECP-A1: SOLID - 模块化设计，清晰的依赖关系
 * ECP-A2: High Cohesion, Low Coupling - 内聚流水线相关功能
 */
@Module({
  imports: [CommonModule],
  controllers: [PipelinesController],
  providers: [PipelinesService],
  exports: [PipelinesService],
})
export class PipelinesModule {}
