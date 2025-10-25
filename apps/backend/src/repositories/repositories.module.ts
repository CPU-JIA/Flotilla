import { Module, forwardRef } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { GitModule } from '../git/git.module';

@Module({
  imports: [forwardRef(() => GitModule)],
  providers: [RepositoriesService],
  controllers: [RepositoriesController],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
