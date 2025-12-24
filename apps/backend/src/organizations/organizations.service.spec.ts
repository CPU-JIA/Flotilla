import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
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
        OrganizationsService,
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

    service = module.get<OrganizationsService>(OrganizationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllByUser', () => {
    it('should return all organizations for a user', async () => {
      const userId = 'user-123';
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Org Alpha',
          slug: 'org-alpha',
          description: 'Test org',
          members: [{ role: 'OWNER' }],
          _count: { members: 10, teams: 3, projects: 5 },
          maxMembers: 50,
          maxProjects: 100,
          storageQuota: 10737418240,
          storageUsed: 0,
          isPersonal: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.organization.findMany.mockResolvedValue(mockOrgs);

      const result = await service.findAllByUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Org Alpha');
      expect(result[0].myRole).toBe('OWNER');
      expect(result[0].memberCount).toBe(10);
      expect(prismaService.organization.findMany).toHaveBeenCalledWith({
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
    });

    it('should return empty array when user has no organizations', async () => {
      const userId = 'user-123';

      mockPrismaService.organization.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser(userId);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new organization and add creator as OWNER', async () => {
      const userId = 'user-123';
      const createDto: CreateOrganizationDto = {
        name: 'New Org',
        slug: 'new-org',
        description: 'A new organization',
      };

      const mockCreatedOrg = {
        id: 'org-1',
        name: createDto.name,
        slug: createDto.slug,
        description: createDto.description,
        avatar: null,
        website: null,
        maxMembers: 50,
        maxProjects: 100,
        storageQuota: 10737418240,
        storageUsed: 0,
        isPersonal: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.organizationMember.count.mockResolvedValue(2);
      mockPrismaService.organization.count.mockResolvedValue(2);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(mockCreatedOrg);

      const result = await service.create(userId, createDto);

      expect(result.id).toBe('org-1');
      expect(result.name).toBe('New Org');
      expect(result.slug).toBe('new-org');
      expect(result.myRole).toBe('OWNER');
      expect(result.memberCount).toBe(1);
      expect(result.projectCount).toBe(0);
      expect(prismaService.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: createDto.name,
            slug: createDto.slug,
            members: {
              create: {
                userId,
                role: 'OWNER',
              },
            },
          }),
        }),
      );
    });

    it('should throw ConflictException if organization slug exists', async () => {
      const userId = 'user-123';
      const createDto: CreateOrganizationDto = {
        name: 'New Org',
        slug: 'existing-org',
        description: 'A new organization',
      };

      const mockExistingOrg = { id: 'org-1', slug: 'existing-org' };

      mockPrismaService.organization.count.mockResolvedValue(2);
      mockPrismaService.organizationMember.count.mockResolvedValue(2);
      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockExistingOrg,
      );

      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return organization from cache if available', async () => {
      const slug = 'org-alpha';

      const cachedOrg = {
        id: 'org-1',
        name: 'Org Alpha',
        slug,
        description: 'Test org',
        avatar: null,
        website: null,
        maxMembers: 50,
        maxProjects: 100,
        storageQuota: 10737418240,
        storageUsed: 0,
        isPersonal: false,
        deletedAt: null,
        members: [
          {
            id: 'member-1',
            role: 'OWNER',
            joinedAt: new Date(),
            user: {
              id: 'user-1',
              username: 'alice',
              email: 'alice@example.com',
              avatar: null,
            },
          },
        ],
        _count: {
          projects: 5,
          teams: 3,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRedisService.get.mockResolvedValue(cachedOrg);

      const result = await service.findBySlug(slug);

      expect(result.id).toBe('org-1');
      expect(result.name).toBe('Org Alpha');
      expect(result.slug).toBe(slug);
      expect(result.myRole).toBeNull();
      expect(result.memberCount).toBe(1);
      expect(result.projectCount).toBe(5);
      expect(result.teamCount).toBe(3);
      expect(result.members).toHaveLength(1);
      expect(redisService.get).toHaveBeenCalled();
      expect(prismaService.organization.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const slug = 'org-alpha';

      const mockOrg = {
        id: 'org-1',
        name: 'Org Alpha',
        slug,
        members: [],
        _count: { members: 5, teams: 2, projects: 3 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.findBySlug(slug);

      expect(result).toBeDefined();
      expect(result.slug).toBe(slug);
      expect(prismaService.organization.findUnique).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if organization not found', async () => {
      const slug = 'non-existent';

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug(slug)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete an organization', async () => {
      const slug = 'org-alpha';
      const userId = 'user-123';

      const mockOrg = {
        id: 'org-1',
        slug,
        members: [{ userId, role: 'OWNER' }],
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockOrg,
        deletedAt: new Date(),
      });

      const result = await service.remove(slug, userId);

      expect(result.message).toBe('Organization deleted successfully');
      expect(result.slug).toBe(slug);
      expect(prismaService.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if organization not found', async () => {
      const slug = 'non-existent';
      const userId = 'user-123';

      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.remove(slug, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('should add a member to organization', async () => {
      const slug = 'org-alpha';
      const addMemberDto = {
        email: 'bob@example.com',
        role: 'MEMBER' as const,
      };

      const mockOrg = {
        id: 'org-1',
        slug,
        _count: { members: 5 },
        maxMembers: 50,
      };
      const mockUser = { id: 'user-456', username: 'bob', email: 'bob@example.com', avatar: null };
      const mockMember = {
        id: 'member-1',
        organizationId: 'org-1',
        userId: 'user-456',
        role: 'MEMBER',
        joinedAt: new Date(),
        user: {
          id: 'user-456',
          username: 'bob',
          email: 'bob@example.com',
          avatar: null,
        },
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.create.mockResolvedValue(mockMember);

      const result = await service.addMember(slug, addMemberDto);

      expect(result.id).toBe('member-1');
      expect(result.role).toBe('MEMBER');
      expect(result.user.id).toBe('user-456');
      expect(prismaService.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          userId: 'user-456',
          role: 'MEMBER',
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
    });

    it('should throw ConflictException if user is already a member', async () => {
      const slug = 'org-alpha';
      const addMemberDto = {
        email: 'bob@example.com',
        role: 'MEMBER' as const,
      };

      const mockOrg = {
        id: 'org-1',
        slug,
        _count: { members: 5 },
        maxMembers: 50,
      };
      const mockUser = { id: 'user-456', username: 'bob' };
      const existingMember = {
        organizationId: 'org-1',
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        existingMember,
      );

      await expect(service.addMember(slug, addMemberDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update organization information', async () => {
      const slug = 'org-alpha';
      const userId = 'user-123';
      const updateDto = { name: 'Updated Org', description: 'New desc' };

      const mockOrg = {
        id: 'org-1',
        slug,
        name: 'Old Org',
        maxMembers: 50,
        maxProjects: 100,
        storageQuota: 10737418240,
      };
      const mockUpdated = {
        ...mockOrg,
        name: 'Updated Org',
        description: 'New desc',
        updatedAt: new Date(),
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organization.update.mockResolvedValue(mockUpdated);

      const result = await service.update(slug, userId, updateDto);

      expect(result.name).toBe('Updated Org');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if organization not found', async () => {
      const slug = 'non-existent';
      const userId = 'user-123';
      const updateDto = { name: 'Updated' };

      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.update(slug, userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMembers', () => {
    it('should return all organization members', async () => {
      const slug = 'org-alpha';

      const mockOrg = {
        id: 'org-1',
        members: [
          {
            id: 'member-1',
            role: 'OWNER',
            joinedAt: new Date(),
            user: { id: 'user-1', username: 'alice', email: 'alice@example.com', avatar: null },
          },
        ],
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.findMembers(slug);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('OWNER');
    });

    it('should throw NotFoundException if organization not found', async () => {
      const slug = 'non-existent';

      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.findMembers(slug)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const slug = 'org-alpha';
      const targetUserId = 'user-456';
      const roleDto = { role: 'ADMIN' as const };

      const mockOrg = {
        id: 'org-1',
        slug,
        _count: { members: 5 },
      };
      const mockMember = {
        id: 'member-1',
        organizationId: 'org-1',
        userId: targetUserId,
        role: 'MEMBER',
        user: { id: targetUserId, username: 'bob', email: 'bob@example.com', avatar: null },
      };

      const mockUpdated = { ...mockMember, role: 'ADMIN', joinedAt: new Date() };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.organizationMember.update.mockResolvedValue(mockUpdated);

      const result = await service.updateMemberRole(slug, targetUserId, roleDto);

      expect(result.role).toBe('ADMIN');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if member not found', async () => {
      const slug = 'org-alpha';
      const targetUserId = 'non-existent';
      const roleDto = { role: 'ADMIN' as const };

      const mockOrg = {
        id: 'org-1',
        slug,
        _count: { members: 5 },
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(slug, targetUserId, roleDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from organization', async () => {
      const slug = 'org-alpha';
      const targetUserId = 'user-456';

      const mockOrg = {
        id: 'org-1',
        slug,
        _count: { members: 5 },
      };
      const mockMember = {
        id: 'member-1',
        organizationId: 'org-1',
        userId: targetUserId,
        role: 'MEMBER',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.organizationMember.count.mockResolvedValue(3);
      mockPrismaService.organizationMember.delete.mockResolvedValue(mockMember);

      const result = await service.removeMember(slug, targetUserId);

      expect(result.message).toBe('Member removed successfully');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if member not found', async () => {
      const slug = 'org-alpha';
      const targetUserId = 'non-existent';

      const mockOrg = {
        id: 'org-1',
        slug,
        _count: { members: 5 },
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(service.removeMember(slug, targetUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
