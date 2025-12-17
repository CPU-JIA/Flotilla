import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectMembersService } from './project-members.service'; // 🔒 REFACTOR: 新增
import { ProjectsController } from './projects.controller';
import { RepositoriesModule } from '../repositories/repositories.module';
import { GitModule } from '../git/git.module';

// ECP-A2: 高内聚低耦合 - 移除不必要的 forwardRef
// RepositoriesModule 不依赖 ProjectsModule，因此无需循环引用
// ECP-A1: SOLID 原则 - 服务拆分降低复杂度
@Module({
  imports: [RepositoriesModule, GitModule],
  providers: [ProjectsService, ProjectMembersService],
  controllers: [ProjectsController],
  exports: [ProjectsService, ProjectMembersService], // 🔒 导出两个服务
})
export class ProjectsModule {}
