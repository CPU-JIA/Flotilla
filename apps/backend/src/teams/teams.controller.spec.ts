import { Test, TestingModule } from '@nestjs/testing';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { TeamRoleGuard } from './guards/team-role.guard';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard';

describe('TeamsController', () => {
  let controller: TeamsController;
  let service: TeamsService;

  const mockTeamsService = {
    findAllByUser: jest.fn(),
    create: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
    findMembers: jest.fn(),
    assignProjectPermission: jest.fn(),
    updateProjectPermission: jest.fn(),
    removeProjectPermission: jest.fn(),
    getProjectPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: mockTeamsService,
        },
      ],
    })
      .overrideGuard(TeamRoleGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrganizationRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TeamsController>(TeamsController);
    service = module.get<TeamsService>(TeamsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return user teams', async () => {
      const userId = 'user-123';
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Team Alpha',
          slug: 'team-alpha',
          description: 'Test team',
          organization: { id: 'org-1', name: 'Org', slug: 'org' },
          myRole: 'MAINTAINER',
          memberCount: 5,
          projectCount: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockTeamsService.findAllByUser.mockResolvedValue(mockTeams);

      const result = await controller.findAll(userId);

      expect(result).toEqual(mockTeams);
      expect(service.findAllByUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('create', () => {
    it('should create a new team', async () => {
      const userId = 'user-123';
      const createDto: CreateTeamDto = {
        name: 'New Team',
        slug: 'new-team',
        description: 'A new team',
        organizationSlug: 'org-1',
      };

      const mockCreatedTeam = {
        id: 'team-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTeamsService.create.mockResolvedValue(mockCreatedTeam);

      const result = await controller.create(userId, createDto);

      expect(result).toEqual(mockCreatedTeam);
      expect(service.create).toHaveBeenCalledWith(userId, createDto);
    });
  });

  describe('findOne', () => {
    it('should return a team by slug', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const userId = 'user-123';

      const mockTeam = {
        id: 'team-1',
        name: 'Team Alpha',
        slug: teamSlug,
        description: 'Test team',
        organizationSlug,
      };

      mockTeamsService.findBySlug.mockResolvedValue(mockTeam);

      const result = await controller.findOne(
        organizationSlug,
        teamSlug,
        userId,
      );

      expect(result).toEqual(mockTeam);
      expect(service.findBySlug).toHaveBeenCalledWith(
        organizationSlug,
        teamSlug,
        userId,
      );
    });
  });

  describe('update', () => {
    it('should update a team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const updateDto: UpdateTeamDto = {
        name: 'Updated Team',
        description: 'Updated description',
      };

      const mockUpdatedTeam = {
        id: 'team-1',
        slug: teamSlug,
        ...updateDto,
        organizationSlug,
      };

      mockTeamsService.update.mockResolvedValue(mockUpdatedTeam);

      const result = await controller.update(
        organizationSlug,
        teamSlug,
        updateDto,
      );

      expect(result).toEqual(mockUpdatedTeam);
      expect(service.update).toHaveBeenCalledWith(
        organizationSlug,
        teamSlug,
        updateDto,
      );
    });
  });

  describe('delete', () => {
    it('should delete a team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';

      mockTeamsService.remove.mockResolvedValue({ message: 'Team deleted' });

      const result = await controller.remove(organizationSlug, teamSlug);

      expect(result).toEqual({ message: 'Team deleted' });
      expect(service.remove).toHaveBeenCalledWith(organizationSlug, teamSlug);
    });
  });

  describe('addMember', () => {
    it('should add a member to team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const addMemberDto: AddTeamMemberDto = {
        email: 'user@example.com',
        role: 'MEMBER',
      };

      const mockMember = {
        teamId: 'team-1',
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockTeamsService.addMember.mockResolvedValue(mockMember);

      const result = await controller.addMember(
        organizationSlug,
        teamSlug,
        addMemberDto,
      );

      expect(result).toEqual(mockMember);
      expect(service.addMember).toHaveBeenCalledWith(
        organizationSlug,
        teamSlug,
        addMemberDto,
      );
    });
  });

  describe('removeMember', () => {
    it('should remove a member from team', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';
      const memberId = 'user-456';

      mockTeamsService.removeMember.mockResolvedValue({
        message: 'Member removed',
      });

      const result = await controller.removeMember(
        organizationSlug,
        teamSlug,
        memberId,
      );

      expect(result).toEqual({ message: 'Member removed' });
      expect(service.removeMember).toHaveBeenCalledWith(
        organizationSlug,
        teamSlug,
        memberId,
      );
    });
  });

  describe('getMembers', () => {
    it('should return team members', async () => {
      const organizationSlug = 'org-1';
      const teamSlug = 'team-alpha';

      const mockMembers = [
        {
          userId: 'user-123',
          user: {
            id: 'user-123',
            username: 'alice',
            email: 'alice@example.com',
          },
          role: 'MAINTAINER',
        },
        {
          userId: 'user-456',
          user: { id: 'user-456', username: 'bob', email: 'bob@example.com' },
          role: 'MEMBER',
        },
      ];

      mockTeamsService.findMembers.mockResolvedValue(mockMembers);

      const result = await controller.findMembers(organizationSlug, teamSlug);

      expect(result).toEqual(mockMembers);
      expect(service.findMembers).toHaveBeenCalledWith(
        organizationSlug,
        teamSlug,
      );
    });
  });
});
