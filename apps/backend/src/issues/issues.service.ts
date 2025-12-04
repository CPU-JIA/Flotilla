import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { QueryIssueDto } from './dto/query-issue.dto';
import { Issue, Prisma } from '@prisma/client';

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 获取项目中下一个Issue编号
   */
  private async getNextIssueNumber(projectId: string): Promise<number> {
    const lastIssue = await this.prisma.issue.findFirst({
      where: { projectId },
      orderBy: { number: 'desc' },
    });

    return (lastIssue?.number || 0) + 1;
  }

  /**
   * 创建Issue（带重试机制处理并发）
   */
  async create(
    projectId: string,
    authorId: string,
    dto: CreateIssueDto,
  ): Promise<Issue> {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const number = await this.getNextIssueNumber(projectId);

        const issue = await this.prisma.issue.create({
          data: {
            projectId,
            authorId,
            number,
            title: dto.title,
            body: dto.body,
            assigneeIds: dto.assigneeIds || [],
            labelIds: dto.labelIds || [],
            milestoneId: dto.milestoneId,
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
            milestone: true,
          },
        });

        // 🔔 发送Issue分配通知给所有assignees（排除作者自己）
        try {
          if (dto.assigneeIds && dto.assigneeIds.length > 0) {
            const notifications = dto.assigneeIds
              .filter((assigneeId) => assigneeId !== authorId)
              .map((assigneeId) => ({
                userId: assigneeId,
                type: 'ISSUE_ASSIGNED' as const,
                title: `[Issue #${issue.number}] 分配给您`,
                body: issue.title,
                link: `/projects/${projectId}/issues/${issue.number}`,
                metadata: {
                  issueId: issue.id,
                  projectId,
                  assignerId: authorId,
                },
              }));

            if (notifications.length > 0) {
              await this.notificationsService.createBatch(notifications);
              this.logger.log(
                `📨 Sent ISSUE_ASSIGNED notifications for Issue #${issue.number} to ${notifications.length} assignees`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `⚠️ Failed to send ISSUE_ASSIGNED notification: ${error.message}`,
          );
        }

        return issue;
      } catch (error) {
        // P2002: Unique constraint violation
        if (error.code === 'P2002' && retries < maxRetries - 1) {
          retries++;
          continue;
        }
        throw error;
      }
    }

    throw new BadRequestException('Failed to create issue after retries');
  }

  /**
   * 查询Issue列表（支持分页和筛选）
   */
  async findAll(projectId: string, query: QueryIssueDto) {
    const {
      page = 1,
      limit = 20,
      state,
      assignee,
      labels,
      milestone,
      search,
    } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.IssueWhereInput = {
      projectId,
    };

    if (state) {
      where.state = state;
    }

    if (assignee) {
      where.assigneeIds = {
        has: assignee,
      };
    }

    if (labels) {
      const labelArray = labels.split(',');
      where.labelIds = {
        hasSome: labelArray,
      };
    }

    if (milestone) {
      where.milestoneId = milestone;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 并行查询数据和总数
    const [data, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
          milestone: {
            select: {
              id: true,
              title: true,
              state: true,
              dueDate: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: {
          number: 'desc',
        },
      }),
      this.prisma.issue.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取单个Issue
   */
  async findOne(projectId: string, number: number): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({
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
        milestone: true,
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                email: true,
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

    if (!issue) {
      throw new NotFoundException(
        `Issue #${number} not found in project ${projectId}`,
      );
    }

    return issue;
  }

  /**
   * 更新Issue
   */
  async update(
    projectId: string,
    number: number,
    userId: string,
    dto: UpdateIssueDto,
  ): Promise<Issue> {
    // 验证Issue存在
    const issue = await this.findOne(projectId, number);

    // 准备更新数据
    const updateData: Prisma.IssueUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.body !== undefined) updateData.body = dto.body;
    if (dto.assigneeIds !== undefined) updateData.assigneeIds = dto.assigneeIds;
    if (dto.labelIds !== undefined) updateData.labelIds = dto.labelIds;

    // Milestone 关联需要使用嵌套更新语法
    if (dto.milestoneId !== undefined) {
      if (dto.milestoneId === null) {
        updateData.milestone = { disconnect: true };
      } else {
        updateData.milestone = { connect: { id: dto.milestoneId } };
      }
    }

    if (dto.state !== undefined) {
      updateData.state = dto.state;
      if (dto.state === 'CLOSED' && !issue.closedAt) {
        updateData.closedAt = new Date();
      } else if (dto.state === 'OPEN' && issue.closedAt) {
        updateData.closedAt = null;
      }
    }

    return await this.prisma.issue.update({
      where: {
        projectId_number: {
          projectId,
          number,
        },
      },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        milestone: true,
      },
    });
  }

  /**
   * 关闭Issue
   */
  async close(projectId: string, number: number): Promise<Issue> {
    await this.findOne(projectId, number); // 验证存在

    return await this.prisma.issue.update({
      where: {
        projectId_number: {
          projectId,
          number,
        },
      },
      data: {
        state: 'CLOSED',
        closedAt: new Date(),
      },
    });
  }

  /**
   * 重新打开Issue
   */
  async reopen(projectId: string, number: number): Promise<Issue> {
    await this.findOne(projectId, number); // 验证存在

    return await this.prisma.issue.update({
      where: {
        projectId_number: {
          projectId,
          number,
        },
      },
      data: {
        state: 'OPEN',
        closedAt: null,
      },
    });
  }

  /**
   * 删除Issue
   */
  async remove(projectId: string, number: number): Promise<void> {
    await this.findOne(projectId, number); // 验证存在

    await this.prisma.issue.delete({
      where: {
        projectId_number: {
          projectId,
          number,
        },
      },
    });
  }
}
