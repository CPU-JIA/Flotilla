import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { MinioModule } from './minio/minio.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ProjectsModule } from './projects/projects.module'
import { RepositoriesModule } from './repositories/repositories.module'
import { AdminModule } from './admin/admin.module'
import { FilesModule } from './files/files.module'
import { RaftClusterModule } from './raft-cluster/raft-cluster.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    MinioModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    RepositoriesModule,
    AdminModule,
    FilesModule,
    RaftClusterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
