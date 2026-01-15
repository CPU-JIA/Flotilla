import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GitService } from '../git/git.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BranchProtectionService } from '../branch-protection/branch-protection.service';
import {
  MergePullRequestDto,
  MergeStrategy,
} from './dto/merge-pull-request.dto';
import { PRState } from '@prisma/client';

/**
 * PR合并服务
 * 职责：处理PR合并逻辑、分支保护检查、合并策略执行
 */
@Injectable()
export class PRMergeService {
  private readonly logger = new Logger(PRMergeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gitService: GitService,
    private readonly notificationsService: NotificationsService,
    private readonly branchProtectionService: BranchProtectionService,
  ) {}

  /**
   * 合并PR（支持3种策略：merge, squash, rebase）
   */
  async merge(id: string, userId: string, dto: MergePullRequestDto) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id },
      include: {
        project: true,
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${id} not found`);
    }

    if (pr.state !== PRState.OPEN) {
      throw new BadRequestException('PR is not open');
    }

    // 检查分支保护规则
    const protectionRule = await this.branchProtectionService.findByBranch(
      pr.projectId,
      pr.targetBranch,
    );

    if (protectionRule && protectionRule.requirePullRequest) {
      const approvedReviews = await this.prisma.pRReview.count({
        where: {
          pullRequestId: id,
          state: 'APPROVED',
        },
      });

      const required = protectionRule.requiredApprovingReviews;

      if (approvedReviews < required) {
        throw new ForbiddenException(
          `分支 "${pr.targetBranch}" 受保护，需要至少 ${required} 个批准审查，当前只有 ${approvedReviews} 个`,
        );
      }

      this.logger.log(
        `✅ Branch protection check passed: ${approvedReviews}/${required} approvals for PR #${pr.number}`,
      );
    }

    // Get merger info
    const merger = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
      },
    });

    if (!merger) {
      throw new NotFoundException('Merger user not found');
    }

    const author = {
      name: merger.username,
      email: merger.email,
    };

    const strategy = dto.strategy || MergeStrategy.MERGE;
    const commitMessage =
      dto.commitMessage ||
      `Merge pull request #${pr.number}: ${pr.title}\n\nMerged by: ${merger.username}`;

    let mergeCommitOid: string;

    try {
      // Execute merge based on strategy
      switch (strategy) {
        case MergeStrategy.MERGE:
          mergeCommitOid = await this.gitService.mergeCommit(
            pr.projectId,
            pr.sourceBranch,
            pr.targetBranch,
            commitMessage,
            author,
          );
          break;

        case MergeStrategy.SQUASH: {
          const squashMessage =
            dto.commitMessage ||
            `${pr.title}\n\n${pr.body || ''}\n\nSquashed commits from #${pr.number}`;
          mergeCommitOid = await this.gitService.squashMerge(
            pr.projectId,
            pr.sourceBranch,
            pr.targetBranch,
            squashMessage,
            author,
          );
          break;
        }

        case MergeStrategy.REBASE:
          mergeCommitOid = await this.gitService.rebaseMerge(
            pr.projectId,
            pr.sourceBranch,
            pr.targetBranch,
            author,
          );
          break;

        default:
          throw new BadRequestException(
            `Invalid merge strategy: ${String(strategy)}`,
          );
      }
    } catch (error) {
      this.logger.error(`Merge failed for PR ${id}:`, error);
      throw new InternalServerErrorException(`Merge failed: ${error.message}`);
    }

    // Update database with merge result
    const merged = await this.prisma.pullRequest.update({
      where: { id },
      data: {
        state: PRState.MERGED,
        mergedAt: new Date(),
        mergedBy: userId,
        mergeCommit: mergeCommitOid,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        merger: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Create merged event
    await this.prisma.pREvent.create({
      data: {
        pullRequestId: id,
        actorId: userId,
        event: 'merged',
        metadata: {
          strategy: dto.strategy,
          commitMessage: dto.commitMessage,
          mergeCommit: mergeCommitOid,
        },
      },
    });

    this.logger.log(
      `PR #${pr.number} merged successfully using ${strategy} strategy`,
    );

    // 发送PR合并通知给作者（如果不是作者自己合并）
    try {
      if (pr.authorId !== userId) {
        await this.notificationsService.create({
          userId: pr.authorId,
          type: 'PR_MERGED',
          title: `[PR #${pr.number}] Pull Request 已合并`,
          body: `${merged.merger?.username || '管理员'} 使用 ${strategy} 策略合并了您的 Pull Request`,
          link: `/projects/${pr.projectId}/pull-requests/${pr.number}`,
          metadata: {
            prId: pr.id,
            mergerId: userId,
            mergeStrategy: strategy,
            mergeCommit: mergeCommitOid,
          },
        });
        this.logger.log(
          `📨 Sent PR_MERGED notification for PR #${pr.number} to author ${pr.authorId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Failed to send PR_MERGED notification: ${error.message}`,
      );
    }

    return merged;
  }

  /**
   * Check if PR can be merged based on approval rules
   * 检查PR是否可以合并（基于approval规则）
   */
  async canMergePR(prId: string, userId: string) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
      include: {
        project: {
          select: {
            id: true,
            requireApprovals: true,
            allowSelfMerge: true,
            requireReviewFromOwner: true,
            ownerId: true,
          },
        },
      },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${prId} not found`);
    }

    // Get review summary
    const reviewSummary = await this.getReviewSummary(prId);

    // Rule 1: No active "changes requested" reviews
    if (reviewSummary.changesRequested > 0) {
      return {
        allowed: false,
        reason: 'Cannot merge: active change requests',
        approvalCount: reviewSummary.approved,
        requiredApprovals: pr.project.requireApprovals,
        hasChangeRequests: true,
      };
    }

    // Rule 2: Minimum approval count
    if (reviewSummary.approved < pr.project.requireApprovals) {
      return {
        allowed: false,
        reason: `Need ${pr.project.requireApprovals - reviewSummary.approved} more approval(s)`,
        approvalCount: reviewSummary.approved,
        requiredApprovals: pr.project.requireApprovals,
        hasChangeRequests: false,
      };
    }

    // Rule 3: Self-merge policy
    if (!pr.project.allowSelfMerge && pr.authorId === userId) {
      return {
        allowed: false,
        reason: 'Cannot merge your own PR (project policy)',
        approvalCount: reviewSummary.approved,
        requiredApprovals: pr.project.requireApprovals,
        hasChangeRequests: false,
      };
    }

    // Rule 4: Owner approval requirement
    if (pr.project.requireReviewFromOwner) {
      const ownerReview = reviewSummary.reviewers.find(
        (r) => r.id === pr.project.ownerId && r.state === 'APPROVED',
      );
      if (!ownerReview) {
        return {
          allowed: false,
          reason: 'Project owner approval required',
          approvalCount: reviewSummary.approved,
          requiredApprovals: pr.project.requireApprovals,
          hasChangeRequests: false,
        };
      }
    }

    // All rules passed
    return {
      allowed: true,
      approvalCount: reviewSummary.approved,
      requiredApprovals: pr.project.requireApprovals,
      hasChangeRequests: false,
    };
  }

  /**
   * Get review summary with latest review state per reviewer
   * 获取Review摘要（每个reviewer的最新review状态）
   * 注意：这是私有方法，被canMergePR依赖
   */
  private async getReviewSummary(prId: string) {
    const reviews = await this.prisma.pRReview.findMany({
      where: { pullRequestId: prId },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest review per reviewer using Map
    const latestReviewsMap = new Map<string, (typeof reviews)[0]>();
    for (const review of reviews) {
      if (!latestReviewsMap.has(review.reviewerId)) {
        latestReviewsMap.set(review.reviewerId, review);
      }
    }

    const latestReviews = Array.from(latestReviewsMap.values());

    // Aggregate by state
    const summary = {
      approved: latestReviews.filter((r) => r.state === 'APPROVED').length,
      changesRequested: latestReviews.filter(
        (r) => r.state === 'CHANGES_REQUESTED',
      ).length,
      commented: latestReviews.filter((r) => r.state === 'COMMENTED').length,
      totalReviewers: latestReviews.length,
      reviewers: latestReviews.map((r) => ({
        id: r.reviewer.id,
        username: r.reviewer.username,
        avatar: r.reviewer.avatar,
        state: r.state,
        createdAt: r.createdAt,
      })),
    };

    return summary;
  }
}
