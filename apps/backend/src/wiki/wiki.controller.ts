import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { WikiService } from './wiki.service'
import { CreateWikiPageDto } from './dto/create-wiki-page.dto'
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto'
import {
  WikiPageResponseDto,
  WikiTreeNodeDto,
  WikiPageHistoryResponseDto,
} from './dto/wiki-page-response.dto'
import { PermissionService } from '../common/services/permission.service'

/**
 * Wiki Controller
 * 处理项目 Wiki 文档的 HTTP 请求
 *
 * ECP-A1: SOLID - 单一职责原则（仅处理 HTTP 层逻辑）
 * ECP-C1: 防御性编程 - 权限检查确保安全性
 * ECP-D2: 注释 Why - Swagger 文档提供 API 使用说明
 */
@ApiTags('Wiki')
@ApiBearerAuth()
@Controller('projects/:projectId/wiki')
@UseGuards(JwtAuthGuard)
export class WikiController {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * 创建新的 Wiki 页面
   * 权限要求：MEMBER 及以上
   */
  @Post()
  @ApiOperation({ summary: '创建 Wiki 页面' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '页面创建成功',
    type: WikiPageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Slug 已存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  async createPage(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWikiPageDto,
  ): Promise<WikiPageResponseDto> {
    // 检查权限：至少需要 MEMBER 权限才能创建页面
    await this.permissionService.checkProjectPermission(
      userId,
      projectId,
      'MEMBER',
    )

    return this.wikiService.createPage(projectId, userId, dto)
  }

  /**
   * 获取项目 Wiki 页面树
   * 权限要求：VIEWER 及以上
   */
  @Get()
  @ApiOperation({ summary: '获取 Wiki 页面树结构' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取页面树',
    type: [WikiTreeNodeDto],
  })
  async getWikiTree(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ): Promise<WikiTreeNodeDto[]> {
    // 检查权限：至少需要 VIEWER 权限才能查看
    await this.permissionService.checkProjectPermission(
      userId,
      projectId,
      'VIEWER',
    )

    return this.wikiService.getWikiTree(projectId)
  }

  /**
   * 获取单个 Wiki 页面
   * 权限要求：VIEWER 及以上
   */
  @Get(':slug')
  @ApiOperation({ summary: '获取单个 Wiki 页面' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'slug', description: '页面 slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取页面',
    type: WikiPageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '页面不存在' })
  async getPage(
    @Param('projectId') projectId: string,
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ): Promise<WikiPageResponseDto> {
    // 检查权限：至少需要 VIEWER 权限才能查看
    await this.permissionService.checkProjectPermission(
      userId,
      projectId,
      'VIEWER',
    )

    return this.wikiService.getPage(projectId, slug)
  }

  /**
   * 更新 Wiki 页面
   * 权限要求：MEMBER 及以上
   */
  @Put(':slug')
  @ApiOperation({ summary: '更新 Wiki 页面' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'slug', description: '页面 slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '页面更新成功',
    type: WikiPageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '页面不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  async updatePage(
    @Param('projectId') projectId: string,
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWikiPageDto,
  ): Promise<WikiPageResponseDto> {
    // 检查权限：至少需要 MEMBER 权限才能编辑
    await this.permissionService.checkProjectPermission(
      userId,
      projectId,
      'MEMBER',
    )

    return this.wikiService.updatePage(projectId, slug, userId, dto)
  }

  /**
   * 删除 Wiki 页面
   * 权限要求：MAINTAINER 及以上
   */
  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除 Wiki 页面' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'slug', description: '页面 slug' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: '删除成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '页面不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '权限不足' })
  async deletePage(
    @Param('projectId') projectId: string,
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    // 检查权限：至少需要 MAINTAINER 权限才能删除
    await this.permissionService.checkProjectPermission(
      userId,
      projectId,
      'MAINTAINER',
    )

    return this.wikiService.deletePage(projectId, slug)
  }

  /**
   * 获取页面历史记录
   * 权限要求：VIEWER 及以上
   */
  @Get(':slug/history')
  @ApiOperation({ summary: '获取页面历史记录' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'slug', description: '页面 slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取历史记录',
    type: [WikiPageHistoryResponseDto],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '页面不存在' })
  async getPageHistory(
    @Param('projectId') projectId: string,
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ): Promise<WikiPageHistoryResponseDto[]> {
    // 检查权限：至少需要 VIEWER 权限才能查看历史
    await this.permissionService.checkProjectPermission(
      userId,
      projectId,
      'VIEWER',
    )

    return this.wikiService.getPageHistory(projectId, slug)
  }
}
