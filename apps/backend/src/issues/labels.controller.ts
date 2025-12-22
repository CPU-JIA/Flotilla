import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../projects/guards/project-role.guard';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';

@ApiTags('Labels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@Controller('projects/:projectId/labels')
@Version('1')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @RequireProjectRole('MAINTAINER')
  @ApiOperation({ summary: '创建标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: 201, description: '标签创建成功' })
  @ApiResponse({ status: 409, description: '标签名称已存在' })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要MAINTAINER或更高权限）',
  })
  create(
    @Param('projectId') projectId: string,
    @Body() createLabelDto: CreateLabelDto,
  ) {
    return this.labelsService.create(projectId, createLabelDto);
  }

  @Get()
  @RequireProjectRole('VIEWER')
  @ApiOperation({ summary: '获取标签列表' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: 200, description: '返回标签列表' })
  @ApiResponse({ status: 403, description: '权限不足（需要VIEWER或更高权限）' })
  findAll(@Param('projectId') projectId: string) {
    return this.labelsService.findAll(projectId);
  }

  @Get(':id')
  @RequireProjectRole('VIEWER')
  @ApiOperation({ summary: '获取单个标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({ status: 200, description: '返回标签详情' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  @ApiResponse({ status: 403, description: '权限不足（需要VIEWER或更高权限）' })
  findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.labelsService.findOne(projectId, id);
  }

  @Patch(':id')
  @RequireProjectRole('MAINTAINER')
  @ApiOperation({ summary: '更新标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({ status: 200, description: '标签更新成功' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  @ApiResponse({ status: 409, description: '标签名称已存在' })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要MAINTAINER或更高权限）',
  })
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateLabelDto: UpdateLabelDto,
  ) {
    return this.labelsService.update(projectId, id, updateLabelDto);
  }

  @Delete(':id')
  @RequireProjectRole('MAINTAINER')
  @ApiOperation({ summary: '删除标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({ status: 204, description: '标签已删除' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要MAINTAINER或更高权限）',
  })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.labelsService.remove(projectId, id);
    return { message: 'Label deleted successfully' };
  }
}
