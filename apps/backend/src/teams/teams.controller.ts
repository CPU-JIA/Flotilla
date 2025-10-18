import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { UpdateTeamMemberRoleDto } from './dto/update-team-member-role.dto';
import { AssignProjectPermissionDto } from './dto/assign-project-permission.dto';
import { UpdateProjectPermissionDto } from './dto/update-project-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamRoleGuard } from './guards/team-role.guard';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard';
import { RequireTeamRole } from './decorators/require-team-role.decorator';
import { RequireOrgRole } from '../organizations/decorators/require-org-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('organizations/:organizationSlug/teams')
@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ============================================
  // Team CRUD
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'List my teams in this organization',
    description: 'Get all teams the authenticated user is a member of within this organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of teams with member count and role',
  })
  findAll(@CurrentUser('id') userId: string) {
    return this.teamsService.findAllByUser(userId);
  }

  @Post()
  @UseGuards(OrganizationRoleGuard)
  @RequireOrgRole('ADMIN')
  @ApiOperation({
    summary: 'Create a team',
    description:
      'Create a new team within the organization. Requires Organization ADMIN or OWNER role. Creator becomes team MAINTAINER.',
  })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Team slug already exists in this organization',
  })
  create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateTeamDto,
  ) {
    return this.teamsService.create(userId, createDto);
  }

  @Get(':teamSlug')
  @ApiOperation({
    summary: 'Get team details',
    description:
      'Get detailed information about a team including members',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns team details with members list',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  findOne(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.findBySlug(organizationSlug, teamSlug, userId);
  }

  @Patch(':teamSlug')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MAINTAINER')
  @ApiOperation({
    summary: 'Update team information',
    description:
      'Update team name and description. Requires team MAINTAINER role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Team updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  update(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
    @Body() updateDto: UpdateTeamDto,
  ) {
    return this.teamsService.update(organizationSlug, teamSlug, updateDto);
  }

  @Delete(':teamSlug')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MAINTAINER')
  @ApiOperation({
    summary: 'Delete team',
    description:
      'Delete a team. Requires team MAINTAINER role. All team members and permissions will be removed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Team deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only maintainers can delete teams',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  remove(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
  ) {
    return this.teamsService.remove(organizationSlug, teamSlug);
  }

  // ============================================
  // Member Management
  // ============================================

  @Get(':teamSlug/members')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MEMBER')
  @ApiOperation({
    summary: 'List team members',
    description:
      'Get all members of a team with their roles. Requires team MEMBER role or higher.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of team members',
  })
  @ApiResponse({
    status: 403,
    description: 'Not a member of this team',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  findMembers(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
  ) {
    return this.teamsService.findMembers(organizationSlug, teamSlug);
  }

  @Post(':teamSlug/members')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MAINTAINER')
  @ApiOperation({
    summary: 'Add a member to team',
    description:
      'Add an organization member to the team by email. Requires team MAINTAINER role. User must already be a member of the organization.',
  })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'User is not a member of the organization',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User or team not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member of this team',
  })
  addMember(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
    @Body() addMemberDto: AddTeamMemberDto,
  ) {
    return this.teamsService.addMember(organizationSlug, teamSlug, addMemberDto);
  }

  @Patch(':teamSlug/members/:userId')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MAINTAINER')
  @ApiOperation({
    summary: 'Update member role',
    description:
      'Change a team member role. Requires team MAINTAINER role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Member or team not found',
  })
  updateMemberRole(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateTeamMemberRoleDto,
  ) {
    return this.teamsService.updateMemberRole(
      organizationSlug,
      teamSlug,
      userId,
      updateRoleDto,
    );
  }

  @Delete(':teamSlug/members/:userId')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MAINTAINER')
  @ApiOperation({
    summary: 'Remove a member from team',
    description:
      'Remove a member from the team. Requires team MAINTAINER role. Cannot remove the last MAINTAINER.',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove last maintainer',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Member or team not found',
  })
  removeMember(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.removeMember(organizationSlug, teamSlug, userId);
  }

  // ============================================
  // Project Permission Management
  // ============================================

  @Get(':teamSlug/permissions')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MEMBER')
  @ApiOperation({
    summary: 'List team project permissions',
    description:
      'Get all projects the team has access to with permission levels. Requires team MEMBER role or higher.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of project permissions',
  })
  @ApiResponse({
    status: 403,
    description: 'Not a member of this team',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  findPermissions(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
  ) {
    return this.teamsService.findPermissions(organizationSlug, teamSlug);
  }

  @Post(':teamSlug/permissions')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MAINTAINER')
  @ApiOperation({
    summary: 'Assign project permission to team',
    description:
      'Grant team access to a project with specified permission level. Requires team MAINTAINER role. Project must belong to the same organization.',
  })
  @ApiResponse({
    status: 201,
    description: 'Permission assigned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Project does not belong to the same organization',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or project not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Permission already exists',
  })
  assignPermission(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
    @Body() assignDto: AssignProjectPermissionDto,
  ) {
    return this.teamsService.assignPermission(organizationSlug, teamSlug, assignDto);
  }

  @Patch(':teamSlug/permissions/:projectId')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MAINTAINER')
  @ApiOperation({
    summary: 'Update project permission level',
    description:
      'Change the permission level for a project. Requires team MAINTAINER role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Permission not found',
  })
  updatePermission(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
    @Param('projectId') projectId: string,
    @Body() updateDto: UpdateProjectPermissionDto,
  ) {
    return this.teamsService.updatePermission(
      organizationSlug,
      teamSlug,
      projectId,
      updateDto,
    );
  }

  @Delete(':teamSlug/permissions/:projectId')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole('MAINTAINER')
  @ApiOperation({
    summary: 'Revoke project permission from team',
    description:
      'Remove team access to a project. Requires team MAINTAINER role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission revoked successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Permission not found',
  })
  revokePermission(
    @Param('organizationSlug') organizationSlug: string,
    @Param('teamSlug') teamSlug: string,
    @Param('projectId') projectId: string,
  ) {
    return this.teamsService.revokePermission(organizationSlug, teamSlug, projectId);
  }
}
