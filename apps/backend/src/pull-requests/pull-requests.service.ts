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
import { CreatePullRequestDto } from './dto/create-pull-request.dto';
import { UpdatePullRequestDto } from './dto/update-pull-request.dto';
import { MergePullRequestDto, MergeStrategy } from './dto/merge-pull-request.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { PullRequestCreateCommentDto } from './dto/create-comment.dto';
import { PullRequest, PRState, Prisma } from '@prisma/client';

@Injectable()
export class PullRequestsService {
  private readonly logger = new Logger(PullRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gitService: GitService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 获取项目中下一个PR编号
   */
  private async getNextPRNumber(projectId: string): Promise<number> {
    const lastPR = await this.prisma.pullRequest.findFirst({
      where: { projectId },
      orderBy: { number: 'desc' },
    });

    return (lastPR?.number || 0) + 1;
  }

  /**
   * 创建PR（带重试机制处理并发）
   */
  async create(
    authorId: string,
    dto: CreatePullRequestDto,
  ): Promise<PullRequest> {
    const maxRetries = 3;
    let retries = 0;

    // 验证项目是否存在
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // 验证分支是否相同
    if (dto.sourceBranch === dto.targetBranch) {
      throw new BadRequestException(
        'Source and target branches cannot be the same',
      );
    }

    while (retries < maxRetries) {
      try {
        const number = await this.getNextPRNumber(dto.projectId);

        const pullRequest = await this.prisma.pullRequest.create({
          data: {
            projectId: dto.projectId,
            authorId,
            number,
            title: dto.title,
            body: dto.body,
            sourceBranch: dto.sourceBranch,
            targetBranch: dto.targetBranch,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // 创建 opened 事件
        await this.prisma.pREvent.create({
          data: {
            pullRequestId: pullRequest.id,
            actorId: authorId,
            event: 'opened',
          },
        });

        // 🔔 发送PR创建通知给项目owner（如果不是作者本人）
        try {
          if (project.ownerId !== authorId) {
            await this.notificationsService.create({
              userId: project.ownerId,
              type: 'PR_CREATED',
              title: `[PR #${pullRequest.number}] ${pullRequest.title}`,
              body: `${pullRequest.author.username} 创建了一个新的 Pull Request`,
              link: `/projects/${pullRequest.projectId}/pull-requests/${pullRequest.number}`,
              metadata: {
                prId: pullRequest.id,
                projectId: pullRequest.projectId,
                authorId: pullRequest.authorId,
              },
            });
            this.logger.log(
              `📨 Sent PR_CREATED notification for PR #${pullRequest.number} to owner ${project.ownerId}`,
            );
          }
        } catch (error) {
          // 通知失败不影响PR创建
          this.logger.warn(
            `⚠️ Failed to send PR_CREATED notification: ${error.message}`,
          );
        }

        return pullRequest;
      } catch (error) {
        // P2002: Unique constraint violation
        if (error.code === 'P2002' && retries < maxRetries - 1) {
          retries++;
          continue;
        }
        throw error;
      }
    }

    throw new BadRequestException('Failed to create pull request after retries');
  }

  /**
   * 查询PR列表
   */
  async findAll(projectId: string, state?: PRState) {
    const where: Prisma.PullRequestWhereInput = {
      projectId,
      ...(state && { state }),
    };

    return this.prisma.pullRequest.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 根据ID获取PR详情
   */
  async findOne(id: string) {
    const pullRequest = await this.prisma.pullRequest.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        reviews: {
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
        },
        comments: {
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
        },
        events: {
          include: {
            actor: {
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
        },
      },
    });

    if (!pullRequest) {
      throw new NotFoundException(`Pull request ${id} not found`);
    }

    return pullRequest;
  }

  /**
   * 根据项目ID和PR编号获取PR
   */
  async findByNumber(projectId: string, number: number) {
    const pullRequest = await this.prisma.pullRequest.findUnique({
      where: {
        projectId_number: {
          projectId,
          number,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        reviews: {
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
        },
        comments: {
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
        },
        events: {
          include: {
            actor: {
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
        },
      },
    });

    if (!pullRequest) {
      throw new NotFoundException(
        `Pull request #${number} not found in project ${projectId}`,
      );
    }

    return pullRequest;
  }

  /**
   * 更新PR
   */
  async update(id: string, userId: string, dto: UpdatePullRequestDto) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${id} not found`);
    }

    // 只有作者可以更新PR
    if (pr.authorId !== userId) {
      throw new ForbiddenException('Only the author can update this PR');
    }

    // 不能更新已合并或已关闭的PR
    if (pr.state !== PRState.OPEN) {
      throw new BadRequestException('Cannot update a closed or merged PR');
    }

    return this.prisma.pullRequest.update({
      where: { id },
      data: dto,
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
  }

  /**
   * 关闭PR
   */
  async close(id: string, userId: string) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id },
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
      throw new NotFoundException(`Pull request ${id} not found`);
    }

    if (pr.state !== PRState.OPEN) {
      throw new BadRequestException('PR is already closed or merged');
    }

    const updated = await this.prisma.pullRequest.update({
      where: { id },
      data: {
        state: PRState.CLOSED,
        closedAt: new Date(),
      },
    });

    // 创建 closed 事件
    await this.prisma.pREvent.create({
      data: {
        pullRequestId: id,
        actorId: userId,
        event: 'closed',
      },
    });

    // 🔔 发送PR关闭通知给作者（如果不是作者自己关闭）
    try {
      if (pr.authorId !== userId) {
        const closer = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });

        await this.notificationsService.create({
          userId: pr.authorId,
          type: 'PR_CLOSED',
          title: `[PR #${pr.number}] Pull Request 已关闭`,
          body: `${closer?.username || '管理员'} 关闭了您的 Pull Request`,
          link: `/projects/${pr.projectId}/pull-requests/${pr.number}`,
          metadata: {
            prId: pr.id,
            closerId: userId,
          },
        });
        this.logger.log(
          `📨 Sent PR_CLOSED notification for PR #${pr.number} to author ${pr.authorId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Failed to send PR_CLOSED notification: ${error.message}`,
      );
    }

    return updated;
  }

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

        case MergeStrategy.SQUASH:
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

        case MergeStrategy.REBASE:
          mergeCommitOid = await this.gitService.rebaseMerge(
            pr.projectId,
            pr.sourceBranch,
            pr.targetBranch,
            author,
          );
          break;

        default:
          throw new BadRequestException(`Invalid merge strategy: ${strategy}`);
      }
    } catch (error) {
      this.logger.error(`Merge failed for PR ${id}:`, error);
      throw new InternalServerErrorException(
        `Merge failed: ${error.message}`,
      );
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

    // 🔔 发送PR合并通知给作者（如果不是作者自己合并）
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

    // 🔔 发送Review通知给PR作者（如果不是自己Review自己的PR）
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
          body: dto.body || `${review.reviewer.username} ${reviewStateText}了您的 PR`,
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
   * 添加Comment
   */
  async addComment(prId: string, authorId: string, dto: PullRequestCreateCommentDto) {
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

    // 🔔 发送Comment通知给PR作者（如果不是自己评论自己的PR）
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
    // Fetch all reviews ordered by createdAt desc
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
    const latestReviewsMap = new Map<string, typeof reviews[0]>();
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
   * Get diff for PR with line-level comments
   * 获取PR的diff和行内评论
   */
  async getDiff(prId: string) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
      select: {
        projectId: true,
        sourceBranch: true,
        targetBranch: true,
      },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${prId} not found`);
    }

    // Get diff from GitService
    const diff = await this.gitService.getDiff(
      pr.projectId,
      pr.sourceBranch,
      pr.targetBranch,
    );

    // Get line-level comments
    const comments = await this.prisma.pRComment.findMany({
      where: {
        pullRequestId: prId,
        filePath: { not: null }, // Only line comments
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
      orderBy: { createdAt: 'asc' },
    });

    return {
      files: diff.files,
      summary: diff.summary,
      comments,
    };
  }
}
