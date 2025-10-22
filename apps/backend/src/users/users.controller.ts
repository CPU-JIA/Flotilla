import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService, UserListResponse } from './users.service';
import { UpdateUserDto, ChangePasswordDto, QueryUsersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { User } from '@prisma/client';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * 获取当前登录用户信息
   */
  @Get('profile/me')
  async getCurrentUser(
    @CurrentUser() currentUser: User,
  ): Promise<Omit<User, 'passwordHash'>> {
    this.logger.log(
      `👤 Fetching current user profile: ${currentUser.username}`,
    );
    return this.usersService.findOne(currentUser.id);
  }

  /**
   * 更新当前用户资料
   */
  @Put('profile/me')
  async updateProfile(
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<Omit<User, 'passwordHash'>> {
    this.logger.log(`✏️ Updating profile for ${currentUser.username}`);
    return this.usersService.update(currentUser.id, updateDto, currentUser);
  }

  /**
   * 修改当前用户密码
   */
  @Put('profile/password')
  @HttpCode(HttpStatus.OK)
  async changeMyPassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    this.logger.log(`🔒 Changing password for ${currentUser.username}`);
    return this.usersService.changePassword(
      currentUser.id,
      changePasswordDto,
      currentUser,
    );
  }

  /**
   * 上传头像
   * ECP-C1: 防御性编程 - 文件类型和大小验证
   */
  @Put('profile/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: User,
  ): Promise<{ avatarUrl: string }> {
    if (!file) {
      throw new BadRequestException('No avatar file uploaded');
    }

    // 验证文件类型
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed',
      );
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    this.logger.log(
      `📷 Uploading avatar for ${currentUser.username}: ${file.originalname} (${file.size} bytes)`,
    );

    return this.usersService.uploadAvatar(currentUser.id, file);
  }

  /**
   * 获取用户列表（仅超级管理员）
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async findAll(@Query() query: QueryUsersDto): Promise<UserListResponse> {
    this.logger.log(`👥 Fetching users with query: ${JSON.stringify(query)}`);
    return this.usersService.findAll(query);
  }

  /**
   * 获取指定用户信息
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Omit<User, 'passwordHash'>> {
    this.logger.log(`👤 Fetching user: ${id}`);
    return this.usersService.findOne(id);
  }

  /**
   * 更新用户信息
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<Omit<User, 'passwordHash'>> {
    this.logger.log(`✏️ Updating user ${id} by ${currentUser.username}`);
    return this.usersService.update(id, updateDto, currentUser);
  }

  /**
   * 修改密码
   */
  @Put(':id/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    this.logger.log(`🔒 Changing password for user ${id}`);
    return this.usersService.changePassword(id, changePasswordDto, currentUser);
  }

  /**
   * 删除用户（仅超级管理员）
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    this.logger.warn(
      `🗑️ Deleting user ${id} by super admin ${currentUser.username}`,
    );
    return this.usersService.remove(id, currentUser);
  }
}
