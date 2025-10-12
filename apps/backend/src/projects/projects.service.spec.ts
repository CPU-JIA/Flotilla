/**
 * 项目服务单元测试
 * ECP-D1: 可测试性设计 - 使用依赖注入Mock
 */

import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ProjectsService } from './projects.service'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole, MemberRole, Visibility } from '@prisma/client'

describe('ProjectsService', () => {
  let service: ProjectsService
  let prismaService: PrismaService

  const mockPrismaService = {
    project: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    repository: {
      create: jest.fn(),
    },
    branch: {
      create: jest.fn(),
    },
  }

  const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.DEVELOPER,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<ProjectsService>(ProjectsService)
    prismaService = module.get<PrismaService>(PrismaService)

    jest.clearAllMocks()
  })

  it('应该成功创建服务实例', () => {
    expect(service).toBeDefined()
  })

  describe('create - 创建项目', () => {
    const createDto = {
      name: 'Test Project',
      description: 'Test Description',
      visibility: Visibility.PRIVATE,
    }

    it('应该成功创建项目并初始化仓库', async () => {
      const createdProject = {
        id: '1',
        ...createDto,
        ownerId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const createdRepository = {
        id: 'repo1',
        projectId: createdProject.id,
        defaultBranch: 'main',
        storageUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const createdBranch = {
        id: 'branch1',
        name: 'main',
        repositoryId: createdRepository.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrismaService.project.create.mockResolvedValue(createdProject)
      mockPrismaService.repository.create.mockResolvedValue(createdRepository)
      mockPrismaService.branch.create.mockResolvedValue(createdBranch)

      const result = await service.create(createDto, mockUser)

      expect(result).toBeDefined()
      expect(result.name).toBe(createDto.name)
      expect(result.ownerId).toBe(mockUser.id)
      expect(mockPrismaService.project.create).toHaveBeenCalled()
      expect(mockPrismaService.repository.create).toHaveBeenCalled()
      expect(mockPrismaService.branch.create).toHaveBeenCalled()
    })
  })

  describe('findAll - 获取项目列表', () => {
    const projects = [
      {
        id: '1',
        name: 'Project 1',
        description: 'Description 1',
        visibility: Visibility.PUBLIC,
        ownerId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: mockUser,
        members: [],
        _count: { members: 1 },
      },
      {
        id: '2',
        name: 'Project 2',
        description: 'Description 2',
        visibility: Visibility.PRIVATE,
        ownerId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: mockUser,
        members: [],
        _count: { members: 1 },
      },
    ]

    it('应该返回用户可访问的项目列表', async () => {
      mockPrismaService.project.findMany.mockResolvedValue(projects)
      mockPrismaService.project.count.mockResolvedValue(2)

      const result = await service.findAll(1, 10, undefined, undefined, mockUser)

      expect(result.projects).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
      expect(mockPrismaService.project.findMany).toHaveBeenCalled()
    })

    it('应该支持按可见性筛选', async () => {
      const publicProjects = [projects[0]]
      mockPrismaService.project.findMany.mockResolvedValue(publicProjects)
      mockPrismaService.project.count.mockResolvedValue(1)

      const result = await service.findAll(1, 10, undefined, 'PUBLIC', mockUser)

      expect(result.projects).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: Visibility.PUBLIC,
          }),
        })
      )
    })

    it('应该支持搜索功能', async () => {
      const searchResult = [projects[0]]
      mockPrismaService.project.findMany.mockResolvedValue(searchResult)
      mockPrismaService.project.count.mockResolvedValue(1)

      const result = await service.findAll(1, 10, 'Project 1', undefined, mockUser)

      expect(result.projects).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('findOne - 获取项目详情', () => {
    const project = {
      id: '1',
      name: 'Test Project',
      description: 'Test Description',
      visibility: Visibility.PRIVATE,
      ownerId: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      owner: mockUser,
      members: [
        {
          id: 'member1',
          userId: mockUser.id,
          projectId: '1',
          role: MemberRole.OWNER,
          joinedAt: new Date(),
          user: mockUser,
        },
      ],
      repository: {
        id: 'repo1',
        projectId: '1',
        defaultBranch: 'main',
        storageUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    it('项目成员应该能够访问项目详情', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(project)

      const result = await service.findOne('1', mockUser)

      expect(result).toBeDefined()
      expect(result.name).toBe(project.name)
      expect(mockPrismaService.project.findUnique).toHaveBeenCalled()
    })

    it('应该在项目不存在时抛出 NotFoundException', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null)

      await expect(service.findOne('999', mockUser)).rejects.toThrow(NotFoundException)
      await expect(service.findOne('999', mockUser)).rejects.toThrow('项目不存在')
    })

    it('非成员不能访问私有项目', async () => {
      const otherUser = { ...mockUser, id: '2' }
      const privateProject = {
        ...project,
        members: [
          {
            id: 'member1',
            userId: mockUser.id,
            projectId: '1',
            role: MemberRole.OWNER,
            joinedAt: new Date(),
          },
        ],
      }
      mockPrismaService.project.findUnique.mockResolvedValue(privateProject)

      await expect(service.findOne('1', otherUser)).rejects.toThrow(ForbiddenException)
      await expect(service.findOne('1', otherUser)).rejects.toThrow('您没有权限访问此项目')
    })
  })

  describe('update - 更新项目', () => {
    const project = {
      id: '1',
      name: 'Test Project',
      description: 'Test Description',
      visibility: Visibility.PRIVATE,
      ownerId: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        {
          id: 'member1',
          userId: mockUser.id,
          projectId: '1',
          role: MemberRole.OWNER,
          joinedAt: new Date(),
        },
      ],
    }

    const updateDto = {
      name: 'Updated Project',
      description: 'Updated Description',
    }

    it('项目所有者应该能够更新项目', async () => {
      const updatedProject = { ...project, ...updateDto }
      mockPrismaService.project.findUnique.mockResolvedValue(project)
      mockPrismaService.project.update.mockResolvedValue(updatedProject)

      const result = await service.update('1', updateDto, mockUser)

      expect(result.name).toBe(updateDto.name)
      expect(result.description).toBe(updateDto.description)
      expect(mockPrismaService.project.update).toHaveBeenCalled()
    })

    it('非所有者不能更新项目', async () => {
      const otherUser = { ...mockUser, id: '2' }
      mockPrismaService.project.findUnique.mockResolvedValue(project)

      await expect(service.update('1', updateDto, otherUser)).rejects.toThrow(ForbiddenException)
      await expect(service.update('1', updateDto, otherUser)).rejects.toThrow('只有项目所有者可以修改项目信息')
    })
  })

  describe('remove - 删除项目', () => {
    const project = {
      id: '1',
      name: 'Test Project',
      ownerId: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('项目所有者应该能够删除项目', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(project)
      mockPrismaService.project.delete.mockResolvedValue(project)

      const result = await service.remove('1', mockUser)

      expect(result.message).toBe('项目删除成功')
      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({ where: { id: '1' } })
    })

    it('非所有者不能删除项目', async () => {
      const otherUser = { ...mockUser, id: '2' }
      mockPrismaService.project.findUnique.mockResolvedValue(project)

      await expect(service.remove('1', otherUser)).rejects.toThrow(ForbiddenException)
      await expect(service.remove('1', otherUser)).rejects.toThrow('只有项目所有者可以删除项目')
    })
  })

  describe('addMember - 添加成员', () => {
    const project = {
      id: '1',
      name: 'Test Project',
      ownerId: mockUser.id,
      members: [
        {
          id: 'member1',
          userId: mockUser.id,
          projectId: '1',
          role: MemberRole.OWNER,
          joinedAt: new Date(),
        },
      ],
    }

    const addMemberDto = {
      userId: '2',
      role: MemberRole.MEMBER,
    }

    it('项目所有者应该能够添加成员', async () => {
      const newMember = {
        id: 'member2',
        userId: addMemberDto.userId,
        projectId: project.id,
        role: addMemberDto.role,
        joinedAt: new Date(),
        user: { ...mockUser, id: '2', username: 'newuser' },
      }

      mockPrismaService.project.findUnique.mockResolvedValue(project)
      mockPrismaService.projectMember.findUnique.mockResolvedValue(null)
      mockPrismaService.projectMember.create.mockResolvedValue(newMember)

      const result = await service.addMember('1', addMemberDto, mockUser)

      expect(result.userId).toBe(addMemberDto.userId)
      expect(result.role).toBe(addMemberDto.role)
      expect(mockPrismaService.projectMember.create).toHaveBeenCalled()
    })

    it('非所有者不能添加成员', async () => {
      const otherUser = { ...mockUser, id: '2' }
      mockPrismaService.project.findUnique.mockResolvedValue(project)

      await expect(service.addMember('1', addMemberDto, otherUser)).rejects.toThrow(ForbiddenException)
      await expect(service.addMember('1', addMemberDto, otherUser)).rejects.toThrow('只有项目所有者可以添加成员')
    })

    it('不能添加已存在的成员', async () => {
      const existingMember = {
        id: 'member2',
        userId: addMemberDto.userId,
        projectId: project.id,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
      }

      mockPrismaService.project.findUnique.mockResolvedValue(project)
      mockPrismaService.projectMember.findUnique.mockResolvedValue(existingMember)

      await expect(service.addMember('1', addMemberDto, mockUser)).rejects.toThrow(ForbiddenException)
      await expect(service.addMember('1', addMemberDto, mockUser)).rejects.toThrow('用户已是项目成员')
    })
  })

  describe('removeMember - 移除成员', () => {
    const project = {
      id: '1',
      name: 'Test Project',
      ownerId: mockUser.id,
      members: [
        {
          id: 'member1',
          userId: mockUser.id,
          projectId: '1',
          role: MemberRole.OWNER,
          joinedAt: new Date(),
        },
        {
          id: 'member2',
          userId: '2',
          projectId: '1',
          role: MemberRole.MEMBER,
          joinedAt: new Date(),
        },
      ],
    }

    it('项目所有者应该能够移除成员', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(project)
      mockPrismaService.projectMember.delete.mockResolvedValue(project.members[1])

      const result = await service.removeMember('1', '2', mockUser)

      expect(result.message).toBe('成员移除成功')
      expect(mockPrismaService.projectMember.delete).toHaveBeenCalled()
    })

    it('不能移除项目所有者', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(project)

      await expect(service.removeMember('1', mockUser.id, mockUser)).rejects.toThrow(ForbiddenException)
      await expect(service.removeMember('1', mockUser.id, mockUser)).rejects.toThrow('不能移除项目所有者')
    })

    it('非所有者不能移除成员', async () => {
      const otherUser = { ...mockUser, id: '3' }
      mockPrismaService.project.findUnique.mockResolvedValue(project)

      await expect(service.removeMember('1', '2', otherUser)).rejects.toThrow(ForbiddenException)
      await expect(service.removeMember('1', '2', otherUser)).rejects.toThrow('只有项目所有者可以移除成员')
    })
  })

  describe('updateMemberRole - 更新成员角色', () => {
    const project = {
      id: '1',
      name: 'Test Project',
      ownerId: mockUser.id,
      members: [
        {
          id: 'member1',
          userId: mockUser.id,
          projectId: '1',
          role: MemberRole.OWNER,
          joinedAt: new Date(),
        },
        {
          id: 'member2',
          userId: '2',
          projectId: '1',
          role: MemberRole.MEMBER,
          joinedAt: new Date(),
          user: { ...mockUser, id: '2' },
        },
      ],
    }

    it('项目所有者应该能够更新成员角色', async () => {
      const updatedMember = {
        ...project.members[1],
        role: MemberRole.VIEWER,
      }

      mockPrismaService.project.findUnique.mockResolvedValue(project)
      mockPrismaService.projectMember.update.mockResolvedValue(updatedMember)

      const result = await service.updateMemberRole('1', '2', { role: MemberRole.VIEWER }, mockUser)

      expect(result.role).toBe(MemberRole.VIEWER)
      expect(mockPrismaService.projectMember.update).toHaveBeenCalled()
    })

    it('不能修改项目所有者的角色', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(project)

      await expect(
        service.updateMemberRole('1', mockUser.id, { role: MemberRole.MEMBER }, mockUser)
      ).rejects.toThrow(ForbiddenException)
      await expect(
        service.updateMemberRole('1', mockUser.id, { role: MemberRole.MEMBER }, mockUser)
      ).rejects.toThrow('不能修改项目所有者的角色')
    })
  })
})
