import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { RepositoriesModule } from '../repositories/repositories.module';
import { GitModule } from '../git/git.module';

// ECP-A2: 高内聚低耦合 - 移除不必要的 forwardRef
// RepositoriesModule 不依赖 ProjectsModule，因此无需循环引用
@Module({
  imports: [RepositoriesModule, GitModule],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
