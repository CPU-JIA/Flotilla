import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

/**
 * Newsletter Controller
 * ECP-A1: SOLID - 控制器只负责请求处理和路由
 *
 * 公开端点（无需认证）:
 * - POST /newsletter/subscribe - 订阅Newsletter
 * - GET /newsletter/confirm - 确认订阅
 * - POST /newsletter/unsubscribe - 取消订阅
 */
@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '订阅Newsletter',
    description: '提交邮箱订阅Flotilla更新通知，将收到确认邮件',
  })
  @ApiResponse({ status: 201, description: '订阅成功' })
  @ApiResponse({ status: 400, description: '邮箱格式错误' })
  @ApiResponse({ status: 409, description: '邮箱已订阅' })
  async subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto.email);
  }

  @Get('confirm')
  @ApiOperation({
    summary: '确认Newsletter订阅',
    description: '通过邮件中的token确认订阅',
  })
  @ApiQuery({ name: 'token', description: '确认token' })
  @ApiResponse({ status: 200, description: '确认成功' })
  @ApiResponse({ status: 409, description: 'Token无效' })
  async confirm(@Query('token') token: string) {
    return this.newsletterService.confirmSubscription(token);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '取消订阅Newsletter',
    description: '使用邮箱地址取消订阅',
  })
  @ApiResponse({ status: 200, description: '取消订阅成功' })
  @ApiResponse({ status: 409, description: '邮箱未找到' })
  async unsubscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.unsubscribe(dto.email);
  }

  @Get('stats')
  @ApiOperation({
    summary: '获取订阅统计',
    description: '返回订阅总数、已确认数、待确认数',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStats() {
    return this.newsletterService.getStats();
  }
}
