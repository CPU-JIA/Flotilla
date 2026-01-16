import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RepositoryHelpers } from './repository.helpers';
import { CreateBranchDto } from '../dto';
import type { User, Branch } from '@prisma/client';

/**
 * Repository分支管理服务
 * ECP-A1: 单一职责 - 专注于分支操作
 */
@Injectable()
export class RepositoryBranchesService {
  private readonly logger = new Logger(RepositoryBranchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helpers: RepositoryHelpers,
  ) {}

  /**
   * 创建分支
   * ECP-C1: 防御性编程 - 检查唯一性
   */
  async createBranch(
    projectId: string,
    createBranchDto: CreateBranchDto,
    currentUser: User,
  ): Promise<Branch> {
    await this.helpers.checkProjectPermission(projectId, currentUser, true);

    const repository = await this.prisma.repository.findUnique({
      where: { projectId },
    });

    if (!repository) {
      throw new NotFoundException('仓库不存在');
    }

    // 检查分支名是否已存在
    const existingBranch = await this.prisma.branch.findFirst({
      where: {
        repositoryId: repository.id,
        name: createBranchDto.name,
      },
    });

    if (existingBranch) {
      throw new ConflictException('分支名已存在');
    }

    const branch = await this.prisma.branch.create({
      data: {
        name: createBranchDto.name,
        repositoryId: repository.id,
      },
    });

    this.logger.log(
      `🌿 Branch "${branch.name}" created in project ${projectId}`,
    );
    return branch;
  }

  /**
   * 获取分支列表
   */
  async getBranches(projectId: string, currentUser: User): Promise<Branch[]> {
    await this.helpers.checkProjectPermission(projectId, currentUser);

    const repository = await this.prisma.repository.findUnique({
      where: { projectId },
    });

    if (!repository) {
      throw new NotFoundException('仓库不存在');
    }

    return this.prisma.branch.findMany({
      where: { repositoryId: repository.id },
      include: {
        _count: {
          select: { commits: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
