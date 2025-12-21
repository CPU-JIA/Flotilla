import { Module } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { GitModule } from '../git/git.module';

// ECP-A2: 高内聚低耦合 - GitModule不依赖RepositoriesModule，无需forwardRef
@Module({
  imports: [GitModule],
  providers: [RepositoriesService],
  controllers: [RepositoriesController],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
