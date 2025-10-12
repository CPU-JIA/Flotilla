import { Module } from '@nestjs/common'
import { FilesController } from './files.controller'
import { FilesService } from './files.service'
import { PrismaModule } from '../prisma/prisma.module'
import { MinioModule } from '../minio/minio.module'

@Module({
  imports: [PrismaModule, MinioModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
