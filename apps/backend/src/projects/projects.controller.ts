import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ProjectsService, ProjectListResponse, ProjectDetailResponse } from './projects.service'
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  QueryProjectsDto,
} from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { User, Project, ProjectMember } from '@prisma/client'

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name)

  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * 创建项目
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateProjectDto,
    @CurrentUser() currentUser: User,
  ): Promise<Project> {
    this.logger.log(`📦 Creating project: ${createDto.name}`)
    return this.projectsService.create(createDto, currentUser)
  }

  /**
   * 获取项目列表
   */
  @Get()
  async findAll(
    @Query() query: QueryProjectsDto,
    @CurrentUser() currentUser: User,
  ): Promise<ProjectListResponse> {
    this.logger.log(`📋 Fetching projects with query: ${JSON.stringify(query)}`)
    return this.projectsService.findAll(query, currentUser)
  }

  /**
   * 获取项目详情
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<ProjectDetailResponse> {
    this.logger.log(`🔍 Fetching project: ${id}`)
    return this.projectsService.findOne(id, currentUser)
  }

  /**
   * 更新项目
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProjectDto,
    @CurrentUser() currentUser: User,
  ): Promise<Project> {
    this.logger.log(`✏️ Updating project: ${id}`)
    return this.projectsService.update(id, updateDto, currentUser)
  }

  /**
   * 删除项目
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    this.logger.warn(`🗑️ Deleting project: ${id}`)
    return this.projectsService.remove(id, currentUser)
  }

  /**
   * 添加项目成员
   */
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('id') projectId: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser() currentUser: User,
  ): Promise<ProjectMember> {
    this.logger.log(`👥 Adding member to project: ${projectId}`)
    return this.projectsService.addMember(projectId, addMemberDto, currentUser)
  }

  /**
   * 移除项目成员
   */
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    this.logger.log(`👤 Removing member ${userId} from project: ${projectId}`)
    return this.projectsService.removeMember(projectId, userId, currentUser)
  }

  /**
   * 更新成员角色
   */
  @Put(':id/members/:userId/role')
  async updateMemberRole(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @CurrentUser() currentUser: User,
  ): Promise<ProjectMember> {
    this.logger.log(`🔄 Updating member ${userId} role in project: ${projectId}`)
    return this.projectsService.updateMemberRole(projectId, userId, updateRoleDto, currentUser)
  }
}
