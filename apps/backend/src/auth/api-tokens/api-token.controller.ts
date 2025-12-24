import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ApiTokenService } from './api-token.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import {
  ApiTokenListDto,
  CreateApiTokenResponseDto,
} from './dto/api-token-response.dto';

/**
 * API Token 控制器
 * ECP-A1: SOLID原则 - 单一职责,只处理API Token相关操作
 * ECP-C1: 防御性编程 - 使用JWT守卫保护所有端点
 */
@ApiTags('API Tokens')
@Controller('api-tokens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiTokenController {
  constructor(private apiTokenService: ApiTokenService) {}

  @Post()
  @ApiOperation({ summary: '创建API Token' })
  @ApiResponse({
    status: 201,
    description: '令牌创建成功（完整令牌只显示一次）',
    type: CreateApiTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async createToken(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateApiTokenDto,
  ): Promise<CreateApiTokenResponseDto> {
    return this.apiTokenService.createToken(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '列出当前用户的所有API Token' })
  @ApiResponse({
    status: 200,
    description: '令牌列表（不包含完整令牌值）',
    type: [ApiTokenListDto],
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async listTokens(
    @CurrentUser() user: { id: string },
  ): Promise<ApiTokenListDto[]> {
    return this.apiTokenService.listTokens(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '撤销（删除）API Token' })
  @ApiResponse({ status: 200, description: '令牌已撤销' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '令牌不存在' })
  async revokeToken(
    @CurrentUser() user: { id: string },
    @Param('id') tokenId: string,
  ): Promise<{ message: string }> {
    await this.apiTokenService.revokeToken(user.id, tokenId);
    return { message: '令牌已撤销' };
  }
}
