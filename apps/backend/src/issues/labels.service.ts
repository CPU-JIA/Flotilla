import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { Label } from '@prisma/client';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建标签
   */
  async create(projectId: string, dto: CreateLabelDto): Promise<Label> {
    // 检查同名标签是否已存在
    const existing = await this.prisma.label.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Label with name "${dto.name}" already exists in this project`,
      );
    }

    return await this.prisma.label.create({
      data: {
        projectId,
        name: dto.name,
        color: dto.color,
        description: dto.description,
      },
    });
  }

  /**
   * 获取项目所有标签
   */
  async findAll(projectId: string): Promise<Label[]> {
    return await this.prisma.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 获取单个标签
   */
  async findOne(projectId: string, id: string): Promise<Label> {
    const label = await this.prisma.label.findFirst({
      where: {
        id,
        projectId,
      },
    });

    if (!label) {
      throw new NotFoundException(`Label ${id} not found in project ${projectId}`);
    }

    return label;
  }

  /**
   * 更新标签
   */
  async update(
    projectId: string,
    id: string,
    dto: UpdateLabelDto,
  ): Promise<Label> {
    await this.findOne(projectId, id); // 验证存在

    // 如果更新名称，检查是否冲突
    if (dto.name) {
      const existing = await this.prisma.label.findUnique({
        where: {
          projectId_name: {
            projectId,
            name: dto.name,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Label with name "${dto.name}" already exists in this project`,
        );
      }
    }

    return await this.prisma.label.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除标签
   */
  async remove(projectId: string, id: string): Promise<void> {
    await this.findOne(projectId, id); // 验证存在

    await this.prisma.label.delete({
      where: { id },
    });
  }
}
