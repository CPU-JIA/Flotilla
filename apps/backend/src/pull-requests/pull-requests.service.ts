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
import { CreatePullRequestDto } from './dto/create-pull-request.dto';
import { UpdatePullRequestDto } from './dto/update-pull-request.dto';
import { MergePullRequestDto, MergeStrategy } from './dto/merge-pull-request.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PullRequest, PRState, Prisma } from '@prisma/client';

@Injectable()
export class PullRequestsService {
  private readonly logger = new Logger(PullRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gitService: GitService,
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

    return merged;
  }

  /**
   * 添加Review
   */
  async addReview(prId: string, reviewerId: string, dto: CreateReviewDto) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
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

    return review;
  }

  /**
   * 添加Comment
   */
  async addComment(prId: string, authorId: string, dto: CreateCommentDto) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
    });

    if (!pr) {
      throw new NotFoundException(`Pull request ${prId} not found`);
    }

    return this.prisma.pRComment.create({
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
}
