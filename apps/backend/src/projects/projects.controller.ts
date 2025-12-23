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
} from '@nestjs/common';
import {
  ProjectsService,
  ProjectListResponse,
  ProjectDetailResponse,
} from './projects.service';
import { ProjectMembersService } from './project-members.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  QueryProjectsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from './guards/project-role.guard';
import { RequireProjectRole } from './decorators/require-project-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User, Project, ProjectMember } from '@prisma/client';
import { GitService } from '../git/git.service';

@Controller({ path: 'projects', version: '1' })
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectMembersService: ProjectMembersService, // 🔒 REFACTOR: 新增成员管理服务
    private readonly gitService: GitService,
  ) {}

  /**
   * 创建项目
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateProjectDto,
    @CurrentUser() currentUser: User,
  ): Promise<Project> {
    this.logger.log(`📦 Creating project: ${createDto.name}`);
    return this.projectsService.create(createDto, currentUser);
  }

  /**
   * 获取项目列表
   */
  @Get()
  async findAll(
    @Query() query: QueryProjectsDto,
    @CurrentUser() currentUser: User,
  ): Promise<ProjectListResponse> {
    this.logger.log(
      `📋 Fetching projects with query: ${JSON.stringify(query)}`,
    );
    return this.projectsService.findAll(query, currentUser);
  }

  /**
   * 获取项目详情
   */
  @Get(':id')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('VIEWER')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<ProjectDetailResponse> {
    this.logger.log(`🔍 Fetching project: ${id}`);
    return this.projectsService.findOne(id, currentUser);
  }

  /**
   * 更新项目
   */
  @Put(':id')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('MAINTAINER')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProjectDto,
    @CurrentUser() currentUser: User,
  ): Promise<Project> {
    this.logger.log(`✏️ Updating project: ${id}`);
    return this.projectsService.update(id, updateDto, currentUser);
  }

  /**
   * 删除项目
   */
  @Delete(':id')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('OWNER')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    this.logger.warn(`🗑️ Deleting project: ${id}`);
    return this.projectsService.remove(id, currentUser);
  }

  /**
   * 添加项目成员
   */
  @Post(':id/members')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('MAINTAINER')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('id') projectId: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser() currentUser: User,
  ): Promise<ProjectMember> {
    this.logger.log(`👥 Adding member to project: ${projectId}`);
    return this.projectMembersService.addMember(
      projectId,
      addMemberDto,
      currentUser,
    );
  }

  /**
   * 移除项目成员
   */
  @Delete(':id/members/:userId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('MAINTAINER')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    this.logger.log(`👤 Removing member ${userId} from project: ${projectId}`);
    return this.projectMembersService.removeMember(
      projectId,
      userId,
      currentUser,
    );
  }

  /**
   * 更新成员角色
   */
  @Put(':id/members/:userId/role')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('OWNER')
  async updateMemberRole(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @CurrentUser() currentUser: User,
  ): Promise<ProjectMember> {
    this.logger.log(
      `🔄 Updating member ${userId} role in project: ${projectId}`,
    );
    return this.projectMembersService.updateMemberRole(
      projectId,
      userId,
      updateRoleDto,
      currentUser,
    );
  }

  /**
   * 获取项目成员列表
   */
  @Get(':id/members')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('VIEWER')
  async getMembers(
    @Param('id') projectId: string,
    @CurrentUser() _currentUser: User,
  ): Promise<
    (ProjectMember & {
      user: { id: string; username: string; email: string };
    })[]
  > {
    this.logger.log(`👥 Fetching members for project: ${projectId}`);
    return this.projectMembersService.getMembers(projectId);
  }

  /**
   * 归档项目
   */
  @Post(':id/archive')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('OWNER')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<Project> {
    this.logger.warn(`📦 Archiving project: ${id}`);
    return this.projectsService.archive(id, currentUser);
  }

  /**
   * 取消归档项目
   */
  @Post(':id/unarchive')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('OWNER')
  @HttpCode(HttpStatus.OK)
  async unarchive(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<Project> {
    this.logger.log(`📦 Unarchiving project: ${id}`);
    return this.projectsService.unarchive(id, currentUser);
  }

  /**
   * 获取项目所有分支
   */
  @Get(':id/branches')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('VIEWER')
  async listBranches(@Param('id') id: string): Promise<
    Array<{
      name: string;
      commit: {
        oid: string;
        message: string;
        author: string;
        date: string;
      };
    }>
  > {
    this.logger.log(`🌿 Listing branches for project: ${id}`);
    return this.gitService.listBranches(id);
  }
}
