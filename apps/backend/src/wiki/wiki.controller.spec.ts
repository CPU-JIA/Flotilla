import { Test, TestingModule } from '@nestjs/testing'
import { WikiController } from './wiki.controller'
import { WikiService } from './wiki.service'
import { PermissionService } from '../common/services/permission.service'

/**
 * WikiController Unit Tests
 * ECP-B4: Context-Aware TDD - 测试 HTTP 层逻辑和权限检查
 * ECP-D1: Design for Testability - 通过 mock 隔离依赖
 */
describe('WikiController', () => {
  let controller: WikiController
  let wikiService: WikiService
  let permissionService: PermissionService

  const mockWikiService = {
    createPage: jest.fn(),
    getPage: jest.fn(),
    getWikiTree: jest.fn(),
    updatePage: jest.fn(),
    deletePage: jest.fn(),
    getPageHistory: jest.fn(),
  }

  const mockPermissionService = {
    checkProjectPermission: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WikiController],
      providers: [
        {
          provide: WikiService,
          useValue: mockWikiService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).compile()

    controller = module.get<WikiController>(WikiController)
    wikiService = module.get<WikiService>(WikiService)
    permissionService = module.get<PermissionService>(PermissionService)

    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('createPage', () => {
    const projectId = 'project-1'
    const userId = 'user-1'
    const createDto = {
      slug: 'getting-started',
      title: 'Getting Started',
      content: '# Getting Started',
    }

    it('should create a page with MEMBER permission', async () => {
      const mockPage = {
        id: 'page-1',
        projectId,
        ...createDto,
        parentId: null,
        order: 0,
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

      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined)
      mockWikiService.createPage.mockResolvedValue(mockPage)

      const result = await controller.createPage(projectId, userId, createDto)

      expect(result).toEqual(mockPage)
      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        userId,
        projectId,
        'MEMBER',
      )
      expect(wikiService.createPage).toHaveBeenCalledWith(
        projectId,
        userId,
        createDto,
      )
    })

    it('should throw if user lacks MEMBER permission', async () => {
      mockPermissionService.checkProjectPermission.mockRejectedValue(
        new Error('Forbidden'),
      )

      await expect(
        controller.createPage(projectId, userId, createDto),
      ).rejects.toThrow()
      expect(wikiService.createPage).not.toHaveBeenCalled()
    })
  })

  describe('getWikiTree', () => {
    const projectId = 'project-1'
    const userId = 'user-1'

    it('should return wiki tree with VIEWER permission', async () => {
      const mockTree = [
        {
          id: 'page-1',
          slug: 'root',
          title: 'Root',
          parentId: null,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [],
        },
      ]

      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined)
      mockWikiService.getWikiTree.mockResolvedValue(mockTree)

      const result = await controller.getWikiTree(projectId, userId)

      expect(result).toEqual(mockTree)
      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        userId,
        projectId,
        'VIEWER',
      )
      expect(wikiService.getWikiTree).toHaveBeenCalledWith(projectId)
    })

    it('should throw if user lacks VIEWER permission', async () => {
      mockPermissionService.checkProjectPermission.mockRejectedValue(
        new Error('Forbidden'),
      )

      await expect(controller.getWikiTree(projectId, userId)).rejects.toThrow()
      expect(wikiService.getWikiTree).not.toHaveBeenCalled()
    })
  })

  describe('getPage', () => {
    const projectId = 'project-1'
    const userId = 'user-1'
    const slug = 'getting-started'

    it('should return a page with VIEWER permission', async () => {
      const mockPage = {
        id: 'page-1',
        projectId,
        slug,
        title: 'Getting Started',
        content: '# Getting Started',
        parentId: null,
        order: 0,
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

      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined)
      mockWikiService.getPage.mockResolvedValue(mockPage)

      const result = await controller.getPage(projectId, slug, userId)

      expect(result).toEqual(mockPage)
      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        userId,
        projectId,
        'VIEWER',
      )
      expect(wikiService.getPage).toHaveBeenCalledWith(projectId, slug)
    })
  })

  describe('updatePage', () => {
    const projectId = 'project-1'
    const userId = 'user-1'
    const slug = 'getting-started'
    const updateDto = {
      title: 'Updated Title',
      content: '# Updated Content',
    }

    it('should update a page with MEMBER permission', async () => {
      const mockPage = {
        id: 'page-1',
        projectId,
        slug,
        ...updateDto,
        parentId: null,
        order: 0,
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

      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined)
      mockWikiService.updatePage.mockResolvedValue(mockPage)

      const result = await controller.updatePage(
        projectId,
        slug,
        userId,
        updateDto,
      )

      expect(result).toEqual(mockPage)
      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        userId,
        projectId,
        'MEMBER',
      )
      expect(wikiService.updatePage).toHaveBeenCalledWith(
        projectId,
        slug,
        userId,
        updateDto,
      )
    })

    it('should throw if user lacks MEMBER permission', async () => {
      mockPermissionService.checkProjectPermission.mockRejectedValue(
        new Error('Forbidden'),
      )

      await expect(
        controller.updatePage(projectId, slug, userId, updateDto),
      ).rejects.toThrow()
      expect(wikiService.updatePage).not.toHaveBeenCalled()
    })
  })

  describe('deletePage', () => {
    const projectId = 'project-1'
    const userId = 'user-1'
    const slug = 'getting-started'

    it('should delete a page with MAINTAINER permission', async () => {
      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined)
      mockWikiService.deletePage.mockResolvedValue(undefined)

      await controller.deletePage(projectId, slug, userId)

      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        userId,
        projectId,
        'MAINTAINER',
      )
      expect(wikiService.deletePage).toHaveBeenCalledWith(projectId, slug)
    })

    it('should throw if user lacks MAINTAINER permission', async () => {
      mockPermissionService.checkProjectPermission.mockRejectedValue(
        new Error('Forbidden'),
      )

      await expect(
        controller.deletePage(projectId, slug, userId),
      ).rejects.toThrow()
      expect(wikiService.deletePage).not.toHaveBeenCalled()
    })
  })

  describe('getPageHistory', () => {
    const projectId = 'project-1'
    const userId = 'user-1'
    const slug = 'getting-started'

    it('should return page history with VIEWER permission', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          pageId: 'page-1',
          title: 'Getting Started',
          content: '# Version 2',
          editedById: userId,
          editedAt: new Date(),
          message: 'Updated',
          editedBy: {
            id: userId,
            username: 'john',
            email: 'john@example.com',
            avatar: null,
          },
        },
      ]

      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined)
      mockWikiService.getPageHistory.mockResolvedValue(mockHistory)

      const result = await controller.getPageHistory(projectId, slug, userId)

      expect(result).toEqual(mockHistory)
      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        userId,
        projectId,
        'VIEWER',
      )
      expect(wikiService.getPageHistory).toHaveBeenCalledWith(projectId, slug)
    })
  })
})
