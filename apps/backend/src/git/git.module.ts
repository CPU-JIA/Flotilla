import { Module } from '@nestjs/common';
import { GitService } from './git.service';
import { GitController } from './git.controller';
import { GitHttpController } from './git-http.controller';
import { HttpSmartService } from './protocols/http-smart.service';
import { GitHttpAuthGuard } from './guards/git-http-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GitController, GitHttpController],
  providers: [GitService, HttpSmartService, GitHttpAuthGuard],
  exports: [GitService],
})
export class GitModule {}
