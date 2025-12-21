import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';
import { RepositoriesModule } from '../repositories/repositories.module';

// ECP-A2: 高内聚低耦合 - RepositoriesModule不依赖FilesModule，无需forwardRef
@Module({
  imports: [PrismaModule, MinioModule, RepositoriesModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
