import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BranchProtectionService } from './branch-protection.service';
import { CreateBranchProtectionDto, UpdateBranchProtectionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * 分支保护规则Controller
 *
 * 提供分支保护规则的REST API接口
 *
 * API路径：
 * - POST   /api/projects/:projectId/branch-protection
 * - GET    /api/projects/:projectId/branch-protection
 * - GET    /api/branch-protection/:id
 * - PATCH  /api/branch-protection/:id
 * - DELETE /api/branch-protection/:id
 */
@ApiTags('Branch Protection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BranchProtectionController {
  constructor(
    private readonly branchProtectionService: BranchProtectionService,
  ) {}

  @Post('projects/:projectId/branch-protection')
  @ApiOperation({ summary: '创建分支保护规则' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({
    status: 201,
    description: '分支保护规则创建成功',
  })
  @ApiResponse({ status: 409, description: '该分支已有保护规则' })
  create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateBranchProtectionDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.branchProtectionService.create(projectId, createDto);
  }

  @Get('projects/:projectId/branch-protection')
  @Public() // Allow unauthenticated access for pre-receive hooks
  @ApiOperation({ summary: '获取项目的所有分支保护规则' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({
    status: 200,
    description: '成功返回分支保护规则列表',
  })
  findAll(@Param('projectId') projectId: string) {
    return this.branchProtectionService.findAll(projectId);
  }

  @Get('branch-protection/:id')
  @ApiOperation({ summary: '根据ID获取分支保护规则' })
  @ApiParam({ name: 'id', description: '保护规则ID' })
  @ApiResponse({
    status: 200,
    description: '成功返回分支保护规则',
  })
  @ApiResponse({ status: 404, description: '分支保护规则不存在' })
  findOne(@Param('id') id: string) {
    return this.branchProtectionService.findOne(id);
  }

  @Patch('branch-protection/:id')
  @ApiOperation({ summary: '更新分支保护规则' })
  @ApiParam({ name: 'id', description: '保护规则ID' })
  @ApiResponse({
    status: 200,
    description: '分支保护规则更新成功',
  })
  @ApiResponse({ status: 404, description: '分支保护规则不存在' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBranchProtectionDto,
  ) {
    return this.branchProtectionService.update(id, updateDto);
  }

  @Delete('branch-protection/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除分支保护规则' })
  @ApiParam({ name: 'id', description: '保护规则ID' })
  @ApiResponse({
    status: 200,
    description: '分支保护规则删除成功',
  })
  @ApiResponse({ status: 404, description: '分支保护规则不存在' })
  remove(@Param('id') id: string) {
    return this.branchProtectionService.remove(id);
  }
}
