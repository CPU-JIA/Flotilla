import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';

describe('TeamsService', () => {
  let service: TeamsService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    team: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    teamProjectPermission: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllByUser', () => {
    it('should return all teams for a user', async () => {
      const userId = 'user-123';
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Team Alpha',
          slug: 'team-alpha',
          description: 'Test team',
          organization: { id: 'org-1', name: 'Org', slug: 'org' },
          members: [{ role: 'MAINTAINER' }],
          _count: { members: 5, projectPermissions: 3 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.team.findMany.mockResolvedValue(mockTeams);

      const result = await service.findAllByUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Team Alpha');
      expect(result[0].myRole).toBe('MAINTAINER');
      expect(result[0].memberCount).toBe(5);
      expect(prismaService.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            members: {
              some: { userId },
            },
          },
        }),
      );
    });

    it('should return empty array when user has no teams', async () => {
      const userId = 'user-123';

      mockPrismaService.team.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser(userId);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new team and add creator as MAINTAINER', async () => {
      const userId = 'user-123';
      const createDto: CreateTeamDto = {
        name: 'New Team',
        slug: 'new-team',
        description: 'A new team',
        organizationSlug: 'org-1',
      };

      const mockOrg = {
        id: 'org-1',
        slug: 'org-1',
        members: [{ userId, role: 'ADMIN' }],
      };

      const mockCreatedTeam = {
        id: 'team-1',
        name: createDto.name,
        slug: createDto.slug,
        description: createDto.description,
        organizationId: 'org-1',
        organization: {
          id: 'org-1',
          name: 'Org',
          slug: 'org-1',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.team.findFirst.mockResolvedValue(null);
      mockPrismaService.team.create.mockResolvedValue(mockCreatedTeam);

      const result = await service.create(userId, createDto);

      expect(result.id).toBe('team-1');
      expect(result.name).toBe('New Team');
      expect(result.myRole).toBe('MAINTAINER');
      expect(result.memberCount).toBe(1);
      expect(result.projectCount).toBe(0);
      expect(prismaService.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: createDto.name,
            slug: createDto.slug,
            members: {
              create: {
                userId,
                role: 'MAINTAINER',
              },
            },
          }),
        }),
      );
    });

    it('should throw ConflictException if team slug exists', async () => {
      const userId = 'user-123';
      const createDto: CreateTeamDto = {
        name: 'New Team',
        slug: 'existing-team',
        description: 'A new team',
        organizationSlug: 'org-1',
      };

      const mockOrg = {
        id: 'org-1',
        slug: 'org-1',
        members: [{ userId, role: 'ADMIN' }],
      };
      const mockExistingTeam = { id: 'team-1', slug: 'existing-team' };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.team.findFirst.mockResolvedValue(mockExistingTeam);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if organization not found', async () => {
      const userId = 'user-123';
      const createDto: CreateTeamDto = {
        name: 'New Team',
        slug: 'new-team',
        description: 'A new team',
        organizationSlug: 'non-existent',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return team from cache if available', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';

      const cachedTeam = {
        id: 'team-1',
        name: 'Team Alpha',
        slug: teamSlug,
        organization: { id: 'org-1', name: 'Org', slug: organizationSlug },
        members: [
          {
            id: 'member-1',
            role: 'MAINTAINER',
            joinedAt: new Date(),
            user: {
              id: 'user-1',
              username: 'alice',
              email: 'alice@example.com',
              avatar: null,
            },
          },
        ],
        _count: { projectPermissions: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRedisService.get.mockResolvedValue(cachedTeam);

      const result = await service.findBySlug(organizationSlug, teamSlug);

      expect(result).toBeDefined();
      expect(result.slug).toBe(teamSlug);
      expect(result.members).toHaveLength(1);
      expect(redisService.get).toHaveBeenCalled();
      expect(prismaService.team.findFirst).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';

      const mockTeam = {
        id: 'team-1',
        name: 'Team Alpha',
        slug: teamSlug,
        organization: { id: 'org-1', slug: organizationSlug, name: 'Org' },
        members: [
          {
            id: 'member-1',
            role: 'MEMBER',
            joinedAt: new Date(),
            user: {
              id: 'user-1',
              username: 'alice',
              email: 'alice@example.com',
              avatar: null,
            },
          },
        ],
        _count: { members: 3, projectPermissions: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);

      const result = await service.findBySlug(organizationSlug, teamSlug);

      expect(result).toBeDefined();
      expect(result.slug).toBe(teamSlug);
      expect(result.members).toHaveLength(1);
      expect(prismaService.team.findFirst).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if team not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'non-existent';

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.findBySlug(organizationSlug, teamSlug),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';

      const mockTeam = {
        id: 'team-1',
        slug: teamSlug,
        organization: { slug: organizationSlug },
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.team.delete.mockResolvedValue(mockTeam);

      const result = await service.remove(organizationSlug, teamSlug);

      expect(result).toEqual({
        message: 'Team deleted successfully',
        slug: teamSlug,
      });
      expect(prismaService.team.delete).toHaveBeenCalledWith({
        where: { id: 'team-1' },
      });
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if team not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'non-existent';

      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(service.remove(organizationSlug, teamSlug)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('should add a member to team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const addMemberDto = {
        email: 'bob@example.com',
        role: 'MEMBER' as const,
      };

      const mockTeam = {
        id: 'team-1',
        slug: teamSlug,
        organization: {
          members: [{ userId: 'user-456' }],
        },
      };
      const mockUser = { id: 'user-456', username: 'bob' };
      const mockMember = {
        id: 'member-1',
        teamId: 'team-1',
        userId: 'user-456',
        role: 'MEMBER',
        joinedAt: new Date(),
        user: mockUser,
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null);
      mockPrismaService.teamMember.create.mockResolvedValue(mockMember);

      const result = await service.addMember(
        organizationSlug,
        teamSlug,
        addMemberDto,
      );

      expect(result.role).toBe('MEMBER');
      expect(result.user.id).toBe('user-456');
      expect(prismaService.teamMember.create).toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw ConflictException if user is already a member', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const addMemberDto = {
        email: 'bob@example.com',
        role: 'MEMBER' as const,
      };

      const mockTeam = {
        id: 'team-1',
        slug: teamSlug,
        organization: {
          members: [{ userId: 'user-456' }],
        },
      };
      const mockUser = { id: 'user-456', username: 'bob' };
      const existingMember = {
        teamId: 'team-1',
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.teamMember.findUnique.mockResolvedValue(existingMember);

      await expect(
        service.addMember(organizationSlug, teamSlug, addMemberDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user email not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const addMemberDto = {
        email: 'nonexistent@example.com',
        role: 'MEMBER' as const,
      };

      const mockTeam = {
        id: 'team-1',
        slug: teamSlug,
        organization: { members: [] },
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(organizationSlug, teamSlug, addMemberDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update team information', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const updateDto = {
        name: 'Updated Team',
        description: 'New description',
      };

      const mockTeam = {
        id: 'team-1',
        slug: teamSlug,
        name: 'Old Team',
        description: 'Old description',
      };

      const mockUpdated = {
        id: 'team-1',
        slug: teamSlug,
        name: 'Updated Team',
        description: 'New description',
        updatedAt: new Date(),
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.team.update.mockResolvedValue(mockUpdated);

      const result = await service.update(
        organizationSlug,
        teamSlug,
        updateDto,
      );

      expect(result.name).toBe('Updated Team');
      expect(redisService.del).toHaveBeenCalledWith(
        `team:${organizationSlug}:${teamSlug}`,
      );
    });

    it('should throw NotFoundException if team not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'non-existent';
      const updateDto = { name: 'Updated' };

      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.update(organizationSlug, teamSlug, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMembers', () => {
    it('should return all team members', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';

      const mockTeam = {
        id: 'team-1',
        members: [
          {
            id: 'member-1',
            role: 'MAINTAINER',
            joinedAt: new Date(),
            user: {
              id: 'user-1',
              username: 'alice',
              email: 'alice@example.com',
              avatar: null,
              bio: null,
            },
          },
          {
            id: 'member-2',
            role: 'MEMBER',
            joinedAt: new Date(),
            user: {
              id: 'user-2',
              username: 'bob',
              email: 'bob@example.com',
              avatar: null,
              bio: null,
            },
          },
        ],
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);

      const result = await service.findMembers(organizationSlug, teamSlug);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('MAINTAINER');
      expect(result[1].role).toBe('MEMBER');
    });

    it('should throw NotFoundException if team not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'non-existent';

      mockPrismaService.team.findFirst.mockResolvedValue(null);

      await expect(
        service.findMembers(organizationSlug, teamSlug),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const targetUserId = 'user-456';
      const roleDto = { role: 'MAINTAINER' as const };

      const mockTeam = { id: 'team-1', slug: teamSlug };
      const mockMember = {
        id: 'member-1',
        teamId: 'team-1',
        userId: targetUserId,
        role: 'MEMBER',
        user: {
          id: targetUserId,
          username: 'bob',
          email: 'bob@example.com',
          avatar: null,
        },
      };

      const mockUpdated = {
        ...mockMember,
        role: 'MAINTAINER',
        joinedAt: new Date(),
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.teamMember.update.mockResolvedValue(mockUpdated);

      const result = await service.updateMemberRole(
        organizationSlug,
        teamSlug,
        targetUserId,
        roleDto,
      );

      expect(result.role).toBe('MAINTAINER');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if member not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const targetUserId = 'non-existent';
      const roleDto = { role: 'MAINTAINER' as const };

      const mockTeam = { id: 'team-1', slug: teamSlug };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(
          organizationSlug,
          teamSlug,
          targetUserId,
          roleDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const targetUserId = 'user-456';

      const mockTeam = {
        id: 'team-1',
        slug: teamSlug,
        members: [
          { role: 'MAINTAINER' },
          { role: 'MAINTAINER' }, // At least 2 maintainers
        ],
      };

      const mockMember = {
        id: 'member-1',
        teamId: 'team-1',
        userId: targetUserId,
        role: 'MEMBER',
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.teamMember.delete.mockResolvedValue(mockMember);

      const result = await service.removeMember(
        organizationSlug,
        teamSlug,
        targetUserId,
      );

      expect(result.message).toBe('Member removed successfully');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if member not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const targetUserId = 'non-existent';

      const mockTeam = {
        id: 'team-1',
        members: [{ role: 'MAINTAINER' }],
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember(organizationSlug, teamSlug, targetUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPermissions', () => {
    it('should return all project permissions', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';

      const mockTeam = {
        id: 'team-1',
        projectPermissions: [
          {
            id: 'perm-1',
            role: 'MAINTAINER',
            createdAt: new Date(),
            project: {
              id: 'proj-1',
              name: 'Project 1',
              description: 'Desc 1',
            },
          },
        ],
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);

      const result = await service.findPermissions(organizationSlug, teamSlug);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('MAINTAINER');
      expect(result[0].project.name).toBe('Project 1');
    });
  });

  describe('assignPermission', () => {
    it('should assign project permission to team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const permDto = { projectId: 'proj-1', role: 'MEMBER' as const };

      const mockTeam = { id: 'team-1', organizationId: 'org-1' };
      const mockProject = { id: 'proj-1', organizationId: 'org-1' };
      const mockPermission = {
        id: 'perm-1',
        teamId: 'team-1',
        projectId: 'proj-1',
        role: 'MEMBER',
        createdAt: new Date(),
        project: { id: 'proj-1', name: 'Project 1', description: '' },
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.teamProjectPermission.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.teamProjectPermission.create.mockResolvedValue(
        mockPermission,
      );

      const result = await service.assignPermission(
        organizationSlug,
        teamSlug,
        permDto,
      );

      expect(result.role).toBe('MEMBER');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw ConflictException if permission exists', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const permDto = { projectId: 'proj-1', role: 'MEMBER' as const };

      const mockTeam = { id: 'team-1', organizationId: 'org-1' };
      const mockProject = { id: 'proj-1', organizationId: 'org-1' };
      const existingPerm = { id: 'perm-1' };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.teamProjectPermission.findUnique.mockResolvedValue(
        existingPerm,
      );

      await expect(
        service.assignPermission(organizationSlug, teamSlug, permDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updatePermission', () => {
    it('should update project permission role', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const projectId = 'proj-1';
      const permDto = { role: 'MAINTAINER' as const };

      const mockTeam = { id: 'team-1' };
      const mockPermission = {
        id: 'perm-1',
        teamId: 'team-1',
        projectId,
        role: 'MEMBER',
        project: { id: 'proj-1', name: 'Project 1', description: '' },
      };

      const mockUpdated = {
        ...mockPermission,
        role: 'MAINTAINER',
        createdAt: new Date(),
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.teamProjectPermission.findUnique.mockResolvedValue(
        mockPermission,
      );
      mockPrismaService.teamProjectPermission.update.mockResolvedValue(
        mockUpdated,
      );

      const result = await service.updatePermission(
        organizationSlug,
        teamSlug,
        projectId,
        permDto,
      );

      expect(result.role).toBe('MAINTAINER');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if permission not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const projectId = 'non-existent';
      const permDto = { role: 'MAINTAINER' as const };

      const mockTeam = { id: 'team-1' };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.teamProjectPermission.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.updatePermission(
          organizationSlug,
          teamSlug,
          projectId,
          permDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokePermission', () => {
    it('should revoke project permission', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const projectId = 'proj-1';

      const mockTeam = { id: 'team-1' };
      const mockPermission = {
        id: 'perm-1',
        teamId: 'team-1',
        projectId,
        role: 'MEMBER',
      };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.teamProjectPermission.findUnique.mockResolvedValue(
        mockPermission,
      );
      mockPrismaService.teamProjectPermission.delete.mockResolvedValue(
        mockPermission,
      );

      const result = await service.revokePermission(
        organizationSlug,
        teamSlug,
        projectId,
      );

      expect(result.message).toBe('Permission revoked successfully');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if permission not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const projectId = 'non-existent';

      const mockTeam = { id: 'team-1' };

      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.teamProjectPermission.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.revokePermission(organizationSlug, teamSlug, projectId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
