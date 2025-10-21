import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
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

@ApiTags('Labels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @ApiOperation({ summary: '创建标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: 201, description: '标签创建成功' })
  @ApiResponse({ status: 409, description: '标签名称已存在' })
  create(
    @Param('projectId') projectId: string,
    @Body() createLabelDto: CreateLabelDto,
  ) {
    return this.labelsService.create(projectId, createLabelDto);
  }

  @Get()
  @ApiOperation({ summary: '获取标签列表' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: 200, description: '返回标签列表' })
  findAll(@Param('projectId') projectId: string) {
    return this.labelsService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({ status: 200, description: '返回标签详情' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.labelsService.findOne(projectId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({ status: 200, description: '标签更新成功' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  @ApiResponse({ status: 409, description: '标签名称已存在' })
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateLabelDto: UpdateLabelDto,
  ) {
    return this.labelsService.update(projectId, id, updateLabelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'id', description: '标签ID' })
  @ApiResponse({ status: 204, description: '标签已删除' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.labelsService.remove(projectId, id);
    return { message: 'Label deleted successfully' };
  }
}
