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
      expect(prismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            members: {
              some: { userId },
            },
          },
        }),
      );
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.organizationMember.count.mockResolvedValue(2);
      mockPrismaService.organization.findFirst.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(mockCreatedOrg);

      const result = await service.create(userId, createDto);

      expect(result).toEqual(mockCreatedOrg);
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

      mockPrismaService.organizationMember.count.mockResolvedValue(2);
      mockPrismaService.organization.findFirst.mockResolvedValue(
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
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedOrg));

      const result = await service.findBySlug(slug);

      expect(result).toEqual(cachedOrg);
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

      await expect(service.findBySlug(slug)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete an organization', async () => {
      const slug = 'org-alpha';

      const mockOrg = {
        id: 'org-1',
        slug,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.organization.delete.mockResolvedValue(mockOrg);

      const result = await service.delete(slug);

      expect(result).toEqual({ message: 'Organization deleted successfully' });
      expect(prismaService.organization.delete).toHaveBeenCalledWith({
        where: { id: 'org-1' },
      });
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException if organization not found', async () => {
      const slug = 'non-existent';

      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.delete(slug)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMember', () => {
    it('should add a member to organization', async () => {
      const slug = 'org-alpha';
      const addMemberDto = {
        userId: 'user-456',
        role: 'MEMBER' as const,
      };

      const mockOrg = { id: 'org-1', slug };
      const mockUser = { id: 'user-456', username: 'bob' };
      const mockMember = {
        organizationId: 'org-1',
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);
      mockPrismaService.organizationMember.create.mockResolvedValue(mockMember);

      const result = await service.addMember(slug, addMemberDto);

      expect(result).toEqual(mockMember);
      expect(prismaService.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          userId: 'user-456',
          role: 'MEMBER',
        },
      });
    });

    it('should throw ConflictException if user is already a member', async () => {
      const slug = 'org-alpha';
      const addMemberDto = {
        userId: 'user-456',
        role: 'MEMBER' as const,
      };

      const mockOrg = { id: 'org-1', slug };
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
});
