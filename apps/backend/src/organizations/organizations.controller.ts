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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-member.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationRoleGuard } from './guards/organization-role.guard';
import { RequireOrgRole } from './decorators/require-org-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('organizations')
@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ============================================
  // Organization CRUD
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'List my organizations',
    description: 'Get all organizations the authenticated user is a member of',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of organizations with member count and role',
  })
  findAll(@CurrentUser('id') userId: string) {
    return this.organizationsService.findAllByUser(userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an organization',
    description:
      'Create a new organization with the authenticated user as OWNER',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Quota exceeded or validation failed',
  })
  @ApiResponse({
    status: 409,
    description: 'Slug already exists',
  })
  create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(userId, createDto);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get organization details',
    description:
      'Get detailed information about an organization including members',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns organization details with members list',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  findOne(@Param('slug') slug: string, @CurrentUser('id') userId: string) {
    return this.organizationsService.findBySlug(slug, userId);
  }

  @Patch(':slug')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrgRole('ADMIN')
  @ApiOperation({
    summary: 'Update organization settings',
    description:
      'Update organization information. Requires ADMIN or OWNER role. Quota fields require SUPER_ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  update(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(slug, userId, updateDto);
  }

  @Delete(':slug')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrgRole('OWNER')
  @ApiOperation({
    summary: 'Delete organization',
    description:
      'Soft delete an organization (30-day recovery period). Requires OWNER role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only owners can delete organizations',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  remove(@Param('slug') slug: string, @CurrentUser('id') userId: string) {
    return this.organizationsService.remove(slug, userId);
  }

  // ============================================
  // Member Management
  // ============================================

  @Get(':slug/members')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrgRole('MEMBER')
  @ApiOperation({
    summary: 'List organization members',
    description:
      'Get all members of an organization with their roles. Requires MEMBER role or higher.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of organization members',
  })
  @ApiResponse({
    status: 403,
    description: 'Not a member of this organization',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  findMembers(@Param('slug') slug: string) {
    return this.organizationsService.findMembers(slug);
  }

  @Post(':slug/members')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrgRole('ADMIN')
  @ApiOperation({
    summary: 'Add a member to organization',
    description:
      'Invite a user to join the organization by email. Requires ADMIN or OWNER role.',
  })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Member quota exceeded',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member',
  })
  addMember(
    @Param('slug') slug: string,
    @Body() addMemberDto: AddOrganizationMemberDto,
  ) {
    return this.organizationsService.addMember(slug, addMemberDto);
  }

  @Patch(':slug/members/:userId')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrgRole('ADMIN')
  @ApiOperation({
    summary: "Update member's role",
    description:
      "Change a member's role in the organization. Requires ADMIN or OWNER role.",
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
    description: 'Member not found',
  })
  updateMemberRole(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateOrganizationMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(
      slug,
      userId,
      updateRoleDto,
    );
  }

  @Delete(':slug/members/:userId')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrgRole('ADMIN')
  @ApiOperation({
    summary: 'Remove a member from organization',
    description:
      'Remove a member from the organization. Requires ADMIN or OWNER role. Cannot remove the last OWNER.',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove last owner',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found',
  })
  removeMember(@Param('slug') slug: string, @Param('userId') userId: string) {
    return this.organizationsService.removeMember(slug, userId);
  }
}
