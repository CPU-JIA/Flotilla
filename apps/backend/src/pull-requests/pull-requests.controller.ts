import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PullRequestsService } from './pull-requests.service';
import { CreatePullRequestDto } from './dto/create-pull-request.dto';
import { UpdatePullRequestDto } from './dto/update-pull-request.dto';
import { MergePullRequestDto } from './dto/merge-pull-request.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { PullRequestCreateCommentDto } from './dto/create-comment.dto';
import { MergeStatusResponseDto } from './dto/merge-status-response.dto';
import { ReviewSummaryResponseDto } from './dto/review-summary-response.dto';
import { DiffResponseDto } from './dto/diff-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PRState } from '@prisma/client';
import { GitService } from '../git/git.service';

@ApiTags('Pull Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pull-requests')
export class PullRequestsController {
  constructor(
    private readonly pullRequestsService: PullRequestsService,
    private readonly gitService: GitService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建Pull Request' })
  @ApiResponse({
    status: 201,
    description: 'PR创建成功',
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '项目不存在' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createPullRequestDto: CreatePullRequestDto,
  ) {
    return this.pullRequestsService.create(userId, createPullRequestDto);
  }

  @Get()
  @ApiOperation({ summary: '获取PR列表' })
  @ApiQuery({ name: 'projectId', description: '项目ID', required: true })
  @ApiQuery({
    name: 'state',
    description: 'PR状态过滤',
    required: false,
    enum: PRState,
  })
  @ApiResponse({
    status: 200,
    description: '返回PR列表',
  })
  findAll(
    @Query('projectId') projectId: string,
    @Query('state') state?: PRState,
  ) {
    return this.pullRequestsService.findAll(projectId, state);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取PR详情' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 200,
    description: '返回PR详情',
  })
  @ApiResponse({ status: 404, description: 'PR不存在' })
  findOne(@Param('id') id: string) {
    return this.pullRequestsService.findOne(id);
  }

  @Get('project/:projectId/number/:number')
  @ApiOperation({ summary: '根据项目ID和PR编号获取PR' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'number', description: 'PR编号' })
  @ApiResponse({
    status: 200,
    description: '返回PR详情',
  })
  @ApiResponse({ status: 404, description: 'PR不存在' })
  findByNumber(
    @Param('projectId') projectId: string,
    @Param('number', ParseIntPipe) number: number,
  ) {
    return this.pullRequestsService.findByNumber(projectId, number);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新PR（仅作者可操作）' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 200,
    description: 'PR更新成功',
  })
  @ApiResponse({ status: 400, description: '请求参数错误或PR已关闭/合并' })
  @ApiResponse({ status: 403, description: '权限不足（仅作者可更新）' })
  @ApiResponse({ status: 404, description: 'PR不存在' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updatePullRequestDto: UpdatePullRequestDto,
  ) {
    return this.pullRequestsService.update(id, userId, updatePullRequestDto);
  }

  @Post(':id/close')
  @ApiOperation({ summary: '关闭PR' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 200,
    description: 'PR关闭成功',
  })
  @ApiResponse({ status: 400, description: 'PR已关闭或已合并' })
  @ApiResponse({ status: 404, description: 'PR不存在' })
  close(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.pullRequestsService.close(id, userId);
  }

  @Post(':id/merge')
  @ApiOperation({ summary: '合并PR' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 200,
    description: 'PR合并成功',
  })
  @ApiResponse({ status: 400, description: 'PR未开放或存在冲突' })
  @ApiResponse({ status: 404, description: 'PR不存在' })
  merge(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() mergePullRequestDto: MergePullRequestDto,
  ) {
    return this.pullRequestsService.merge(id, userId, mergePullRequestDto);
  }

  @Post(':id/reviews')
  @ApiOperation({ summary: '提交PR审查' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 201,
    description: '审查提交成功',
  })
  @ApiResponse({ status: 400, description: 'PR已关闭或已合并' })
  @ApiResponse({ status: 404, description: 'PR不存在' })
  addReview(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.pullRequestsService.addReview(id, userId, createReviewDto);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: '获取PR的所有审查' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 200,
    description: '返回审查列表',
  })
  getReviews(@Param('id') id: string) {
    return this.pullRequestsService.getReviews(id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: '添加PR评论' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 201,
    description: '评论添加成功',
  })
  @ApiResponse({ status: 404, description: 'PR不存在' })
  addComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() createCommentDto: PullRequestCreateCommentDto,
  ) {
    return this.pullRequestsService.addComment(id, userId, createCommentDto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: '获取PR的所有评论' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 200,
    description: '返回评论列表',
  })
  getComments(@Param('id') id: string) {
    return this.pullRequestsService.getComments(id);
  }

  @Get(':id/diff')
  @ApiOperation({ summary: '获取PR的Git Diff及行内评论' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 200,
    description: '返回Diff信息和行内评论',
    type: DiffResponseDto,
  })
  @ApiResponse({ status: 404, description: 'PR不存在' })
  getDiff(@Param('id') id: string) {
    return this.pullRequestsService.getDiff(id);
  }

  @Get(':id/review-summary')
  @ApiOperation({ summary: '获取PR的Review摘要' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 200,
    description: '返回Review聚合摘要（每个reviewer的最新状态）',
    type: ReviewSummaryResponseDto,
  })
  getReviewSummary(@Param('id') id: string) {
    return this.pullRequestsService.getReviewSummary(id);
  }

  @Get(':id/merge-status')
  @ApiOperation({ summary: '检查PR是否可以合并' })
  @ApiParam({ name: 'id', description: 'PR ID' })
  @ApiResponse({
    status: 200,
    description: '返回合并状态及原因',
    type: MergeStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'PR不存在' })
  getMergeStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pullRequestsService.canMergePR(id, userId);
  }
}
