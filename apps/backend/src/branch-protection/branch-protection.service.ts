import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBranchProtectionDto,
  UpdateBranchProtectionDto,
} from './dto';

/**
 * 分支保护规则Service
 *
 * 提供分支保护规则的CRUD操作
 *
 * ECP-A1: SOLID - Single Responsibility
 * - 只负责分支保护规则的业务逻辑
 *
 * ECP-C2: Systematic Error Handling
 * - 所有数据库操作包裹在try-catch中
 */
@Injectable()
export class BranchProtectionService {
  private readonly logger = new Logger(BranchProtectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建分支保护规则
   */
  async create(projectId: string, dto: CreateBranchProtectionDto) {
    try {
      // 检查是否已存在相同分支的保护规则
      const existing = await this.prisma.branchProtectionRule.findUnique({
        where: {
          projectId_branchPattern: {
            projectId,
            branchPattern: dto.branchPattern,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          `分支 "${dto.branchPattern}" 已经有保护规则`,
        );
      }

      const rule = await this.prisma.branchProtectionRule.create({
        data: {
          projectId,
          ...dto,
        },
      });

      this.logger.log(
        `✅ Created branch protection rule for ${dto.branchPattern} in project ${projectId}`,
      );

      return rule;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to create branch protection rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取项目的所有分支保护规则
   */
  async findAll(projectId: string) {
    try {
      const rules = await this.prisma.branchProtectionRule.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      });

      return rules;
    } catch (error) {
      this.logger.error(`Failed to fetch branch protection rules: ${error.message}`);
      throw error;
    }
  }

  /**
   * 根据ID获取分支保护规则
   */
  async findOne(id: string) {
    try {
      const rule = await this.prisma.branchProtectionRule.findUnique({
        where: { id },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!rule) {
        throw new NotFoundException(`分支保护规则不存在`);
      }

      return rule;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch branch protection rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * 根据分支名称获取保护规则
   *
   * 用于PR merge时检查目标分支是否受保护
   */
  async findByBranch(projectId: string, branchName: string) {
    try {
      const rule = await this.prisma.branchProtectionRule.findUnique({
        where: {
          projectId_branchPattern: {
            projectId,
            branchPattern: branchName,
          },
        },
      });

      return rule; // 可能返回null，表示分支未受保护
    } catch (error) {
      this.logger.error(
        `Failed to fetch branch protection rule for ${branchName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 更新分支保护规则
   */
  async update(id: string, dto: UpdateBranchProtectionDto) {
    try {
      // 先检查规则是否存在
      await this.findOne(id);

      const rule = await this.prisma.branchProtectionRule.update({
        where: { id },
        data: dto,
      });

      this.logger.log(`✅ Updated branch protection rule ${id}`);

      return rule;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update branch protection rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除分支保护规则
   */
  async remove(id: string) {
    try {
      // 先检查规则是否存在
      await this.findOne(id);

      await this.prisma.branchProtectionRule.delete({
        where: { id },
      });

      this.logger.log(`✅ Deleted branch protection rule ${id}`);

      return { message: '分支保护规则已删除' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete branch protection rule: ${error.message}`);
      throw error;
    }
  }
}
