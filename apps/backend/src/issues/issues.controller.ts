import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
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
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { QueryIssueDto } from './dto/query-issue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectRoleGuard } from '../projects/guards/project-role.guard';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';

@ApiTags('Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller({ path: 'projects/:projectId/issues', version: '1' })
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @RequireProjectRole('MEMBER')
  @ApiOperation({ summary: '创建Issue' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({
    status: 201,
    description: 'Issue创建成功',
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足（需要MEMBER或更高权限）' })
  create(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() createIssueDto: CreateIssueDto,
  ) {
    return this.issuesService.create(projectId, userId, createIssueDto);
  }

  @Get()
  @RequireProjectRole('VIEWER')
  @ApiOperation({ summary: '获取Issue列表' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({
    status: 200,
    description: '返回Issue列表（分页）',
  })
  @ApiResponse({ status: 403, description: '权限不足（需要VIEWER或更高权限）' })
  findAll(
    @Param('projectId') projectId: string,
    @Query() query: QueryIssueDto,
  ) {
    return this.issuesService.findAll(projectId, query);
  }

  @Get(':number')
  @RequireProjectRole('VIEWER')
  @ApiOperation({ summary: '获取单个Issue' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'Issue编号' })
  @ApiResponse({
    status: 200,
    description: '返回Issue详情',
  })
  @ApiResponse({ status: 404, description: 'Issue不存在' })
  @ApiResponse({ status: 403, description: '权限不足（需要VIEWER或更高权限）' })
  findOne(
    @Param('projectId') projectId: string,
    @Param('number', ParseIntPipe) number: number,
  ) {
    return this.issuesService.findOne(projectId, number);
  }

  @Patch(':number')
  @RequireProjectRole('MEMBER')
  @ApiOperation({ summary: '更新Issue' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'Issue编号' })
  @ApiResponse({
    status: 200,
    description: 'Issue更新成功',
  })
  @ApiResponse({ status: 404, description: 'Issue不存在' })
  @ApiResponse({ status: 403, description: '权限不足（需要MEMBER或更高权限）' })
  update(
    @Param('projectId') projectId: string,
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser('id') userId: string,
    @Body() updateIssueDto: UpdateIssueDto,
  ) {
    return this.issuesService.update(projectId, number, userId, updateIssueDto);
  }

  @Post(':number/close')
  @RequireProjectRole('MEMBER')
  @ApiOperation({ summary: '关闭Issue' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'Issue编号' })
  @ApiResponse({
    status: 200,
    description: 'Issue已关闭',
  })
  @ApiResponse({ status: 404, description: 'Issue不存在' })
  @ApiResponse({ status: 403, description: '权限不足（需要MEMBER或更高权限）' })
  close(
    @Param('projectId') projectId: string,
    @Param('number', ParseIntPipe) number: number,
  ) {
    return this.issuesService.close(projectId, number);
  }

  @Post(':number/reopen')
  @RequireProjectRole('MEMBER')
  @ApiOperation({ summary: '重新打开Issue' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'Issue编号' })
  @ApiResponse({
    status: 200,
    description: 'Issue已重新打开',
  })
  @ApiResponse({ status: 404, description: 'Issue不存在' })
  @ApiResponse({ status: 403, description: '权限不足（需要MEMBER或更高权限）' })
  reopen(
    @Param('projectId') projectId: string,
    @Param('number', ParseIntPipe) number: number,
  ) {
    return this.issuesService.reopen(projectId, number);
  }

  @Delete(':number')
  @RequireProjectRole('MAINTAINER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除Issue' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'Issue编号' })
  @ApiResponse({
    status: 204,
    description: 'Issue已删除',
  })
  @ApiResponse({ status: 404, description: 'Issue不存在' })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要MAINTAINER或更高权限）',
  })
  async remove(
    @Param('projectId') projectId: string,
    @Param('number', ParseIntPipe) number: number,
  ): Promise<void> {
    await this.issuesService.remove(projectId, number);
  }
}
