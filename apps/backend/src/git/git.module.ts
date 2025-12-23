import { Module } from '@nestjs/common';
import { GitService } from './git.service';
import { GitController } from './git.controller';
import { GitHttpController } from './git-http.controller';
import { HttpSmartService } from './protocols/http-smart.service';
import { GitHttpAuthGuard } from './guards/git-http-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

// Specialized Git Services (ECP-A2: High cohesion, low coupling)
import { GitRepositoryService } from './services/git-repository.service';
import { GitBranchService } from './services/git-branch.service';
import { GitCommitService } from './services/git-commit.service';
import { GitDiffService } from './services/git-diff.service';
import { GitMergeService } from './services/git-merge.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [GitController, GitHttpController],
  providers: [
    // Facade service (delegates to specialized services)
    GitService,
    // Specialized services
    GitRepositoryService,
    GitBranchService,
    GitCommitService,
    GitDiffService,
    GitMergeService,
    // HTTP Smart Protocol & Authentication
    HttpSmartService,
    GitHttpAuthGuard,
  ],
  exports: [
    GitService, // Export facade for backward compatibility
    // Also export specialized services for direct use if needed
    GitRepositoryService,
    GitBranchService,
    GitCommitService,
    GitDiffService,
    GitMergeService,
  ],
})
export class GitModule {}
