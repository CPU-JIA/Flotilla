import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Version,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, AuditAction, AuditEntityType } from '@prisma/client';
import type { User } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse as ApiResponseDoc,
} from '@nestjs/swagger';

/**
 * 审计日志控制器
 *
 * Phase 4: 安全审计日志 API
 *
 * 权限要求：仅 SUPER_ADMIN 可访问审计日志
 */
@ApiTags('审计日志')
@Controller('audit')
@Version('1')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * 查询当前用户的审计日志
   */
  @Get('my-logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询当前用户的审计日志' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '返回数量限制（默认 100）',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '偏移量（默认 0）',
  })
  @ApiResponseDoc({ status: 200, description: '返回当前用户的审计日志列表' })
  async getMyLogs(
    @CurrentUser() user: User,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    return this.auditService.getUserLogs(
      user.id,
      Number(limit),
      Number(offset),
    );
  }

  /**
   * 查询指定用户的审计日志（仅管理员）
   */
  @Get('user-logs')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询指定用户的审计日志（仅管理员）' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponseDoc({ status: 200, description: '返回指定用户的审计日志列表' })
  async getUserLogs(
    @Query('userId') userId: string,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    return this.auditService.getUserLogs(userId, Number(limit), Number(offset));
  }

  /**
   * 查询实体审计日志（仅管理员）
   */
  @Get('entity-logs')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询实体审计日志（仅管理员）' })
  @ApiQuery({ name: 'entityType', required: true, enum: AuditEntityType })
  @ApiQuery({ name: 'entityId', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponseDoc({ status: 200, description: '返回实体的审计日志列表' })
  async getEntityLogs(
    @Query('entityType') entityType: AuditEntityType,
    @Query('entityId') entityId: string,
    @Query('limit') limit = 100,
  ) {
    return this.auditService.getEntityLogs(entityType, entityId, Number(limit));
  }

  /**
   * 查询失败操作日志（仅管理员）
   */
  @Get('failed-logs')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询失败操作日志（仅管理员）' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponseDoc({ status: 200, description: '返回失败操作日志列表' })
  async getFailedLogs(
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    return this.auditService.getFailedLogs(Number(limit), Number(offset));
  }

  /**
   * 统计用户操作次数（仅管理员）
   */
  @Get('user-stats')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '统计用户操作次数（仅管理员）' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'ISO 8601 日期',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'ISO 8601 日期',
  })
  @ApiResponseDoc({ status: 200, description: '返回操作统计数据' })
  async getUserStats(
    @Query('userId') userId: string,
    @Query('action') action?: AuditAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const count = await this.auditService.getUserActionCount(
      userId,
      action,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      userId,
      action: action || 'all',
      startDate,
      endDate,
      count,
    };
  }

  /**
   * 导出审计日志（CSV 格式，仅管理员）
   */
  @Get('export')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '导出审计日志（CSV 格式，仅管理员）' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'ISO 8601 日期',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'ISO 8601 日期',
  })
  @ApiResponseDoc({ status: 200, description: '返回 CSV 格式的审计日志' })
  async exportLogs(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const csv = await this.auditService.exportLogs(
      new Date(startDate),
      new Date(endDate),
    );

    // 设置 CSV 下载响应
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${startDate}-${endDate}.csv"`,
    );
    res.send(csv);
  }
}
