import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Version,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  CreateUserDto,
  AdminQueryUsersDto,
  UpdateUserRoleDto,
  ToggleUserActiveDto,
} from './dto';

/**
 * 管理员控制器
 * ECP-A1: 单一职责 - 处理管理员相关的HTTP请求
 * ECP-C2: 系统化错误处理 - 使用守卫和异常过滤器
 */
@Controller('admin')
@Version('1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================
  // 用户管理
  // ============================================

  /**
   * 创建新用户
   * 权限：仅超级管理员
   */
  @Post('users')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  /**
   * 获取所有用户列表
   * 权限：仅超级管理员
   */
  @Get('users')
  @Roles(UserRole.SUPER_ADMIN)
  async getAllUsers(@Query() query: AdminQueryUsersDto) {
    return this.adminService.getAllUsers(query);
  }

  /**
   * 获取用户详情
   * 权限：仅超级管理员
   */
  @Get('users/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  /**
   * 更新用户角色
   * 权限：仅超级管理员
   */
  @Put('users/:id/role')
  @Roles(UserRole.SUPER_ADMIN)
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUserRole(id, dto, adminId);
  }

  /**
   * 切换用户激活状态（封禁/解封）
   * 权限：仅超级管理员
   */
  @Patch('users/:id/active')
  @Roles(UserRole.SUPER_ADMIN)
  async toggleUserActive(
    @Param('id') id: string,
    @Body() dto: ToggleUserActiveDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.toggleUserActive(id, dto, adminId);
  }

  /**
   * 删除用户
   * 权限：仅超级管理员
   */
  @Delete('users/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.deleteUser(id, adminId);
  }

  // ============================================
  // 项目管理
  // ============================================

  /**
   * 获取所有项目列表
   * 权限：仅超级管理员
   */
  @Get('projects')
  @Roles(UserRole.SUPER_ADMIN)
  async getAllProjects(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllProjects(page, pageSize, search);
  }

  /**
   * 删除项目
   * 权限：仅超级管理员
   */
  @Delete('projects/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteProject(@Param('id') id: string) {
    return this.adminService.deleteProject(id);
  }

  // ============================================
  // 系统统计
  // ============================================

  /**
   * 获取系统统计信息
   * 权限：仅超级管理员
   */
  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN)
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }
}
