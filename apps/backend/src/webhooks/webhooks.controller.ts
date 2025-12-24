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
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebhookService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

/**
 * Webhook Controller
 * ECP-A1: SOLID - REST API 控制器，处理 HTTP 请求
 * ECP-C1: Defensive Programming - 使用 Guards 保护端点
 */
@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * 创建 Webhook
   */
  @Post()
  @ApiOperation({ summary: '创建 Webhook' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  async createWebhook(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.createWebhook(projectId, dto);
  }

  /**
   * 列出项目的所有 Webhooks
   */
  @Get()
  @ApiOperation({ summary: '列出项目的所有 Webhooks' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  async listWebhooks(@Param('projectId') projectId: string) {
    return this.webhookService.listWebhooks(projectId);
  }

  /**
   * 获取单个 Webhook
   */
  @Get(':webhookId')
  @ApiOperation({ summary: '获取 Webhook 详情' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  async getWebhook(@Param('webhookId') webhookId: string) {
    return this.webhookService.getWebhook(webhookId);
  }

  /**
   * 更新 Webhook
   */
  @Put(':webhookId')
  @ApiOperation({ summary: '更新 Webhook' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  async updateWebhook(
    @Param('webhookId') webhookId: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.updateWebhook(webhookId, dto);
  }

  /**
   * 删除 Webhook
   */
  @Delete(':webhookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除 Webhook' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  async deleteWebhook(@Param('webhookId') webhookId: string) {
    await this.webhookService.deleteWebhook(webhookId);
  }

  /**
   * 查询 Webhook 投递历史
   */
  @Get(':webhookId/deliveries')
  @ApiOperation({ summary: '查询 Webhook 投递历史' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '返回数量限制',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: '偏移量',
  })
  async listDeliveries(
    @Param('webhookId') webhookId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.webhookService.listDeliveries(webhookId, limitNum, offsetNum);
  }

  /**
   * 重试失败的投递
   */
  @Post(':webhookId/deliveries/:deliveryId/retry')
  @ApiOperation({ summary: '重试失败的投递' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiParam({ name: 'deliveryId', description: '投递记录 ID' })
  async retryDelivery(@Param('deliveryId') deliveryId: string) {
    return this.webhookService.retryDelivery(deliveryId);
  }
}
