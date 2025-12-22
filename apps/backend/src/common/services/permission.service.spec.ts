/**
 * PermissionService Unit Tests
 * 测试覆盖：权限检查、角色层级、缓存机制
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MemberRole, OrgRole, TeamRole, User, UserRole } from '@prisma/client';

describe('PermissionService', () => {
  let service: PermissionService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockSuperAdmin: User = {
    id: 'super-admin-id',
    username: 'superadmin',
    email: 'admin@example.com',
    passwordHash: 'hash',
    role: UserRole.SUPER_ADMIN,
    avatar: null,
    isActive: true,
    tokenVersion: 0,
    emailVerified: true,
    emailVerifyToken: null,
    emailVerifyExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRegularUser: User = {
    ...mockSuperAdmin,
    id: 'regular-user-id',
    username: 'regularuser',
    email: 'user@example.com',
    role: UserRole.USER,
  };

  const mockProject = {
    id: 'project-id-1',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    ownerId: 'owner-id',
    organizationId: 'org-id-1',
    visibility: 'PRIVATE',
    defaultBranch: 'main',
    requireApprovals: 1,
    allowSelfMerge: false,
    requireReviewFromOwner: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrganization = {
    id: 'org-id-1',
    name: 'Test Organization',
    slug: 'test-org',
    description: 'A test organization',
    isPersonal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeam = {
    id: 'team-id-1',
    name: 'Test Team',
    slug: 'test-team',
    description: 'A test team',
    organizationId: 'org-id-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: mockOrganization,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      project: {
        findUnique: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
      team: {
        findFirst: jest.fn(),
      },
      projectMember: {
        findUnique: jest.fn(),
      },
      teamProjectPermission: {
        findMany: jest.fn(),
      },
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isSuperAdmin', () => {
    it('should return true for SUPER_ADMIN user', () => {
      expect(service.isSuperAdmin(mockSuperAdmin)).toBe(true);
    });

    it('should return false for regular user', () => {
      expect(service.isSuperAdmin(mockRegularUser)).toBe(false);
    });
  });

  describe('getEffectiveProjectRole', () => {
    it('should return cached role if available', async () => {
      // Arrange
      const userId = 'user-id-1';
      const projectId = 'project-id-1';
      redisService.get.mockResolvedValue(MemberRole.OWNER);

      // Act
      const result = await service.getEffectiveProjectRole(userId, projectId);

      // Assert
      expect(result).toBe(MemberRole.OWNER);
      expect(redisService.get).toHaveBeenCalledWith(
        `user:${userId}:project:${projectId}:role`,
      );
      expect(prismaService.projectMember.findUnique).not.toHaveBeenCalled();
    });

    it('should query database and cache result if not cached', async () => {
      // Arrange
      const userId = 'user-id-1';
      const projectId = 'project-id-1';
      redisService.get.mockResolvedValue(null);
      prismaService.projectMember.findUnique.mockResolvedValue({
        role: MemberRole.MAINTAINER,
      });
      prismaService.teamProjectPermission.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getEffectiveProjectRole(userId, projectId);

      // Assert
      expect(result).toBe(MemberRole.MAINTAINER);
      expect(redisService.set).toHaveBeenCalledWith(
        `user:${userId}:project:${projectId}:role`,
        MemberRole.MAINTAINER,
        60,
      );
    });

    it('should return highest role from direct membership and team permissions', async () => {
      // Arrange
      const userId = 'user-id-1';
      const projectId = 'project-id-1';
      redisService.get.mockResolvedValue(null);
      prismaService.projectMember.findUnique.mockResolvedValue({
        role: MemberRole.MEMBER,
      });
      prismaService.teamProjectPermission.findMany.mockResolvedValue([
        { role: MemberRole.MAINTAINER },
        { role: MemberRole.VIEWER },
      ]);

      // Act
      const result = await service.getEffectiveProjectRole(userId, projectId);

      // Assert
      expect(result).toBe(MemberRole.MAINTAINER); // Highest role
    });

    it('should return null if user has no project access', async () => {
      // Arrange
      const userId = 'user-id-1';
      const projectId = 'project-id-1';
      redisService.get.mockResolvedValue(null);
      prismaService.projectMember.findUnique.mockResolvedValue(null);
      prismaService.teamProjectPermission.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getEffectiveProjectRole(userId, projectId);

      // Assert
      expect(result).toBeNull();
    });

    it('should use parallel queries for performance', async () => {
      // Arrange
      const userId = 'user-id-1';
      const projectId = 'project-id-1';
      redisService.get.mockResolvedValue(null);
      prismaService.projectMember.findUnique.mockResolvedValue(null);
      prismaService.teamProjectPermission.findMany.mockResolvedValue([]);

      // Act
      await service.getEffectiveProjectRole(userId, projectId);

      // Assert
      // Both queries should be called (parallel execution)
      expect(prismaService.projectMember.findUnique).toHaveBeenCalled();
      expect(prismaService.teamProjectPermission.findMany).toHaveBeenCalled();
    });
  });

  describe('checkProjectPermission', () => {
    it('should allow SUPER_ADMIN to access any project', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue(mockProject);

      // Act
      const result = await service.checkProjectPermission(
        mockSuperAdmin,
        'project-id-1',
        MemberRole.OWNER,
      );

      // Assert
      expect(result).toEqual(mockProject);
      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-id-1' },
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.checkProjectPermission(
          mockSuperAdmin,
          'non-existent-project',
          MemberRole.VIEWER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should grant access if user has sufficient permissions', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        members: [{ role: MemberRole.MAINTAINER }],
        teamPermissions: [],
      });

      // Act
      const result = await service.checkProjectPermission(
        mockRegularUser,
        'project-id-1',
        MemberRole.MEMBER, // Requesting lower role
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if user is not a project member', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        members: [],
        teamPermissions: [],
      });

      // Act & Assert
      await expect(
        service.checkProjectPermission(
          mockRegularUser,
          'project-id-1',
          MemberRole.VIEWER,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkProjectPermission(
          mockRegularUser,
          'project-id-1',
          MemberRole.VIEWER,
        ),
      ).rejects.toThrow('Not a member of this project');
    });

    it('should throw ForbiddenException if user has insufficient permissions', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        members: [{ role: MemberRole.VIEWER }],
        teamPermissions: [],
      });

      // Act & Assert
      await expect(
        service.checkProjectPermission(
          mockRegularUser,
          'project-id-1',
          MemberRole.MAINTAINER, // Requesting higher role
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkProjectPermission(
          mockRegularUser,
          'project-id-1',
          MemberRole.MAINTAINER,
        ),
      ).rejects.toThrow('Requires MAINTAINER role or higher');
    });

    it('should consider team permissions when checking access', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        members: [],
        teamPermissions: [{ role: MemberRole.MAINTAINER }],
      });

      // Act
      const result = await service.checkProjectPermission(
        mockRegularUser,
        'project-id-1',
        MemberRole.MEMBER,
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should use single query optimization with include', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        members: [{ role: MemberRole.OWNER }],
        teamPermissions: [],
      });

      // Act
      await service.checkProjectPermission(
        mockRegularUser,
        'project-id-1',
        MemberRole.VIEWER,
      );

      // Assert
      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-id-1' },
        include: expect.objectContaining({
          members: expect.any(Object),
          teamPermissions: expect.any(Object),
        }),
      });
    });
  });

  describe('checkOrganizationPermission', () => {
    it('should allow SUPER_ADMIN to access any organization', async () => {
      // Arrange
      prismaService.organization.findUnique.mockResolvedValue(mockOrganization);

      // Act
      const result = await service.checkOrganizationPermission(
        mockSuperAdmin,
        'test-org',
        OrgRole.OWNER,
      );

      // Assert
      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException if organization not found', async () => {
      // Arrange
      prismaService.organization.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.checkOrganizationPermission(
          mockRegularUser,
          'non-existent-org',
          OrgRole.MEMBER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should grant access if user has sufficient organization permissions', async () => {
      // Arrange
      prismaService.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        members: [{ userId: mockRegularUser.id, role: OrgRole.ADMIN }],
      });

      // Act
      const result = await service.checkOrganizationPermission(
        mockRegularUser,
        'test-org',
        OrgRole.MEMBER,
      );

      // Assert
      expect(result).toEqual(mockOrganization);
    });

    it('should throw ForbiddenException if user is not organization member', async () => {
      // Arrange
      prismaService.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        members: [],
      });

      // Act & Assert
      await expect(
        service.checkOrganizationPermission(
          mockRegularUser,
          'test-org',
          OrgRole.MEMBER,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkOrganizationPermission(
          mockRegularUser,
          'test-org',
          OrgRole.MEMBER,
        ),
      ).rejects.toThrow('Not a member of this organization');
    });

    it('should throw ForbiddenException if user has insufficient permissions', async () => {
      // Arrange
      prismaService.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        members: [{ userId: mockRegularUser.id, role: OrgRole.MEMBER }],
      });

      // Act & Assert
      await expect(
        service.checkOrganizationPermission(
          mockRegularUser,
          'test-org',
          OrgRole.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkOrganizationPermission(
          mockRegularUser,
          'test-org',
          OrgRole.ADMIN,
        ),
      ).rejects.toThrow('Requires ADMIN role or higher');
    });
  });

  describe('checkTeamPermission', () => {
    it('should allow SUPER_ADMIN to access any team', async () => {
      // Arrange
      prismaService.team.findFirst.mockResolvedValue(mockTeam);

      // Act
      const result = await service.checkTeamPermission(
        mockSuperAdmin,
        'test-org',
        'test-team',
        TeamRole.MAINTAINER,
      );

      // Assert
      expect(result).toEqual(mockTeam);
    });

    it('should throw NotFoundException if team not found', async () => {
      // Arrange
      prismaService.team.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.checkTeamPermission(
          mockRegularUser,
          'test-org',
          'non-existent-team',
          TeamRole.MEMBER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should grant access if user has sufficient team permissions', async () => {
      // Arrange
      prismaService.team.findFirst.mockResolvedValue({
        ...mockTeam,
        members: [{ userId: mockRegularUser.id, role: TeamRole.MAINTAINER }],
      });

      // Act
      const result = await service.checkTeamPermission(
        mockRegularUser,
        'test-org',
        'test-team',
        TeamRole.MEMBER,
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if user is not team member', async () => {
      // Arrange
      prismaService.team.findFirst.mockResolvedValue({
        ...mockTeam,
        members: [],
      });

      // Act & Assert
      await expect(
        service.checkTeamPermission(
          mockRegularUser,
          'test-org',
          'test-team',
          TeamRole.MEMBER,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkTeamPermission(
          mockRegularUser,
          'test-org',
          'test-team',
          TeamRole.MEMBER,
        ),
      ).rejects.toThrow('Not a member of this team');
    });

    it('should throw ForbiddenException if user has insufficient permissions', async () => {
      // Arrange
      prismaService.team.findFirst.mockResolvedValue({
        ...mockTeam,
        members: [{ userId: mockRegularUser.id, role: TeamRole.MEMBER }],
      });

      // Act & Assert
      await expect(
        service.checkTeamPermission(
          mockRegularUser,
          'test-org',
          'test-team',
          TeamRole.MAINTAINER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate project permission cache for specific user', async () => {
      // Arrange
      const userId = 'user-id-1';
      const projectId = 'project-id-1';

      // Act
      await service.invalidateProjectPermissionCache(userId, projectId);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith(
        `user:${userId}:project:${projectId}:role`,
      );
    });

    it('should invalidate all project permission caches for a project', async () => {
      // Arrange
      const projectId = 'project-id-1';

      // Act
      await service.invalidateAllProjectPermissionCaches(projectId);

      // Assert
      expect(redisService.delPattern).toHaveBeenCalledWith(
        `user:*:project:${projectId}:role`,
      );
    });
  });

  describe('Role hierarchy', () => {
    it('OWNER should have higher permissions than MAINTAINER', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        members: [{ role: MemberRole.OWNER }],
        teamPermissions: [],
      });

      // Act & Assert
      await expect(
        service.checkProjectPermission(
          mockRegularUser,
          'project-id-1',
          MemberRole.MAINTAINER,
        ),
      ).resolves.toBeDefined();
    });

    it('MAINTAINER should have higher permissions than MEMBER', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        members: [{ role: MemberRole.MAINTAINER }],
        teamPermissions: [],
      });

      // Act & Assert
      await expect(
        service.checkProjectPermission(
          mockRegularUser,
          'project-id-1',
          MemberRole.MEMBER,
        ),
      ).resolves.toBeDefined();
    });

    it('MEMBER should have higher permissions than VIEWER', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        members: [{ role: MemberRole.MEMBER }],
        teamPermissions: [],
      });

      // Act & Assert
      await expect(
        service.checkProjectPermission(
          mockRegularUser,
          'project-id-1',
          MemberRole.VIEWER,
        ),
      ).resolves.toBeDefined();
    });

    it('VIEWER should not have MEMBER permissions', async () => {
      // Arrange
      prismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        members: [{ role: MemberRole.VIEWER }],
        teamPermissions: [],
      });

      // Act & Assert
      await expect(
        service.checkProjectPermission(
          mockRegularUser,
          'project-id-1',
          MemberRole.MEMBER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
