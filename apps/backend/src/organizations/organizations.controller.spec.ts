import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationRoleGuard } from './guards/organization-role.guard';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;

  const mockOrganizationsService = {
    findAllByUser: jest.fn(),
    create: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
    findMembers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
      ],
    })
      .overrideGuard(OrganizationRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return user organizations', async () => {
      const userId = 'user-123';
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Org Alpha',
          slug: 'org-alpha',
          description: 'Test org',
          myRole: 'OWNER',
          memberCount: 10,
          teamCount: 3,
          projectCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockOrganizationsService.findAllByUser.mockResolvedValue(mockOrgs);

      const result = await controller.findAll(userId);

      expect(result).toEqual(mockOrgs);
      expect(service.findAllByUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('create', () => {
    it('should create a new organization', async () => {
      const userId = 'user-123';
      const createDto: CreateOrganizationDto = {
        name: 'New Org',
        slug: 'new-org',
        description: 'A new organization',
      };

      const mockCreatedOrg = {
        id: 'org-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrganizationsService.create.mockResolvedValue(mockCreatedOrg);

      const result = await controller.create(userId, createDto);

      expect(result).toEqual(mockCreatedOrg);
      expect(service.create).toHaveBeenCalledWith(userId, createDto);
    });
  });

  describe('findOne', () => {
    it('should return an organization by slug', async () => {
      const slug = 'org-alpha';
      const userId = 'user-123';

      const mockOrg = {
        id: 'org-1',
        name: 'Org Alpha',
        slug,
        description: 'Test org',
      };

      mockOrganizationsService.findBySlug.mockResolvedValue(mockOrg);

      const result = await controller.findOne(slug, userId);

      expect(result).toEqual(mockOrg);
      expect(service.findBySlug).toHaveBeenCalledWith(slug, userId);
    });
  });

  describe('update', () => {
    it('should update an organization', async () => {
      const slug = 'org-alpha';
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Org',
        description: 'Updated description',
      };

      const mockUpdatedOrg = {
        id: 'org-1',
        slug,
        ...updateDto,
      };

      mockOrganizationsService.update.mockResolvedValue(mockUpdatedOrg);

      const result = await controller.update(slug, 'user-123', updateDto);

      expect(result).toEqual(mockUpdatedOrg);
      expect(service.update).toHaveBeenCalledWith(slug, 'user-123', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete an organization', async () => {
      const slug = 'org-alpha';

      mockOrganizationsService.remove.mockResolvedValue({
        message: 'Organization deleted',
      });

      const result = await controller.remove(slug, 'user-123');

      expect(result).toEqual({ message: 'Organization deleted' });
      expect(service.remove).toHaveBeenCalledWith(slug, 'user-123');
    });
  });

  describe('addMember', () => {
    it('should add a member to organization', async () => {
      const slug = 'org-alpha';
      const addMemberDto = {
        email: 'dev@example.com',
        role: 'MEMBER' as const,
      };

      const mockMember = {
        organizationId: 'org-1',
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockOrganizationsService.addMember.mockResolvedValue(mockMember);

      const result = await controller.addMember(slug, addMemberDto);

      expect(result).toEqual(mockMember);
      expect(service.addMember).toHaveBeenCalledWith(slug, addMemberDto);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from organization', async () => {
      const slug = 'org-alpha';
      const memberId = 'user-456';

      mockOrganizationsService.removeMember.mockResolvedValue({
        message: 'Member removed',
      });

      const result = await controller.removeMember(slug, memberId);

      expect(result).toEqual({ message: 'Member removed' });
      expect(service.removeMember).toHaveBeenCalledWith(slug, memberId);
    });
  });

  describe('getMembers', () => {
    it('should return organization members', async () => {
      const slug = 'org-alpha';

      const mockMembers = [
        {
          userId: 'user-123',
          user: {
            id: 'user-123',
            username: 'alice',
            email: 'alice@example.com',
          },
          role: 'OWNER',
        },
        {
          userId: 'user-456',
          user: { id: 'user-456', username: 'bob', email: 'bob@example.com' },
          role: 'MEMBER',
        },
      ];

      mockOrganizationsService.findMembers.mockResolvedValue(mockMembers);

      const result = await controller.findMembers(slug);

      expect(result).toEqual(mockMembers);
      expect(service.findMembers).toHaveBeenCalledWith(slug);
    });
  });
});
