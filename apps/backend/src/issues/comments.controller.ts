/**
 * Issue Comments Controller
 *
 * REST API endpoints for issue comments CRUD operations
 *
 * ECP-A1: Single Responsibility - Only handles HTTP request/response for comments
 * ECP-C1: Defensive Programming - Permission guards on all endpoints
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectRoleGuard } from '../projects/guards/project-role.guard';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';

@ApiTags('Issue Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/issues/:number/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @RequireProjectRole('VIEWER')
  @ApiOperation({ summary: '获取Issue的所有评论' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'Issue编号' })
  @ApiResponse({
    status: 200,
    description: '返回评论列表（按创建时间升序）',
  })
  @ApiResponse({ status: 403, description: '权限不足（需要VIEWER或更高权限）' })
  async findAll(
    @Param('projectId') projectId: string,
    @Param('number', ParseIntPipe) issueNumber: number,
  ) {
    // First, get the issue by project and number to get the issueId
    const issue = await this.commentsService['prisma'].issue.findUnique({
      where: {
        projectId_number: {
          projectId,
          number: issueNumber,
        },
      },
    });

    if (!issue) {
      throw new Error(`Issue #${issueNumber} not found in project ${projectId}`);
    }

    return this.commentsService.findAll(issue.id);
  }

  @Post()
  @RequireProjectRole('MEMBER')
  @ApiOperation({ summary: '添加评论' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'Issue编号' })
  @ApiResponse({
    status: 201,
    description: '评论创建成功',
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足（需要MEMBER或更高权限）' })
  @ApiResponse({ status: 404, description: 'Issue不存在' })
  async create(
    @Param('projectId') projectId: string,
    @Param('number', ParseIntPipe) issueNumber: number,
    @CurrentUser('id') userId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    // Get issue by project and number
    const issue = await this.commentsService['prisma'].issue.findUnique({
      where: {
        projectId_number: {
          projectId,
          number: issueNumber,
        },
      },
    });

    if (!issue) {
      throw new Error(`Issue #${issueNumber} not found in project ${projectId}`);
    }

    return this.commentsService.create(issue.id, userId, createCommentDto);
  }

  @Patch(':commentId')
  @RequireProjectRole('MEMBER')
  @ApiOperation({ summary: '更新评论（仅作者）' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'Issue编号' })
  @ApiParam({ name: 'commentId', description: '评论ID' })
  @ApiResponse({
    status: 200,
    description: '评论更新成功',
  })
  @ApiResponse({ status: 403, description: '权限不足（只能更新自己的评论）' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  update(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, userId, updateCommentDto);
  }

  @Delete(':commentId')
  @RequireProjectRole('MEMBER')
  @ApiOperation({ summary: '删除评论（仅作者）' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'Issue编号' })
  @ApiParam({ name: 'commentId', description: '评论ID' })
  @ApiResponse({
    status: 204,
    description: '评论已删除',
  })
  @ApiResponse({ status: 403, description: '权限不足（只能删除自己的评论）' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  async remove(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.commentsService.remove(commentId, userId);
    return { message: 'Comment deleted successfully' };
  }
}
