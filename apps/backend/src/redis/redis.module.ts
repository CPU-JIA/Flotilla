import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

/**
 * Redis模块
 * ECP-A2: 低耦合设计 - @Global装饰器使其在整个应用可用
 * ECP-C4: 无状态原则 - 缓存服务支持水平扩展
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
