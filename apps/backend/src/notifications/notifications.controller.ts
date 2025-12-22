import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
  UpdateNotificationPreferenceDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

/**
 * 通知控制器
 *
 * 提供通知管理的RESTful API
 *
 * ECP-A1: SOLID原则 - 控制器仅负责HTTP请求处理
 * ECP-C2: 系统性错误处理 - 所有异常由NestJS全局过滤器处理
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
@Version('1')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 获取当前用户的通知列表
   *
   * 支持按已读状态过滤和分页
   */
  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  @ApiQuery({
    name: 'read',
    required: false,
    description: '按已读状态过滤（true/false）',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码（默认1）' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: '每页条数（默认20，最多100）',
  })
  @ApiResponse({ status: 200, description: '通知列表获取成功' })
  findAll(@CurrentUser() user: User, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.findAll(user.id, query);
  }

  /**
   * 获取单条通知详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取通知详情' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '通知详情获取成功' })
  @ApiResponse({ status: 404, description: '通知不存在' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.findOne(id, user.id);
  }

  /**
   * 标记单条通知为已读
   */
  @Patch(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '标记成功' })
  @ApiResponse({ status: 404, description: '通知不存在' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  /**
   * 批量标记通知为已读
   *
   * Body: { notificationIds?: string[] }
   * - 如果传入notificationIds数组，标记指定通知
   * - 如果不传，标记当前用户的所有未读通知
   */
  @Post('read-all')
  @ApiOperation({ summary: '批量标记通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  markAllAsRead(
    @CurrentUser() user: User,
    @Body() body: { notificationIds?: string[] },
  ) {
    return this.notificationsService.markAllAsRead(
      user.id,
      body.notificationIds,
    );
  }

  /**
   * 删除通知
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '通知不存在' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.remove(id, user.id);
  }

  /**
   * 获取当前用户的通知偏好设置
   */
  @Get('preferences/me')
  @ApiOperation({ summary: '获取通知偏好设置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getPreference(@CurrentUser() user: User) {
    return this.notificationsService.getPreference(user.id);
  }

  /**
   * 更新当前用户的通知偏好设置
   */
  @Patch('preferences/me')
  @ApiOperation({ summary: '更新通知偏好设置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  updatePreference(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(user.id, updateDto);
  }

  /**
   * 创建通知（内部API，暂不对外暴露）
   *
   * 此端点主要用于系统内部调用（如PR、Issue事件触发通知）
   * 未来可考虑添加管理员权限或内部服务认证
   */
  @Post()
  @ApiOperation({
    summary: '创建通知（内部API）',
    description: '此接口主要用于系统内部调用，未来将添加权限限制',
  })
  @ApiResponse({ status: 201, description: '通知创建成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  create(@Body() createDto: CreateNotificationDto) {
    return this.notificationsService.create(createDto);
  }
}
