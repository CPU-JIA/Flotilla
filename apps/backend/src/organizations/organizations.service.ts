import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-member.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class OrganizationsService {
  // Maximum number of organizations a user can create
  private readonly USER_ORG_QUOTA = 10;

  constructor(private prisma: PrismaService) {}

  /**
   * Find all organizations a user is a member of
   */
  async findAllByUser(userId: string) {
    const organizations = await this.prisma.organization.findMany({
      where: {
        deletedAt: null,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
        _count: {
          select: {
            members: true,
            projects: true,
            teams: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      avatar: org.avatar,
      website: org.website,
      isPersonal: org.isPersonal,
      myRole: org.members[0]?.role || null,
      memberCount: org._count.members,
      projectCount: org._count.projects,
      teamCount: org._count.teams,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    }));
  }

  /**
   * Find a specific organization by slug with detailed information
   */
  async findBySlug(slug: string, userId?: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug, deletedAt: null },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
        _count: {
          select: {
            projects: true,
            teams: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Calculate user's role if userId provided
    const myMember = userId
      ? organization.members.find((m) => m.user.id === userId)
      : null;

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      avatar: organization.avatar,
      website: organization.website,
      isPersonal: organization.isPersonal,
      maxProjects: organization.maxProjects,
      maxMembers: organization.maxMembers,
      storageQuota: organization.storageQuota,
      storageUsed: organization.storageUsed,
      myRole: myMember?.role || null,
      members: organization.members.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      memberCount: organization.members.length,
      projectCount: organization._count.projects,
      teamCount: organization._count.teams,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  /**
   * Create a new organization
   */
  async create(userId: string, dto: CreateOrganizationDto) {
    // Check user quota: maximum 10 organizations per user
    const userOrgCount = await this.prisma.organization.count({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    if (userOrgCount >= this.USER_ORG_QUOTA) {
      throw new BadRequestException(
        `You can only create up to ${this.USER_ORG_QUOTA} organizations`,
      );
    }

    // Check slug uniqueness (including soft-deleted organizations)
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existingOrg) {
      throw new ConflictException(
        `Slug '${dto.slug}' is already taken. Please choose a different slug.`,
      );
    }

    // Create organization with creator as OWNER
    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        website: dto.website,
        isPersonal: false,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      website: organization.website,
      isPersonal: organization.isPersonal,
      myRole: 'OWNER' as const,
      memberCount: 1,
      projectCount: 0,
      teamCount: 0,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  /**
   * Update an organization's settings
   */
  async update(slug: string, userId: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findUnique({
      where: { slug, deletedAt: null },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is SUPER_ADMIN for quota updates
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Only SUPER_ADMIN can update quota fields
    if (
      (dto.maxProjects !== undefined ||
        dto.maxMembers !== undefined ||
        dto.storageQuota !== undefined) &&
      user?.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Only platform administrators can update organization quotas',
      );
    }

    const updated = await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        name: dto.name,
        description: dto.description,
        website: dto.website,
        avatar: dto.avatar,
        maxProjects: dto.maxProjects,
        maxMembers: dto.maxMembers,
        storageQuota: dto.storageQuota,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      avatar: updated.avatar,
      website: updated.website,
      maxProjects: updated.maxProjects,
      maxMembers: updated.maxMembers,
      storageQuota: updated.storageQuota,
      storageUsed: updated.storageUsed,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Soft delete an organization (30-day recovery period)
   */
  async remove(slug: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug, deletedAt: null },
      include: {
        members: {
          where: { userId, role: 'OWNER' },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Only OWNER can delete organization
    if (org.members.length === 0) {
      throw new ForbiddenException(
        'Only organization owners can delete the organization',
      );
    }

    // Soft delete by setting deletedAt timestamp
    await this.prisma.organization.update({
      where: { id: org.id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Organization deleted successfully',
      slug: org.slug,
      recoveryPeriod: '30 days',
      note: 'Organization can be recovered within 30 days by platform administrators',
    };
  }

  /**
   * Get all members of an organization
   */
  async findMembers(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug, deletedAt: null },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                bio: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org.members.map((member) => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt,
      user: member.user,
    }));
  }

  /**
   * Add a new member to an organization
   */
  async addMember(slug: string, dto: AddOrganizationMemberDto) {
    const org = await this.prisma.organization.findUnique({
      where: { slug, deletedAt: null },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException(`User with email '${dto.email}' not found`);
    }

    // Check member quota
    if (org._count.members >= org.maxMembers) {
      throw new BadRequestException(
        `Organization has reached its maximum member limit (${org.maxMembers})`,
      );
    }

    // Check if user is already a member
    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    // Create membership
    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return {
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt,
      user: member.user,
    };
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    slug: string,
    targetUserId: string,
    dto: UpdateOrganizationMemberRoleDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { slug, deletedAt: null },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Find the member
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: targetUserId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Update role
    const updated = await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      role: updated.role,
      joinedAt: updated.joinedAt,
      user: updated.user,
    };
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(slug: string, targetUserId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug, deletedAt: null },
      include: {
        members: {
          where: { role: 'OWNER' },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Find the member to remove
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: targetUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Prevent removing the last OWNER
    if (member.role === 'OWNER' && org.members.length === 1) {
      throw new BadRequestException(
        'Cannot remove the last owner of the organization. Transfer ownership first or delete the organization.',
      );
    }

    // Delete membership
    await this.prisma.organizationMember.delete({
      where: { id: member.id },
    });

    return {
      message: 'Member removed successfully',
      userId: targetUserId,
    };
  }
}
