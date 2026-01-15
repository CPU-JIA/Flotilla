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
import { PRMergeService } from './pr-merge.service';
import { PRReviewService } from './pr-review.service';
import { CreatePullRequestDto } from './dto/create-pull-request.dto';
import { UpdatePullRequestDto } from './dto/update-pull-request.dto';
import {
  MergePullRequestDto,
  MergeStrategy,
} from './dto/merge-pull-request.dto';
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
    private readonly branchProtectionService: BranchProtectionService,
    private readonly prMergeService: PRMergeService,
    private readonly prReviewService: PRReviewService,
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

    throw new BadRequestException(
      'Failed to create pull request after retries',
    );
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
   * 委托给PRMergeService处理
   */
  async merge(id: string, userId: string, dto: MergePullRequestDto) {
    return this.prMergeService.merge(id, userId, dto);
  }

  /**
   * 添加Review
   * 委托给PRReviewService处理
   */
  async addReview(prId: string, reviewerId: string, dto: CreateReviewDto) {
    return this.prReviewService.addReview(prId, reviewerId, dto);
  }

  /**
   * 添加Comment
   * 委托给PRReviewService处理
   */
  async addComment(
    prId: string,
    authorId: string,
    dto: PullRequestCreateCommentDto,
  ) {
    return this.prReviewService.addComment(prId, authorId, dto);
  }

  /**
   * 获取PR的所有Comments
   * 委托给PRReviewService处理
   */
  async getComments(prId: string) {
    return this.prReviewService.getComments(prId);
  }

  /**
   * 获取PR的所有Reviews
   * 委托给PRReviewService处理
   */
  async getReviews(prId: string) {
    return this.prReviewService.getReviews(prId);
  }

  /**
   * Get review summary with latest review state per reviewer
   * 获取Review摘要（每个reviewer的最新review状态）
   * 委托给PRReviewService处理
   */
  async getReviewSummary(prId: string) {
    return this.prReviewService.getReviewSummary(prId);
  }

  /**
   * Check if PR can be merged based on approval rules
   * 检查PR是否可以合并（基于approval规则）
   * 委托给PRMergeService处理
   */
  async canMergePR(prId: string, userId: string) {
    return this.prMergeService.canMergePR(prId, userId);
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
