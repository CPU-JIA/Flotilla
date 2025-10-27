import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { MinioModule } from './minio/minio.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { AdminModule } from './admin/admin.module';
import { FilesModule } from './files/files.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { TeamsModule } from './teams/teams.module';
import { RaftClusterModule } from './raft-cluster/raft-cluster.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { IssuesModule } from './issues/issues.module';
import { GitModule } from './git/git.module';
import { PullRequestsModule } from './pull-requests/pull-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BranchProtectionModule } from './branch-protection/branch-protection.module';
import { SearchModule } from './search/search.module';
import { PerformanceMonitoringMiddleware } from './common/middleware/performance-monitoring.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    CommonModule,
    MinioModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    RepositoriesModule,
    AdminModule,
    FilesModule,
    OrganizationsModule,
    TeamsModule,
    RaftClusterModule,
    MonitoringModule,
    IssuesModule,
    GitModule,
    PullRequestsModule,
    NotificationsModule,
    BranchProtectionModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 为所有API路由应用性能监控中间件
    consumer.apply(PerformanceMonitoringMiddleware).forRoutes('*');
  }
}
