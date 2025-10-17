import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateUserDto, ChangePasswordDto, QueryUsersDto } from './dto'
import type { User } from '@prisma/client'
import { UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'

export interface UserListResponse {
  users: Omit<User, 'passwordHash'>[]
  total: number
  page: number
  pageSize: number
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户列表（分页、搜索、过滤）
   * ECP-C1: 验证查询参数
   * ECP-A2: 通过分页控制数据量，低耦合设计
   */
  async findAll(query: QueryUsersDto): Promise<UserListResponse> {
    const { search, role, page = 1, pageSize = 10 } = query
    const skip = (page - 1) * pageSize

    const where: any = {}

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role) {
      where.role = role
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          bio: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ])

    this.logger.log(`📋 Retrieved ${users.length} users (total: ${total})`)

    return {
      users: users as Omit<User, 'passwordHash'>[],
      total,
      page,
      pageSize,
    }
  }

  /**
   * 根据ID获取用户信息
   * ECP-C2: 系统性错误处理
   */
  async findOne(id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    return user as Omit<User, 'passwordHash'>
  }

  /**
   * 更新用户信息
   * ECP-C1: 防御性编程 - 检查权限
   * ECP-A1: SOLID原则 - 单一职责
   */
  async update(
    id: string,
    updateDto: UpdateUserDto,
    currentUser: User,
  ): Promise<Omit<User, 'passwordHash'>> {
    // 权限检查：只有超级管理员或用户本人可以修改
    if (
      currentUser.id !== id &&
      currentUser.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('您没有权限修改此用户信息')
    }

    // 非超级管理员不能修改角色
    if (updateDto.role && currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('只有超级管理员可以修改用户角色')
    }

    // 检查用户是否存在
    const existingUser = await this.prisma.user.findUnique({ where: { id } })
    if (!existingUser) {
      throw new NotFoundException('用户不存在')
    }

    // 检查用户名唯一性
    if (updateDto.username && updateDto.username !== existingUser.username) {
      const usernameExists = await this.prisma.user.findUnique({
        where: { username: updateDto.username },
      })
      if (usernameExists) {
        throw new ConflictException('用户名已被使用')
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateDto,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    this.logger.log(`✏️ User ${id} updated by ${currentUser.username}`)

    return updatedUser as Omit<User, 'passwordHash'>
  }

  /**
   * 修改密码
   * ECP-C3: 性能意识 - 使用bcrypt进行安全哈希
   */
  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
    currentUser: User,
  ): Promise<{ message: string }> {
    // 只能修改自己的密码
    if (currentUser.id !== id) {
      throw new ForbiddenException('您只能修改自己的密码')
    }

    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    )

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('当前密码不正确')
    }

    // 新密码不能与旧密码相同
    const isSamePassword = await bcrypt.compare(changePasswordDto.newPassword, user.passwordHash)
    if (isSamePassword) {
      throw new BadRequestException('新密码不能与当前密码相同')
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 12)

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    })

    this.logger.log(`🔒 Password changed for user ${id}`)

    return { message: '密码修改成功' }
  }

  /**
   * 删除用户（仅超级管理员）
   * ECP-A1: 单一职责原则
   */
  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    // 只有超级管理员可以删除用户
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('只有超级管理员可以删除用户')
    }

    // 不能删除自己
    if (currentUser.id === id) {
      throw new BadRequestException('不能删除自己的账号')
    }

    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    await this.prisma.user.delete({ where: { id } })

    this.logger.warn(`🗑️ User ${id} deleted by admin ${currentUser.username}`)

    return { message: '用户已删除' }
  }
}
