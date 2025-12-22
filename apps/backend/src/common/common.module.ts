import { Module, Global } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

/**
 * Global module providing common services across the application
 * ECP-C3: Performance optimization - Redis caching for permissions
 */
@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class CommonModule {}
