/**
 * 用户服务单元测试
 * ECP-D1: 可测试性设计 - 使用依赖注入Mock
 */

import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { UsersService } from './users.service'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'

describe('UsersService', () => {
  let service: UsersService
  let prismaService: PrismaService

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    prismaService = module.get<PrismaService>(PrismaService)

    jest.clearAllMocks()
  })

  it('应该成功创建服务实例', () => {
    expect(service).toBeDefined()
  })

  describe('findAll - 获取用户列表', () => {
    const users = [
      {
        id: '1',
        username: 'user1',
        email: 'user1@example.com',
        role: UserRole.DEVELOPER,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        username: 'user2',
        email: 'user2@example.com',
        role: UserRole.DEVELOPER,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it('应该返回分页的用户列表', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(users)
      mockPrismaService.user.count.mockResolvedValue(2)

      const result = await service.findAll(1, 10)

      expect(result.users).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
      expect(mockPrismaService.user.findMany).toHaveBeenCalled()
      expect(mockPrismaService.user.count).toHaveBeenCalled()
    })

    it('应该支持搜索功能', async () => {
      const searchResult = [users[0]]
      mockPrismaService.user.findMany.mockResolvedValue(searchResult)
      mockPrismaService.user.count.mockResolvedValue(1)

      const result = await service.findAll(1, 10, 'user1')

      expect(result.users).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      )
    })
  })

  describe('findOne - 获取单个用户', () => {
    const user = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: UserRole.DEVELOPER,
      password: 'hashedPassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('应该成功返回用户信息（不包含密码）', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(user)

      const result = await service.findOne('1')

      expect(result).toBeDefined()
      expect(result.username).toBe(user.username)
      expect(result).not.toHaveProperty('password')
    })

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException)
      await expect(service.findOne('999')).rejects.toThrow('用户不存在')
    })
  })

  describe('update - 更新用户信息', () => {
    const currentUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: UserRole.DEVELOPER,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updateDto = {
      avatar: 'https://example.com/avatar.jpg',
      bio: 'Updated bio',
    }

    it('用户应该能够更新自己的信息', async () => {
      const updatedUser = { ...currentUser, ...updateDto }
      mockPrismaService.user.findUnique.mockResolvedValue(currentUser)
      mockPrismaService.user.update.mockResolvedValue(updatedUser)

      const result = await service.update('1', updateDto, currentUser)

      expect(result.avatar).toBe(updateDto.avatar)
      expect(result.bio).toBe(updateDto.bio)
      expect(mockPrismaService.user.update).toHaveBeenCalled()
    })

    it('管理员应该能够更新其他用户的信息', async () => {
      const admin = { ...currentUser, id: '2', role: UserRole.ADMIN }
      const updatedUser = { ...currentUser, ...updateDto }
      mockPrismaService.user.findUnique.mockResolvedValue(currentUser)
      mockPrismaService.user.update.mockResolvedValue(updatedUser)

      const result = await service.update('1', updateDto, admin)

      expect(result.avatar).toBe(updateDto.avatar)
      expect(mockPrismaService.user.update).toHaveBeenCalled()
    })

    it('普通用户不能更新其他用户的信息', async () => {
      const otherUser = { ...currentUser, id: '2' }
      mockPrismaService.user.findUnique.mockResolvedValue(currentUser)

      await expect(service.update('1', updateDto, otherUser)).rejects.toThrow(ForbiddenException)
      await expect(service.update('1', updateDto, otherUser)).rejects.toThrow('您没有权限修改此用户信息')
    })
  })

  describe('updatePassword - 修改密码', () => {
    const user = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: UserRole.DEVELOPER,
      password: 'hashedOldPassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatePasswordDto = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    }

    it('应该在旧密码正确时成功修改密码', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(user)
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true))
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedNewPassword'))
      mockPrismaService.user.update.mockResolvedValue({ ...user, password: 'hashedNewPassword' })

      const result = await service.updatePassword('1', updatePasswordDto, user)

      expect(result.message).toBe('密码修改成功')
      expect(mockPrismaService.user.update).toHaveBeenCalled()
    })

    it('应该在旧密码错误时抛出 ForbiddenException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(user)
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      await expect(service.updatePassword('1', updatePasswordDto, user)).rejects.toThrow(ForbiddenException)
      await expect(service.updatePassword('1', updatePasswordDto, user)).rejects.toThrow('旧密码错误')
    })

    it('普通用户不能修改其他用户的密码', async () => {
      const otherUser = { ...user, id: '2' }
      mockPrismaService.user.findUnique.mockResolvedValue(user)

      await expect(service.updatePassword('1', updatePasswordDto, otherUser)).rejects.toThrow(ForbiddenException)
      await expect(service.updatePassword('1', updatePasswordDto, otherUser)).rejects.toThrow('您没有权限修改此用户密码')
    })
  })

  describe('remove - 删除用户', () => {
    const admin = {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const user = {
      id: '2',
      username: 'testuser',
      email: 'test@example.com',
      role: UserRole.DEVELOPER,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('管理员应该能够删除用户', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(user)
      mockPrismaService.user.delete.mockResolvedValue(user)

      const result = await service.remove('2', admin)

      expect(result.message).toBe('用户删除成功')
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({ where: { id: '2' } })
    })

    it('非管理员不能删除用户', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(user)

      await expect(service.remove('2', user)).rejects.toThrow(ForbiddenException)
      await expect(service.remove('2', user)).rejects.toThrow('只有管理员可以删除用户')
    })

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.remove('999', admin)).rejects.toThrow(NotFoundException)
      await expect(service.remove('999', admin)).rejects.toThrow('用户不存在')
    })
  })
})
