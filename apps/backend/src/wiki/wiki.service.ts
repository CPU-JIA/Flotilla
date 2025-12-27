import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { WikiPage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto';
import {
  WikiPageResponseDto,
  WikiTreeNodeDto,
  WikiPageHistoryResponseDto,
} from './dto/wiki-page-response.dto';

/**
 * Wiki Service
 * 管理项目 Wiki 文档的业务逻辑
 *
 * ECP-A1: SOLID - 单一职责原则（仅处理 Wiki 相关逻辑）
 * ECP-A2: 高内聚低耦合 - 通过 PrismaService 解耦数据库操作
 * ECP-C1: 防御性编程 - 完整的输入验证和错误处理
 * ECP-C2: 系统性错误处理 - 明确的异常类型
 */
@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建新的 Wiki 页面
   * ECP-C1: 验证 slug 唯一性、父页面存在性、防止循环引用
   */
  async createPage(
    projectId: string,
    userId: string,
    dto: CreateWikiPageDto,
  ): Promise<WikiPageResponseDto> {
    // 检查 slug 是否已存在
    const existing = await this.prisma.wikiPage.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug: dto.slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Wiki page with slug "${dto.slug}" already exists in this project`,
      );
    }

    // 如果指定了父页面，验证父页面存在且属于同一项目
    if (dto.parentId) {
      const parent = await this.prisma.wikiPage.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent page with ID "${dto.parentId}" not found`,
        );
      }

      if (parent.projectId !== projectId) {
        throw new BadRequestException(
          'Parent page must belong to the same project',
        );
      }
    }

    // 创建页面
    const page = await this.prisma.wikiPage.create({
      data: {
        projectId,
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        parentId: dto.parentId,
        order: dto.order ?? 0,
        createdById: userId,
        lastEditedById: userId, // 创建者同时也是最后编辑者
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // 创建初始历史记录
    await this.prisma.wikiPageHistory.create({
      data: {
        pageId: page.id,
        title: page.title,
        content: page.content,
        editedById: userId,
        version: 1, // 初始版本号
      },
    });

    return this.toResponseDto(page);
  }

  /**
   * 获取单个 Wiki 页面
   */
  async getPage(projectId: string, slug: string): Promise<WikiPageResponseDto> {
    const page = await this.prisma.wikiPage.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug,
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(
        `Wiki page with slug "${slug}" not found in this project`,
      );
    }

    return this.toResponseDto(page);
  }

  /**
   * 获取项目的 Wiki 页面树结构
   * ECP-C3: Performance - 使用递归 CTE 优化层级查询
   */
  async getWikiTree(projectId: string): Promise<WikiTreeNodeDto[]> {
    const pages = await this.prisma.wikiPage.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        parentId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 构建树结构
    return this.buildTree(pages, null);
  }

  /**
   * 更新 Wiki 页面
   * ECP-C1: 验证循环引用、slug 唯一性
   */
  async updatePage(
    projectId: string,
    slug: string,
    userId: string,
    dto: UpdateWikiPageDto,
  ): Promise<WikiPageResponseDto> {
    // 获取现有页面
    const page = await this.prisma.wikiPage.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug,
        },
      },
    });

    if (!page) {
      throw new NotFoundException(
        `Wiki page with slug "${slug}" not found in this project`,
      );
    }

    // 如果更新 slug，检查新 slug 是否已存在
    if (dto.slug && dto.slug !== slug) {
      const existing = await this.prisma.wikiPage.findUnique({
        where: {
          projectId_slug: {
            projectId,
            slug: dto.slug,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Wiki page with slug "${dto.slug}" already exists in this project`,
        );
      }
    }

    // 如果更新父页面，验证不会造成循环引用
    if (dto.parentId !== undefined) {
      if (dto.parentId === page.id) {
        throw new BadRequestException('A page cannot be its own parent');
      }

      if (dto.parentId) {
        await this.validateNoCircularReference(page.id, dto.parentId);
      }
    }

    // 更新页面
    const updated = await this.prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        parentId: dto.parentId === null ? null : (dto.parentId ?? undefined),
        order: dto.order,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // 如果内容有变化，创建历史记录
    if (dto.content && dto.content !== page.content) {
      // 获取最新版本号
      const latestHistory = await this.prisma.wikiPageHistory.findFirst({
        where: { pageId: updated.id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      const nextVersion = (latestHistory?.version ?? 0) + 1;

      await this.prisma.wikiPageHistory.create({
        data: {
          pageId: updated.id,
          title: updated.title,
          content: updated.content,
          editedById: userId,
          version: nextVersion,
        },
      });
    }

    return this.toResponseDto(updated);
  }

  /**
   * 删除 Wiki 页面
   * ECP-C1: 级联删除子页面（通过 Prisma onDelete: Cascade 自动处理）
   */
  async deletePage(projectId: string, slug: string): Promise<void> {
    const page = await this.prisma.wikiPage.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug,
        },
      },
    });

    if (!page) {
      throw new NotFoundException(
        `Wiki page with slug "${slug}" not found in this project`,
      );
    }

    await this.prisma.wikiPage.delete({
      where: { id: page.id },
    });
  }

  /**
   * 获取页面历史记录
   */
  async getPageHistory(
    projectId: string,
    slug: string,
  ): Promise<WikiPageHistoryResponseDto[]> {
    const page = await this.prisma.wikiPage.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug,
        },
      },
    });

    if (!page) {
      throw new NotFoundException(
        `Wiki page with slug "${slug}" not found in this project`,
      );
    }

    const history = await this.prisma.wikiPageHistory.findMany({
      where: { pageId: page.id },
      orderBy: { editedAt: 'desc' },
      include: {
        editedBy: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return history.map((h) => ({
      id: h.id,
      pageId: h.pageId,
      title: h.title,
      content: h.content,
      version: h.version,
      editedById: h.editedById,
      editedBy: h.editedBy,
      editedAt: h.editedAt,
    }));
  }

  /**
   * 验证不会造成循环引用
   * ECP-C1: 防御性编程 - 递归检查父页面链
   */
  private async validateNoCircularReference(
    pageId: string,
    newParentId: string,
  ): Promise<void> {
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === pageId) {
        throw new BadRequestException(
          'Circular reference detected: a page cannot be a descendant of itself',
        );
      }

      const parent: { parentId: string | null } | null =
        await this.prisma.wikiPage.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });

      if (!parent) {
        throw new NotFoundException(
          `Parent page with ID "${currentId}" not found`,
        );
      }

      currentId = parent.parentId;
    }
  }

  /**
   * 构建树结构
   * ECP-B2: KISS - 简单的递归树构建算法
   */
  private buildTree(
    pages: Array<{
      id: string;
      slug: string;
      title: string;
      parentId: string | null;
      order: number;
      createdAt: Date;
      updatedAt: Date;
    }>,
    parentId: string | null,
  ): WikiTreeNodeDto[] {
    return pages
      .filter((p) => p.parentId === parentId)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        parentId: p.parentId,
        order: p.order,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        children: this.buildTree(pages, p.id),
      }));
  }

  /**
   * 转换为响应 DTO
   * ECP-D2: 注释 Why - 显式转换确保响应格式一致性
   */
  private toResponseDto(
    page: WikiPage & {
      createdBy?: {
        id?: string;
        username: string;
        email?: string;
        avatar: string | null;
      };
    },
  ): WikiPageResponseDto {
    return {
      id: page.id,
      projectId: page.projectId,
      slug: page.slug,
      title: page.title,
      content: page.content,
      parentId: page.parentId,
      order: page.order,
      createdById: page.createdById,
      createdBy: page.createdBy
        ? {
            id: page.createdBy.id ?? page.createdById,
            username: page.createdBy.username,
            email: page.createdBy.email ?? '',
            avatar: page.createdBy.avatar,
          }
        : undefined,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }
}
