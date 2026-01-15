import { Module } from '@nestjs/common';
import { PullRequestsService } from './pull-requests.service';
import { PRMergeService } from './pr-merge.service';
import { PRReviewService } from './pr-review.service';
import { PullRequestsController } from './pull-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GitModule } from '../git/git.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BranchProtectionModule } from '../branch-protection/branch-protection.module';

@Module({
  imports: [
    PrismaModule,
    GitModule,
    NotificationsModule,
    BranchProtectionModule,
  ],
  controllers: [PullRequestsController],
  providers: [PullRequestsService, PRMergeService, PRReviewService],
  exports: [PullRequestsService],
})
export class PullRequestsModule {}
