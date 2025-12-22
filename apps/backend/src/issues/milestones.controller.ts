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
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../projects/guards/project-role.guard';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';

@ApiTags('Milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/milestones')
@Version('1')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post()
  @RequireProjectRole('MAINTAINER')
  @ApiOperation({ summary: '创建里程碑' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: 201, description: '里程碑创建成功' })
  @ApiResponse({ status: 409, description: '里程碑标题已存在' })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要MAINTAINER或更高权限）',
  })
  create(
    @Param('projectId') projectId: string,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(projectId, createMilestoneDto);
  }

  @Get()
  @RequireProjectRole('VIEWER')
  @ApiOperation({ summary: '获取里程碑列表' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiQuery({
    name: 'state',
    required: false,
    enum: ['OPEN', 'CLOSED'],
    description: '按状态筛选',
  })
  @ApiResponse({ status: 200, description: '返回里程碑列表' })
  @ApiResponse({ status: 403, description: '权限不足（需要VIEWER或更高权限）' })
  findAll(
    @Param('projectId') projectId: string,
    @Query('state') state?: 'OPEN' | 'CLOSED',
  ) {
    return this.milestonesService.findAll(projectId, state);
  }

  @Get(':id')
  @RequireProjectRole('VIEWER')
  @ApiOperation({ summary: '获取单个里程碑' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'id', description: '里程碑ID' })
  @ApiResponse({ status: 200, description: '返回里程碑详情（包含关联Issues）' })
  @ApiResponse({ status: 404, description: '里程碑不存在' })
  @ApiResponse({ status: 403, description: '权限不足（需要VIEWER或更高权限）' })
  findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.milestonesService.findOne(projectId, id);
  }

  @Patch(':id')
  @RequireProjectRole('MAINTAINER')
  @ApiOperation({ summary: '更新里程碑' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'id', description: '里程碑ID' })
  @ApiResponse({ status: 200, description: '里程碑更新成功' })
  @ApiResponse({ status: 404, description: '里程碑不存在' })
  @ApiResponse({ status: 409, description: '里程碑标题已存在' })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要MAINTAINER或更高权限）',
  })
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(projectId, id, updateMilestoneDto);
  }

  @Delete(':id')
  @RequireProjectRole('MAINTAINER')
  @ApiOperation({ summary: '删除里程碑' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'id', description: '里程碑ID' })
  @ApiResponse({ status: 204, description: '里程碑已删除' })
  @ApiResponse({ status: 404, description: '里程碑不存在' })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要MAINTAINER或更高权限）',
  })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.milestonesService.remove(projectId, id);
    return { message: 'Milestone deleted successfully' };
  }
}
