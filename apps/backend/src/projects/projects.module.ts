import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { RepositoriesModule } from '../repositories/repositories.module';
import { GitModule } from '../git/git.module';

@Module({
  imports: [forwardRef(() => RepositoriesModule), GitModule],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
