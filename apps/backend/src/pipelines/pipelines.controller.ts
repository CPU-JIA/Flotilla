import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { TriggerPipelineDto } from './dto/trigger-pipeline.dto';
import { UpdatePipelineStatusDto } from './dto/update-pipeline-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionService } from '../common/services/permission.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';

/**
 * Pipelines Controller
 * ECP-A1: SOLID - 控制器只负责请求处理和路由
 * ECP-C1: Defensive Programming - 参数验证由 DTOs 和 Guards 处理
 */
@ApiTags('pipelines')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PipelinesController {
  constructor(
    private readonly pipelinesService: PipelinesService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * 创建流水线配置
   */
  @Post('projects/:projectId/pipelines')
  @ApiOperation({ summary: '创建流水线配置' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '项目不存在' })
  async createPipeline(
    @Param('projectId') projectId: string,
    @Body() createPipelineDto: CreatePipelineDto,
    @CurrentUser() user: User,
  ) {
    // 权限检查：需要 MAINTAINER 或以上权限
    await this.permissionService.checkProjectPermission(
      user,
      projectId,
      'MAINTAINER',
    );

    return this.pipelinesService.createPipeline(projectId, createPipelineDto);
  }

  /**
   * 获取项目的所有流水线
   */
  @Get('projects/:projectId/pipelines')
  @ApiOperation({ summary: '获取项目的所有流水线' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    example: 20,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getPipelines(
    @Param('projectId') projectId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUser() user: User,
  ) {
    // 权限检查：需要项目访问权限
    await this.permissionService.checkProjectPermission(
      user,
      projectId,
      'VIEWER',
    );

    return this.pipelinesService.getPipelines(
      projectId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * 获取单个流水线详情
   */
  @Get('pipelines/:pipelineId')
  @ApiOperation({ summary: '获取流水线详情' })
  @ApiParam({ name: 'pipelineId', description: '流水线ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '流水线不存在' })
  async getPipeline(
    @Param('pipelineId') pipelineId: string,
    @CurrentUser() user: User,
  ) {
    const pipeline = await this.pipelinesService.getPipeline(pipelineId);

    // 权限检查
    await this.permissionService.checkProjectPermission(
      user,
      pipeline.projectId,
      'VIEWER',
    );

    return pipeline;
  }

  /**
   * 更新流水线配置
   */
  @Put('pipelines/:pipelineId')
  @ApiOperation({ summary: '更新流水线配置' })
  @ApiParam({ name: 'pipelineId', description: '流水线ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '流水线不存在' })
  async updatePipeline(
    @Param('pipelineId') pipelineId: string,
    @Body() updatePipelineDto: UpdatePipelineDto,
    @CurrentUser() user: User,
  ) {
    const pipeline = await this.pipelinesService.getPipeline(pipelineId);

    // 权限检查：需要 MAINTAINER 或以上权限
    await this.permissionService.checkProjectPermission(
      user,
      pipeline.projectId,
      'MAINTAINER',
    );

    return this.pipelinesService.updatePipeline(pipelineId, updatePipelineDto);
  }

  /**
   * 删除流水线
   */
  @Delete('pipelines/:pipelineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除流水线' })
  @ApiParam({ name: 'pipelineId', description: '流水线ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '流水线不存在' })
  async deletePipeline(
    @Param('pipelineId') pipelineId: string,
    @CurrentUser() user: User,
  ) {
    const pipeline = await this.pipelinesService.getPipeline(pipelineId);

    // 权限检查：需要 MAINTAINER 或以上权限
    await this.permissionService.checkProjectPermission(
      user,
      pipeline.projectId,
      'MAINTAINER',
    );

    await this.pipelinesService.deletePipeline(pipelineId);
  }

  /**
   * 手动触发流水线
   */
  @Post('pipelines/:pipelineId/trigger')
  @ApiOperation({ summary: '手动触发流水线' })
  @ApiParam({ name: 'pipelineId', description: '流水线ID' })
  @ApiResponse({ status: 201, description: '触发成功' })
  @ApiResponse({ status: 400, description: '参数错误或流水线未激活' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '流水线不存在' })
  async triggerPipeline(
    @Param('pipelineId') pipelineId: string,
    @Body() triggerPipelineDto: TriggerPipelineDto,
    @CurrentUser() user: User,
  ) {
    const pipeline = await this.pipelinesService.getPipeline(pipelineId);

    // 权限检查：需要 MEMBER 或以上权限
    await this.permissionService.checkProjectPermission(
      user,
      pipeline.projectId,
      'MEMBER',
    );

    return this.pipelinesService.triggerPipeline(
      pipelineId,
      triggerPipelineDto,
    );
  }

  /**
   * 获取流水线运行历史
   */
  @Get('pipelines/:pipelineId/runs')
  @ApiOperation({ summary: '获取流水线运行历史' })
  @ApiParam({ name: 'pipelineId', description: '流水线ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    example: 20,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '流水线不存在' })
  async getPipelineRuns(
    @Param('pipelineId') pipelineId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUser() user: User,
  ) {
    const pipeline = await this.pipelinesService.getPipeline(pipelineId);

    // 权限检查
    await this.permissionService.checkProjectPermission(
      user,
      pipeline.projectId,
      'VIEWER',
    );

    return this.pipelinesService.getPipelineRuns(
      pipelineId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * 获取单个运行记录
   */
  @Get('pipeline-runs/:runId')
  @ApiOperation({ summary: '获取流水线运行详情' })
  @ApiParam({ name: 'runId', description: '运行记录ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '运行记录不存在' })
  async getPipelineRun(
    @Param('runId') runId: string,
    @CurrentUser() user: User,
  ) {
    const run = await this.pipelinesService.getPipelineRun(runId);

    // 权限检查
    await this.permissionService.checkProjectPermission(
      user,
      run.pipeline.projectId,
      'VIEWER',
    );

    return run;
  }

  /**
   * 外部CI系统回调接口
   * 更新流水线运行状态
   * ECP-C1: 使用Webhook签名验证保护回调端点
   */
  @Post('pipeline-runs/:runId/status')
  @UseGuards(WebhookSignatureGuard)
  @ApiOperation({
    summary: '更新流水线运行状态（外部CI回调）',
    description:
      '由外部CI系统回调更新状态。需要X-Webhook-Signature头进行HMAC-SHA256签名验证。',
  })
  @ApiParam({ name: 'runId', description: '运行记录ID' })
  @ApiBody({ type: UpdatePipelineStatusDto })
  @ApiHeader({
    name: 'X-Webhook-Signature',
    description: 'HMAC-SHA256签名 (格式: sha256=<hex>)',
    required: true,
  })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '状态转换非法' })
  @ApiResponse({ status: 401, description: '签名验证失败' })
  @ApiResponse({ status: 404, description: '运行记录不存在' })
  async updatePipelineStatus(
    @Param('runId') runId: string,
    @Body() updateStatusDto: UpdatePipelineStatusDto,
  ) {
    return this.pipelinesService.updatePipelineStatus(runId, updateStatusDto);
  }

  /**
   * 获取项目的所有流水线运行记录
   */
  @Get('projects/:projectId/pipeline-runs')
  @ApiOperation({ summary: '获取项目的所有流水线运行记录' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    example: 20,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getProjectPipelineRuns(
    @Param('projectId') projectId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUser() user: User,
  ) {
    // 权限检查
    await this.permissionService.checkProjectPermission(
      user,
      projectId,
      'VIEWER',
    );

    return this.pipelinesService.getProjectPipelineRuns(
      projectId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
