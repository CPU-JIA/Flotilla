import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { PullRequestCreateCommentDto } from './dto/create-comment.dto';
import { PRState } from '@prisma/client';

/**
 * PR审查服务
 * 职责：处理PR审查、评论管理
 */
@Injectable()
export class PRReviewService {
  private readonly logger = new Logger(PRReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 添加Review
   */
  async addReview(prId: string, reviewerId: string, dto: CreateReviewDto) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${prId} not found`);
    }

    if (pr.state !== PRState.OPEN) {
      throw new BadRequestException('Cannot review a closed or merged PR');
    }

    const review = await this.prisma.pRReview.create({
      data: {
        pullRequestId: prId,
        reviewerId,
        state: dto.state,
        body: dto.body,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // 创建 reviewed 事件
    await this.prisma.pREvent.create({
      data: {
        pullRequestId: prId,
        actorId: reviewerId,
        event: 'reviewed',
        metadata: {
          state: dto.state,
        },
      },
    });

    // 发送Review通知给PR作者（如果不是自己Review自己的PR）
    try {
      if (pr.authorId !== reviewerId) {
        const reviewStateText =
          dto.state === 'APPROVED'
            ? '批准了'
            : dto.state === 'CHANGES_REQUESTED'
              ? '请求修改'
              : '评论了';

        await this.notificationsService.create({
          userId: pr.authorId,
          type: 'PR_REVIEWED',
          title: `[PR #${pr.number}] ${review.reviewer.username} ${reviewStateText}您的 Pull Request`,
          body:
            dto.body ||
            `${review.reviewer.username} ${reviewStateText}了您的 PR`,
          link: `/projects/${pr.projectId}/pull-requests/${pr.number}`,
          metadata: {
            prId: pr.id,
            reviewId: review.id,
            reviewState: dto.state,
            reviewerId,
          },
        });
        this.logger.log(
          `📨 Sent PR_REVIEWED notification for PR #${pr.number} to author ${pr.authorId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Failed to send PR_REVIEWED notification: ${error.message}`,
      );
    }

    return review;
  }

  /**
   * 获取PR的所有Reviews
   */
  async getReviews(prId: string) {
    return this.prisma.pRReview.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get review summary with latest review state per reviewer
   * 获取Review摘要（每个reviewer的最新review状态）
   */
  async getReviewSummary(prId: string) {
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

  /**
   * 添加Comment
   */
  async addComment(
    prId: string,
    authorId: string,
    dto: PullRequestCreateCommentDto,
  ) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${prId} not found`);
    }

    const comment = await this.prisma.pRComment.create({
      data: {
        pullRequestId: prId,
        authorId,
        body: dto.body,
        filePath: dto.filePath,
        lineNumber: dto.lineNumber,
        commitHash: dto.commitHash,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // 发送Comment通知给PR作者（如果不是自己评论自己的PR）
    try {
      if (pr.authorId !== authorId) {
        await this.notificationsService.create({
          userId: pr.authorId,
          type: 'PR_COMMENTED',
          title: `[PR #${pr.number}] ${comment.author.username} 评论了您的 Pull Request`,
          body: dto.body?.substring(0, 100) || '新评论',
          link: `/projects/${pr.projectId}/pull-requests/${pr.number}#comment-${comment.id}`,
          metadata: {
            prId: pr.id,
            commentId: comment.id,
            filePath: dto.filePath,
            lineNumber: dto.lineNumber,
          },
        });
        this.logger.log(
          `📨 Sent PR_COMMENTED notification for PR #${pr.number} to author ${pr.authorId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Failed to send PR_COMMENTED notification: ${error.message}`,
      );
    }

    return comment;
  }

  /**
   * 获取PR的所有Comments
   */
  async getComments(prId: string) {
    return this.prisma.pRComment.findMany({
      where: { pullRequestId: prId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
