import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GdprService } from './gdpr.service';
import { CreateExportRequestDto } from './dto/create-export-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * GDPR 数据导出控制器
 * ECP-A1: SOLID 原则 - 控制器只负责路由和请求处理
 * ECP-C2: 错误处理 - 统一的异常处理机制
 */
@ApiTags('GDPR')
@Controller('gdpr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  /**
   * 请求数据导出
   * POST /gdpr/export
   */
  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request user data export (GDPR compliance)' })
  @ApiResponse({
    status: 202,
    description:
      'Export request created successfully. Processing will start immediately.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or pending export exists',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestExport(
    @CurrentUser() user: any,
    @Body() dto: CreateExportRequestDto,
  ) {
    const exportRequest = await this.gdprService.requestExport(user.id, dto);

    return {
      id: exportRequest.id,
      format: exportRequest.format,
      status: exportRequest.status,
      createdAt: exportRequest.createdAt,
      message:
        'Export request created. You will receive an email when it is ready.',
    };
  }

  /**
   * 查询导出状态
   * GET /gdpr/export/:id/status
   */
  @Get('export/:id/status')
  @ApiOperation({ summary: 'Get export request status' })
  @ApiResponse({
    status: 200,
    description: 'Export status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Export request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getExportStatus(
    @CurrentUser() user: any,
    @Param('id') exportId: string,
  ) {
    return this.gdprService.getExportStatus(exportId, user.id);
  }

  /**
   * 获取用户的所有导出请求
   * GET /gdpr/exports
   */
  @Get('exports')
  @ApiOperation({ summary: 'Get user export history' })
  @ApiResponse({
    status: 200,
    description: 'Export history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserExports(@CurrentUser() user: any) {
    return this.gdprService.getUserExports(user.id);
  }

  /**
   * 下载导出文件
   * GET /gdpr/export/:id/download
   */
  @Get('export/:id/download')
  @ApiOperation({ summary: 'Get download URL for completed export' })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Export request not found' })
  @ApiResponse({ status: 400, description: 'Export not ready or expired' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async downloadExport(
    @CurrentUser() user: any,
    @Param('id') exportId: string,
  ) {
    return this.gdprService.downloadExport(exportId, user.id);
  }
}
