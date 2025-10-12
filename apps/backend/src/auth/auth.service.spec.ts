/**
 * 认证服务单元测试
 * ECP-D1: 可测试性设计 - 使用依赖注入Mock
 * ECP-C1: 防御性编程 - 测试边界条件和错误情况
 */

import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'

describe('AuthService', () => {
  let service: AuthService
  let prismaService: PrismaService
  let jwtService: JwtService

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  }

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    prismaService = module.get<PrismaService>(PrismaService)
    jwtService = module.get<JwtService>(JwtService)

    // 清除所有mock调用历史
    jest.clearAllMocks()
  })

  it('应该成功创建服务实例', () => {
    expect(service).toBeDefined()
  })

  describe('register - 用户注册', () => {
    const registerDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    }

    it('应该成功注册新用户并返回令牌', async () => {
      const hashedPassword = 'hashedPassword123'
      const createdUser = {
        id: '1',
        ...registerDto,
        password: hashedPassword,
        role: UserRole.DEVELOPER,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrismaService.user.findFirst.mockResolvedValue(null)
      mockPrismaService.user.create.mockResolvedValue(createdUser)
      mockJwtService.sign.mockReturnValueOnce('accessToken').mockReturnValueOnce('refreshToken')

      // Mock bcrypt.hash
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve(hashedPassword))

      const result = await service.register(registerDto)

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('user')
      expect(result.user.username).toBe(registerDto.username)
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledTimes(2) // username + email
      expect(mockPrismaService.user.create).toHaveBeenCalled()
    })

    it('当用户名已存在时应抛出 ConflictException', async () => {
      mockPrismaService.user.findFirst.mockResolvedValueOnce({ id: '1', username: registerDto.username })

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException)
      await expect(service.register(registerDto)).rejects.toThrow('用户名已存在')
    })

    it('当邮箱已存在时应抛出 ConflictException', async () => {
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce({ id: '1', email: registerDto.email }) // email check

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException)
      await expect(service.register(registerDto)).rejects.toThrow('邮箱已存在')
    })
  })

  describe('validateUser - 用户验证', () => {
    const user = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      role: UserRole.DEVELOPER,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('应该在密码正确时返回用户信息（不包含密码）', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(user)
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true))

      const result = await service.validateUser('testuser', 'password123')

      expect(result).toBeDefined()
      expect(result?.username).toBe(user.username)
      expect(result).not.toHaveProperty('password')
    })

    it('应该在密码错误时返回 null', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(user)
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false))

      const result = await service.validateUser('testuser', 'wrongpassword')

      expect(result).toBeNull()
    })

    it('应该在用户不存在时返回 null', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null)

      const result = await service.validateUser('nonexistent', 'password123')

      expect(result).toBeNull()
    })
  })

  describe('login - 用户登录', () => {
    const loginDto = {
      usernameOrEmail: 'testuser',
      password: 'password123',
    }

    const user = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: UserRole.DEVELOPER,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('应该成功登录并返回令牌', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(user)
      mockJwtService.sign.mockReturnValueOnce('accessToken').mockReturnValueOnce('refreshToken')

      const result = await service.login(loginDto)

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('user')
      expect(result.user.username).toBe(user.username)
    })

    it('应该在凭据无效时抛出 UnauthorizedException', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null)

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
      await expect(service.login(loginDto)).rejects.toThrow('用户名或密码错误')
    })
  })

  describe('refresh - 刷新令牌', () => {
    const refreshDto = {
      refreshToken: 'validRefreshToken',
    }

    it('应该成功刷新访问令牌', async () => {
      const payload = { sub: '1', username: 'testuser' }
      const user = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.DEVELOPER,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockJwtService.verify.mockReturnValue(payload)
      mockPrismaService.user.findUnique.mockResolvedValue(user)
      mockJwtService.sign.mockReturnValue('newAccessToken')

      const result = await service.refresh(refreshDto)

      expect(result).toHaveProperty('accessToken')
      expect(result.accessToken).toBe('newAccessToken')
    })

    it('应该在刷新令牌无效时抛出 UnauthorizedException', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await expect(service.refresh(refreshDto)).rejects.toThrow(UnauthorizedException)
      await expect(service.refresh(refreshDto)).rejects.toThrow('无效的刷新令牌')
    })

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      const payload = { sub: '999', username: 'nonexistent' }
      mockJwtService.verify.mockReturnValue(payload)
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.refresh(refreshDto)).rejects.toThrow(NotFoundException)
      await expect(service.refresh(refreshDto)).rejects.toThrow('用户不存在')
    })
  })

  describe('me - 获取当前用户信息', () => {
    const userId = '1'
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

      const result = await service.me(userId)

      expect(result).toBeDefined()
      expect(result.username).toBe(user.username)
      expect(result).not.toHaveProperty('password')
    })

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.me('999')).rejects.toThrow(NotFoundException)
      await expect(service.me('999')).rejects.toThrow('用户不存在')
    })
  })
})
