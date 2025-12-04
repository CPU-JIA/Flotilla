import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { PerformanceMonitoringMiddleware } from './common/middleware/performance-monitoring.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { HttpsRedirectMiddleware } from './common/middleware/https-redirect.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // ECP-C3: 性能优化 - Rate Limiting防护
    // 全局限流：100 requests/minute
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60秒时间窗口
        limit: 100, // 100次请求限制
      },
    ]),
    PrismaModule,
    CommonModule,
    MinioModule,
    RedisModule,
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
    EmailModule,
    AuditModule, // Phase 4: 安全审计日志模块
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局应用Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Phase 3: HTTPS 强制重定向中间件（生产环境，应用于所有路由，最先执行）
    consumer.apply(HttpsRedirectMiddleware).forRoutes('*');

    // Phase 3: 安全 Headers 中间件（应用于所有路由）
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');

    // 性能监控中间件（应用于所有路由）
    consumer.apply(PerformanceMonitoringMiddleware).forRoutes('*');
  }
}
