import { Test, TestingModule } from '@nestjs/testing'
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { WikiService } from './wiki.service'
import { PrismaService } from '../prisma/prisma.service'

/**
 * WikiService Unit Tests
 * ECP-B4: Context-Aware TDD - 完整的业务逻辑测试覆盖
 * ECP-D1: Design for Testability - 通过 mock 隔离依赖
 */
describe('WikiService', () => {
  let service: WikiService
  let prisma: PrismaService

  const mockPrismaService = {
    wikiPage: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wikiPageHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WikiService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<WikiService>(WikiService)
    prisma = module.get<PrismaService>(PrismaService)

    // 清除所有 mock 调用历史
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createPage', () => {
    const projectId = 'project-1'
    const userId = 'user-1'
    const createDto = {
      slug: 'getting-started',
      title: 'Getting Started',
      content: '# Getting Started\n\nWelcome!',
      order: 0,
    }

    it('should create a wiki page successfully', async () => {
      const mockPage = {
        id: 'page-1',
        projectId,
        ...createDto,
        parentId: null,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: userId,
          username: 'john',
          email: 'john@example.com',
          avatar: null,
        },
      }

      mockPrismaService.wikiPage.findUnique.mockResolvedValue(null) // slug 不存在
      mockPrismaService.wikiPage.create.mockResolvedValue(mockPage)
      mockPrismaService.wikiPageHistory.create.mockResolvedValue({})

      const result = await service.createPage(projectId, userId, createDto)

      expect(result).toEqual(mockPage)
      expect(prisma.wikiPage.create).toHaveBeenCalledWith({
        data: {
          projectId,
          slug: createDto.slug,
          title: createDto.title,
          content: createDto.content,
          parentId: undefined,
          order: 0,
          createdById: userId,
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
      })
      expect(prisma.wikiPageHistory.create).toHaveBeenCalledWith({
        data: {
          pageId: mockPage.id,
          title: mockPage.title,
          content: mockPage.content,
          editedById: userId,
          message: 'Initial version',
        },
      })
    })

    it('should throw ConflictException if slug already exists', async () => {
      mockPrismaService.wikiPage.findUnique.mockResolvedValue({
        id: 'existing-page',
        slug: createDto.slug,
      })

      await expect(
        service.createPage(projectId, userId, createDto),
      ).rejects.toThrow(ConflictException)
    })

    it('should throw NotFoundException if parent page does not exist', async () => {
      const dtoWithParent = { ...createDto, parentId: 'non-existent-parent' }

      mockPrismaService.wikiPage.findUnique
        .mockResolvedValueOnce(null) // slug 检查
        .mockResolvedValueOnce(null) // 父页面不存在

      await expect(
        service.createPage(projectId, userId, dtoWithParent),
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException if parent belongs to different project', async () => {
      const dtoWithParent = { ...createDto, parentId: 'parent-1' }

      mockPrismaService.wikiPage.findUnique
        .mockResolvedValueOnce(null) // slug 检查
        .mockResolvedValueOnce({
          id: 'parent-1',
          projectId: 'different-project',
        }) // 父页面属于不同项目

      await expect(
        service.createPage(projectId, userId, dtoWithParent),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('getPage', () => {
    const projectId = 'project-1'
    const slug = 'getting-started'

    it('should return a wiki page', async () => {
      const mockPage = {
        id: 'page-1',
        projectId,
        slug,
        title: 'Getting Started',
        content: '# Getting Started',
        parentId: null,
        order: 0,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          username: 'john',
          email: 'john@example.com',
          avatar: null,
        },
      }

      mockPrismaService.wikiPage.findUnique.mockResolvedValue(mockPage)

      const result = await service.getPage(projectId, slug)

      expect(result).toEqual(mockPage)
      expect(prisma.wikiPage.findUnique).toHaveBeenCalledWith({
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
      })
    })

    it('should throw NotFoundException if page does not exist', async () => {
      mockPrismaService.wikiPage.findUnique.mockResolvedValue(null)

      await expect(service.getPage(projectId, slug)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('getWikiTree', () => {
    const projectId = 'project-1'

    it('should return a hierarchical tree of wiki pages', async () => {
      const mockPages = [
        {
          id: 'page-1',
          slug: 'root',
          title: 'Root',
          parentId: null,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'page-2',
          slug: 'child-1',
          title: 'Child 1',
          parentId: 'page-1',
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'page-3',
          slug: 'child-2',
          title: 'Child 2',
          parentId: 'page-1',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrismaService.wikiPage.findMany.mockResolvedValue(mockPages)

      const result = await service.getWikiTree(projectId)

      expect(result).toHaveLength(1) // 1 根节点
      expect(result[0].id).toBe('page-1')
      expect(result[0].children).toHaveLength(2) // 2 子节点
      expect(result[0].children[0].id).toBe('page-2')
      expect(result[0].children[1].id).toBe('page-3')
    })

    it('should return empty array if no pages exist', async () => {
      mockPrismaService.wikiPage.findMany.mockResolvedValue([])

      const result = await service.getWikiTree(projectId)

      expect(result).toEqual([])
    })
  })

  describe('updatePage', () => {
    const projectId = 'project-1'
    const slug = 'getting-started'
    const userId = 'user-1'

    it('should update a wiki page successfully', async () => {
      const updateDto = {
        title: 'Updated Title',
        content: '# Updated Content',
        message: 'Updated documentation',
      }

      const existingPage = {
        id: 'page-1',
        projectId,
        slug,
        title: 'Old Title',
        content: '# Old Content',
        parentId: null,
        order: 0,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedPage = {
        ...existingPage,
        ...updateDto,
        createdBy: {
          id: userId,
          username: 'john',
          email: 'john@example.com',
          avatar: null,
        },
      }

      mockPrismaService.wikiPage.findUnique.mockResolvedValue(existingPage)
      mockPrismaService.wikiPage.update.mockResolvedValue(updatedPage)
      mockPrismaService.wikiPageHistory.create.mockResolvedValue({})

      const result = await service.updatePage(
        projectId,
        slug,
        userId,
        updateDto,
      )

      expect(result.title).toBe(updateDto.title)
      expect(result.content).toBe(updateDto.content)
      expect(prisma.wikiPageHistory.create).toHaveBeenCalled()
    })

    it('should throw NotFoundException if page does not exist', async () => {
      mockPrismaService.wikiPage.findUnique.mockResolvedValue(null)

      await expect(
        service.updatePage(projectId, slug, userId, { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ConflictException if new slug already exists', async () => {
      const existingPage = {
        id: 'page-1',
        projectId,
        slug,
      }

      mockPrismaService.wikiPage.findUnique
        .mockResolvedValueOnce(existingPage) // 现有页面
        .mockResolvedValueOnce({ id: 'page-2', slug: 'new-slug' }) // 新 slug 已存在

      await expect(
        service.updatePage(projectId, slug, userId, { slug: 'new-slug' }),
      ).rejects.toThrow(ConflictException)
    })

    it('should throw BadRequestException if trying to set self as parent', async () => {
      const existingPage = {
        id: 'page-1',
        projectId,
        slug,
      }

      mockPrismaService.wikiPage.findUnique.mockResolvedValue(existingPage)

      await expect(
        service.updatePage(projectId, slug, userId, { parentId: 'page-1' }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('deletePage', () => {
    const projectId = 'project-1'
    const slug = 'getting-started'

    it('should delete a wiki page successfully', async () => {
      const mockPage = {
        id: 'page-1',
        projectId,
        slug,
      }

      mockPrismaService.wikiPage.findUnique.mockResolvedValue(mockPage)
      mockPrismaService.wikiPage.delete.mockResolvedValue(mockPage)

      await service.deletePage(projectId, slug)

      expect(prisma.wikiPage.delete).toHaveBeenCalledWith({
        where: { id: mockPage.id },
      })
    })

    it('should throw NotFoundException if page does not exist', async () => {
      mockPrismaService.wikiPage.findUnique.mockResolvedValue(null)

      await expect(service.deletePage(projectId, slug)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('getPageHistory', () => {
    const projectId = 'project-1'
    const slug = 'getting-started'

    it('should return page history', async () => {
      const mockPage = {
        id: 'page-1',
        projectId,
        slug,
      }

      const mockHistory = [
        {
          id: 'history-1',
          pageId: 'page-1',
          title: 'Getting Started',
          content: '# Version 2',
          editedById: 'user-1',
          editedAt: new Date(),
          message: 'Updated',
          editedBy: {
            id: 'user-1',
            username: 'john',
            email: 'john@example.com',
            avatar: null,
          },
        },
        {
          id: 'history-2',
          pageId: 'page-1',
          title: 'Getting Started',
          content: '# Version 1',
          editedById: 'user-1',
          editedAt: new Date(),
          message: 'Initial version',
          editedBy: {
            id: 'user-1',
            username: 'john',
            email: 'john@example.com',
            avatar: null,
          },
        },
      ]

      mockPrismaService.wikiPage.findUnique.mockResolvedValue(mockPage)
      mockPrismaService.wikiPageHistory.findMany.mockResolvedValue(mockHistory)

      const result = await service.getPageHistory(projectId, slug)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('history-1')
      expect(result[1].id).toBe('history-2')
    })

    it('should throw NotFoundException if page does not exist', async () => {
      mockPrismaService.wikiPage.findUnique.mockResolvedValue(null)

      await expect(service.getPageHistory(projectId, slug)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
