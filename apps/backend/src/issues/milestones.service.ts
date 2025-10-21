import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { Milestone, Prisma } from '@prisma/client';

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建里程碑
   */
  async create(projectId: string, dto: CreateMilestoneDto): Promise<Milestone> {
    // 检查同名里程碑是否已存在
    const existing = await this.prisma.milestone.findUnique({
      where: {
        projectId_title: {
          projectId,
          title: dto.title,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Milestone with title "${dto.title}" already exists in this project`,
      );
    }

    return await this.prisma.milestone.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        _count: {
          select: {
            issues: true,
          },
        },
      },
    });
  }

  /**
   * 获取项目所有里程碑
   */
  async findAll(projectId: string, state?: 'OPEN' | 'CLOSED') {
    const where: Prisma.MilestoneWhereInput = { projectId };

    if (state) {
      where.state = state;
    }

    return await this.prisma.milestone.findMany({
      where,
      include: {
        _count: {
          select: {
            issues: true,
          },
        },
      },
      orderBy: [{ state: 'asc' }, { dueDate: 'asc' }],
    });
  }

  /**
   * 获取单个里程碑
   */
  async findOne(projectId: string, id: string): Promise<Milestone> {
    const milestone = await this.prisma.milestone.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        _count: {
          select: {
            issues: true,
          },
        },
        issues: {
          select: {
            id: true,
            number: true,
            title: true,
            state: true,
          },
          orderBy: {
            number: 'desc',
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException(
        `Milestone ${id} not found in project ${projectId}`,
      );
    }

    return milestone;
  }

  /**
   * 更新里程碑
   */
  async update(
    projectId: string,
    id: string,
    dto: UpdateMilestoneDto,
  ): Promise<Milestone> {
    await this.findOne(projectId, id); // 验证存在

    // 如果更新标题，检查是否冲突
    if (dto.title) {
      const existing = await this.prisma.milestone.findUnique({
        where: {
          projectId_title: {
            projectId,
            title: dto.title,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Milestone with title "${dto.title}" already exists in this project`,
        );
      }
    }

    const updateData: Prisma.MilestoneUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    if (dto.state !== undefined) {
      updateData.state = dto.state;
      if (dto.state === 'CLOSED') {
        updateData.closedAt = new Date();
      } else if (dto.state === 'OPEN') {
        updateData.closedAt = null;
      }
    }

    return await this.prisma.milestone.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            issues: true,
          },
        },
      },
    });
  }

  /**
   * 删除里程碑
   */
  async remove(projectId: string, id: string): Promise<void> {
    await this.findOne(projectId, id); // 验证存在

    await this.prisma.milestone.delete({
      where: { id },
    });
  }
}
