import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { DataExportFormat, DataExportStatus } from '@prisma/client';
import { CreateExportRequestDto } from './dto/create-export-request.dto';

/**
 * GDPR 数据导出服务
 * ECP-A1: SOLID 原则 - 单一职责，专注于数据导出
 * ECP-C1: 防御性编程 - 验证所有输入和状态
 */
@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);
  private readonly exportExpiryDays = 7; // 导出文件保留7天

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 创建数据导出请求
   * ECP-C2: 错误处理 - 捕获所有可能的异常
   */
  async requestExport(userId: string, dto: CreateExportRequestDto) {
    this.logger.log(
      `User ${userId} requested data export in ${dto.format} format`,
    );

    // 检查是否有未完成的导出请求
    const pendingRequest = await this.prisma.dataExportRequest.findFirst({
      where: {
        userId,
        status: {
          in: [DataExportStatus.PENDING, DataExportStatus.PROCESSING],
        },
      },
    });

    if (pendingRequest) {
      throw new Error(
        'You already have a pending export request. Please wait for it to complete.',
      );
    }

    // 创建导出请求
    const exportRequest = await this.prisma.dataExportRequest.create({
      data: {
        userId,
        format: dto.format as DataExportFormat,
        status: DataExportStatus.PENDING,
      },
    });

    // 异步处理导出（使用 setTimeout 模拟后台任务）
    // 在生产环境中应使用 Bull Queue 或类似的任务队列
    setTimeout(() => {
      this.processExport(exportRequest.id).catch((error) => {
        this.logger.error(
          `Failed to process export ${exportRequest.id}: ${error.message}`,
        );
      });
    }, 0);

    return exportRequest;
  }

  /**
   * 异步处理导出请求
   * ECP-B1: DRY 原则 - 复用数据收集逻辑
   */
  async processExport(exportId: string) {
    this.logger.log(`Processing export request: ${exportId}`);

    try {
      // 更新状态为处理中
      const exportRequest = await this.prisma.dataExportRequest.update({
        where: { id: exportId },
        data: { status: DataExportStatus.PROCESSING },
        include: { user: true },
      });

      // 收集用户数据
      const userData = await this.collectUserData(exportRequest.userId);

      // 根据格式生成文件
      let fileContent: Buffer;
      let mimeType: string;
      let fileExtension: string;

      if (exportRequest.format === DataExportFormat.JSON) {
        fileContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf-8');
        mimeType = 'application/json';
        fileExtension = 'json';
      } else {
        // CSV 格式
        fileContent = Buffer.from(this.convertToCSV(userData), 'utf-8');
        mimeType = 'text/csv';
        fileExtension = 'csv';
      }

      // 上传到 MinIO
      const objectName = `gdpr-exports/${exportRequest.userId}/${exportId}.${fileExtension}`;
      await this.minioService.uploadFile(
        objectName,
        fileContent,
        fileContent.length,
        {
          'Content-Type': mimeType,
        },
      );

      // 计算过期时间（7天后）
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.exportExpiryDays);

      // 更新导出请求状态
      await this.prisma.dataExportRequest.update({
        where: { id: exportId },
        data: {
          status: DataExportStatus.COMPLETED,
          filePath: objectName,
          fileSize: fileContent.length,
          expiresAt,
          completedAt: new Date(),
        },
      });

      // 发送邮件通知用户
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const downloadUrl = `${frontendUrl}/settings/privacy?exportId=${exportId}`;

      await this.emailService.sendEmail({
        to: exportRequest.user.email,
        subject: 'Your data export is ready - Flotilla',
        template: 'data-export-ready',
        context: {
          username: exportRequest.user.username,
          downloadUrl,
          expiresAt: expiresAt.toLocaleDateString(),
          baseUrl: frontendUrl,
        },
      });

      this.logger.log(`Export request ${exportId} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to process export ${exportId}: ${error.message}`,
      );

      // 更新状态为失败
      await this.prisma.dataExportRequest.update({
        where: { id: exportId },
        data: {
          status: DataExportStatus.FAILED,
          errorMsg: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * 收集用户所有个人数据
   * ECP-C3: 性能意识 - 使用 include 优化查询
   */
  async collectUserData(userId: string) {
    this.logger.log(`Collecting data for user: ${userId}`);

    // 用户基本信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 组织成员身份
    const organizationMemberships =
      await this.prisma.organizationMember.findMany({
        where: { userId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

    // 团队成员身份
    const teamMemberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // 项目
    const projects = await this.prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Issues（创建的）
    const authoredIssues = await this.prisma.issue.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        number: true,
        title: true,
        body: true,
        state: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    // Issues（分配的）
    const assignedIssues = await this.prisma.issueAssignee.findMany({
      where: { userId },
      include: {
        issue: {
          select: {
            id: true,
            number: true,
            title: true,
            state: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Issue 评论
    const issueComments = await this.prisma.issueComment.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        body: true,
        createdAt: true,
        issue: {
          select: {
            number: true,
            title: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Pull Requests（创建的）
    const authoredPRs = await this.prisma.pullRequest.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        number: true,
        title: true,
        body: true,
        state: true,
        sourceBranch: true,
        targetBranch: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    // Pull Requests（分配的）
    const assignedPRs = await this.prisma.pRAssignee.findMany({
      where: { userId },
      include: {
        pullRequest: {
          select: {
            id: true,
            number: true,
            title: true,
            state: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // PR 评论
    const prComments = await this.prisma.pRComment.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        body: true,
        filePath: true,
        lineNumber: true,
        createdAt: true,
        pullRequest: {
          select: {
            number: true,
            title: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // PR 审查
    const prReviews = await this.prisma.pRReview.findMany({
      where: { reviewerId: userId },
      select: {
        id: true,
        state: true,
        body: true,
        createdAt: true,
        pullRequest: {
          select: {
            number: true,
            title: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // 提交记录
    const commits = await this.prisma.commit.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        message: true,
        hash: true,
        createdAt: true,
        repository: {
          select: {
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 100, // 限制数量，避免数据过大
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 通知
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        read: true,
        link: true,
        createdAt: true,
      },
      take: 100, // 限制数量
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 审计日志
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        entityType: true,
        description: true,
        success: true,
        createdAt: true,
      },
      take: 100, // 限制数量
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 组装完整数据
    return {
      exportDate: new Date().toISOString(),
      user,
      organizationMemberships: organizationMemberships.map((m) => ({
        organization: m.organization,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      teamMemberships: teamMemberships.map((m) => ({
        team: m.team,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      projects,
      issues: {
        authored: authoredIssues,
        assigned: assignedIssues.map((a) => a.issue),
      },
      issueComments,
      pullRequests: {
        authored: authoredPRs,
        assigned: assignedPRs.map((a) => a.pullRequest),
      },
      prComments,
      prReviews,
      commits,
      notifications,
      auditLogs,
    };
  }

  /**
   * 将数据转换为 CSV 格式
   * ECP-B2: KISS 原则 - 简单的 CSV 转换
   */
  private convertToCSV(data: any): string {
    const sections: string[] = [];

    // 用户信息
    sections.push('=== USER PROFILE ===');
    sections.push(this.objectToCSV([data.user]));
    sections.push('');

    // 组织成员
    if (data.organizationMemberships.length > 0) {
      sections.push('=== ORGANIZATION MEMBERSHIPS ===');
      sections.push(this.objectToCSV(data.organizationMemberships));
      sections.push('');
    }

    // 团队成员
    if (data.teamMemberships.length > 0) {
      sections.push('=== TEAM MEMBERSHIPS ===');
      sections.push(this.objectToCSV(data.teamMemberships));
      sections.push('');
    }

    // 项目
    if (data.projects.length > 0) {
      sections.push('=== PROJECTS ===');
      sections.push(this.objectToCSV(data.projects));
      sections.push('');
    }

    // Issues
    if (data.issues.authored.length > 0) {
      sections.push('=== AUTHORED ISSUES ===');
      sections.push(this.objectToCSV(data.issues.authored));
      sections.push('');
    }

    // Pull Requests
    if (data.pullRequests.authored.length > 0) {
      sections.push('=== AUTHORED PULL REQUESTS ===');
      sections.push(this.objectToCSV(data.pullRequests.authored));
      sections.push('');
    }

    // 评论
    if (data.issueComments.length > 0) {
      sections.push('=== ISSUE COMMENTS ===');
      sections.push(this.objectToCSV(data.issueComments));
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * 将对象数组转换为 CSV
   */
  private objectToCSV(data: any[]): string {
    if (data.length === 0) return '';

    // 扁平化嵌套对象
    const flatData = data.map((item) => this.flattenObject(item));

    // 获取所有键
    const keys = Array.from(
      new Set(flatData.flatMap((item) => Object.keys(item))),
    );

    // 生成 CSV 头部
    const header = keys.join(',');

    // 生成 CSV 行
    const rows = flatData.map((item) =>
      keys.map((key) => this.escapeCSV(item[key])).join(','),
    );

    return [header, ...rows].join('\n');
  }

  /**
   * 扁平化嵌套对象
   */
  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const key in obj) {
      if (obj[key] === null || obj[key] === undefined) {
        flattened[prefix + key] = '';
      } else if (typeof obj[key] === 'object' && !(obj[key] instanceof Date)) {
        Object.assign(
          flattened,
          this.flattenObject(obj[key], `${prefix}${key}.`),
        );
      } else {
        flattened[prefix + key] = obj[key];
      }
    }

    return flattened;
  }

  /**
   * 转义 CSV 字段
   */
  private escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';

    const str = String(value);

    // 如果包含逗号、引号或换行符，需要用引号包裹并转义
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * 查询导出状态
   */
  async getExportStatus(exportId: string, userId: string) {
    const exportRequest = await this.prisma.dataExportRequest.findUnique({
      where: { id: exportId },
    });

    if (!exportRequest) {
      throw new NotFoundException('Export request not found');
    }

    // 验证所有权
    if (exportRequest.userId !== userId) {
      throw new Error('Unauthorized access to export request');
    }

    return exportRequest;
  }

  /**
   * 获取用户的所有导出请求
   */
  getUserExports(userId: string) {
    return this.prisma.dataExportRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10, // 最近 10 条
    });
  }

  /**
   * 下载导出文件
   */
  async downloadExport(exportId: string, userId: string) {
    const exportRequest = await this.getExportStatus(exportId, userId);

    if (exportRequest.status !== DataExportStatus.COMPLETED) {
      throw new Error('Export is not ready for download');
    }

    if (!exportRequest.filePath) {
      throw new Error('Export file not found');
    }

    // 检查是否过期
    if (exportRequest.expiresAt && new Date() > exportRequest.expiresAt) {
      await this.prisma.dataExportRequest.update({
        where: { id: exportId },
        data: { status: DataExportStatus.EXPIRED },
      });
      throw new Error('Export file has expired');
    }

    // 获取下载 URL
    const url = await this.minioService.getFileUrl(
      exportRequest.filePath,
      3600,
    );

    return {
      url,
      fileName: `flotilla-data-export-${exportRequest.format.toLowerCase()}.${exportRequest.format === DataExportFormat.JSON ? 'json' : 'csv'}`,
      fileSize: exportRequest.fileSize,
      expiresAt: exportRequest.expiresAt,
    };
  }

  /**
   * 清理过期的导出文件（定时任务调用）
   */
  async cleanupExpiredExports() {
    this.logger.log('Starting cleanup of expired exports');

    const expiredExports = await this.prisma.dataExportRequest.findMany({
      where: {
        status: DataExportStatus.COMPLETED,
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    for (const exportRequest of expiredExports) {
      try {
        // 删除 MinIO 文件
        if (exportRequest.filePath) {
          await this.minioService.deleteFile(exportRequest.filePath);
        }

        // 更新状态
        await this.prisma.dataExportRequest.update({
          where: { id: exportRequest.id },
          data: { status: DataExportStatus.EXPIRED },
        });

        this.logger.log(`Cleaned up expired export: ${exportRequest.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to cleanup export ${exportRequest.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Cleaned up ${expiredExports.length} expired exports`);
  }
}
