import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { LabelsService } from './labels.service';
import { LabelsController } from './labels.controller';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    IssuesController,
    LabelsController,
    MilestonesController,
    CommentsController,
  ],
  providers: [IssuesService, LabelsService, MilestonesService, CommentsService],
  exports: [IssuesService, LabelsService, MilestonesService, CommentsService],
})
export class IssuesModule {}
