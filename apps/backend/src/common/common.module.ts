import { Module, Global } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Global module providing common services across the application
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class CommonModule {}
