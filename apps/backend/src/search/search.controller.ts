import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  SearchResultDto,
  IndexStatusDto,
  ReindexResponseDto,
} from './dto/search-result.dto';

/**
 * 代码搜索控制器
 *
 * 端点：
 * - GET /api/search - 全局代码搜索（公开）
 * - GET /api/search/projects/:projectId - 项目内搜索
 * - POST /api/search/reindex/:projectId - 触发项目重索引
 * - GET /api/search/status/:projectId - 获取索引状态
 * - DELETE /api/search/indexes/:projectId - 删除项目索引
 *
 * ECP-A1 (SOLID): 单一职责 - 只负责HTTP请求处理
 * ECP-C1 (输入验证): 使用DTO验证请求参数
 */
@Controller('search')
@Version('1')
@ApiTags('Code Search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 全局代码搜索
   *
   * GET /api/search?q=UserService&projectId=xxx&language=typescript
   *
   * @param query - 搜索查询参数
   * @returns 搜索结果
   */
  @Get()
  @Public()
  @ApiOperation({ summary: '全局代码搜索' })
  @ApiOkResponse({ type: SearchResultDto })
  async search(@Query() query: SearchQueryDto): Promise<SearchResultDto> {
    return this.searchService.searchCode(query);
  }

  /**
   * 项目内搜索
   *
   * GET /api/search/projects/:projectId?q=createUser
   *
   * @param projectId - 项目ID
   * @param query - 搜索查询参数
   * @returns 搜索结果
   */
  @Get('projects/:projectId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '项目内代码搜索' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiOkResponse({ type: SearchResultDto })
  async searchInProject(
    @Param('projectId') projectId: string,
    @Query() query: SearchQueryDto,
  ): Promise<SearchResultDto> {
    return this.searchService.searchCode({ ...query, projectId });
  }

  /**
   * 触发项目重索引
   *
   * POST /api/search/reindex/:projectId
   *
   * @param projectId - 项目ID
   * @returns 索引任务信息
   */
  @Post('reindex/:projectId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '触发项目重索引' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiOkResponse({ type: ReindexResponseDto })
  async reindexProject(
    @Param('projectId') projectId: string,
  ): Promise<ReindexResponseDto> {
    return this.searchService.triggerReindex(projectId);
  }

  /**
   * 获取项目索引状态
   *
   * GET /api/search/status/:projectId
   *
   * @param projectId - 项目ID
   * @returns 索引状态统计
   */
  @Get('status/:projectId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取项目索引状态' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiOkResponse({ type: IndexStatusDto })
  async getIndexStatus(
    @Param('projectId') projectId: string,
  ): Promise<IndexStatusDto> {
    return this.searchService.getIndexStatus(projectId);
  }

  /**
   * 删除项目索引
   *
   * DELETE /api/search/indexes/:projectId
   *
   * @param projectId - 项目ID
   * @returns 删除结果
   *
   * TODO: Task 1.7实现完整逻辑
   */
  @Delete('indexes/:projectId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除项目索引' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  deleteIndex(@Param('projectId') _projectId: string): never {
    throw new Error('Not implemented yet - Task 1.7');
  }
}
