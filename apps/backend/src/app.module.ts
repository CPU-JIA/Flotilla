import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
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
import { MonitoringModule } from './monitoring/monitoring.module'
import { PerformanceMonitoringMiddleware } from './common/middleware/performance-monitoring.middleware'

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
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 为所有API路由应用性能监控中间件
    consumer.apply(PerformanceMonitoringMiddleware).forRoutes('*')
  }
}
