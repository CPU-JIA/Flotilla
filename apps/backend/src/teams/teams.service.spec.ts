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
      };

      const mockCreatedTeam = {
        id: 'team-1',
        name: createDto.name,
        slug: createDto.slug,
        description: createDto.description,
        organizationId: 'org-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.team.findFirst.mockResolvedValue(null);
      mockPrismaService.team.create.mockResolvedValue(mockCreatedTeam);

      const result = await service.create(userId, createDto);

      expect(result).toEqual(mockCreatedTeam);
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

      const mockOrg = { id: 'org-1', slug: 'org-1' };
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
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedTeam));

      const result = await service.findBySlug(organizationSlug, teamSlug);

      expect(result).toEqual(cachedTeam);
      expect(redisService.get).toHaveBeenCalled();
      expect(prismaService.team.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';

      const mockTeam = {
        id: 'team-1',
        name: 'Team Alpha',
        slug: teamSlug,
        organization: { id: 'org-1', slug: organizationSlug },
        members: [],
        _count: { members: 3, projectPermissions: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.team.findUnique.mockResolvedValue(mockTeam);

      const result = await service.findBySlug(organizationSlug, teamSlug);

      expect(result).toBeDefined();
      expect(result.slug).toBe(teamSlug);
      expect(prismaService.team.findUnique).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if team not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'non-existent';

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.team.findUnique.mockResolvedValue(null);

      await expect(
        service.findBySlug(organizationSlug, teamSlug),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';

      const mockTeam = {
        id: 'team-1',
        slug: teamSlug,
        organization: { slug: organizationSlug },
      };

      mockPrismaService.team.findUnique.mockResolvedValue(mockTeam);
      mockPrismaService.team.delete.mockResolvedValue(mockTeam);

      const result = await service.delete(organizationSlug, teamSlug);

      expect(result).toEqual({ message: 'Team deleted successfully' });
      expect(prismaService.team.delete).toHaveBeenCalledWith({
        where: { id: 'team-1' },
      });
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if team not found', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'non-existent';

      mockPrismaService.team.findUnique.mockResolvedValue(null);

      await expect(service.delete(organizationSlug, teamSlug)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('should add a member to team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const addMemberDto = {
        userId: 'user-456',
        role: 'DEVELOPER' as const,
      };

      const mockTeam = { id: 'team-1', slug: teamSlug };
      const mockUser = { id: 'user-456', username: 'bob' };
      const mockMember = {
        teamId: 'team-1',
        userId: 'user-456',
        role: 'DEVELOPER',
      };

      mockPrismaService.team.findUnique.mockResolvedValue(mockTeam);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null);
      mockPrismaService.teamMember.create.mockResolvedValue(mockMember);

      const result = await service.addMember(
        organizationSlug,
        teamSlug,
        addMemberDto,
      );

      expect(result).toEqual(mockMember);
      expect(prismaService.teamMember.create).toHaveBeenCalledWith({
        data: {
          teamId: 'team-1',
          userId: 'user-456',
          role: 'DEVELOPER',
        },
      });
    });

    it('should throw ConflictException if user is already a member', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const addMemberDto = {
        userId: 'user-456',
        role: 'DEVELOPER' as const,
      };

      const mockTeam = { id: 'team-1', slug: teamSlug };
      const mockUser = { id: 'user-456', username: 'bob' };
      const existingMember = {
        teamId: 'team-1',
        userId: 'user-456',
        role: 'DEVELOPER',
      };

      mockPrismaService.team.findUnique.mockResolvedValue(mockTeam);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.teamMember.findUnique.mockResolvedValue(existingMember);

      await expect(
        service.addMember(organizationSlug, teamSlug, addMemberDto),
      ).rejects.toThrow(ConflictException);
    });
  });
});
