import { Module } from '@nestjs/common';
import { PullRequestsService } from './pull-requests.service';
import { PullRequestsController } from './pull-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GitModule } from '../git/git.module';

@Module({
  imports: [PrismaModule, GitModule],
  controllers: [PullRequestsController],
  providers: [PullRequestsService],
  exports: [PullRequestsService],
})
export class PullRequestsModule {}
