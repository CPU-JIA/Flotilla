import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { LabelsService } from './labels.service';
import { LabelsController } from './labels.controller';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IssuesController, LabelsController, MilestonesController],
  providers: [IssuesService, LabelsService, MilestonesService],
  exports: [IssuesService, LabelsService, MilestonesService],
})
export class IssuesModule {}
