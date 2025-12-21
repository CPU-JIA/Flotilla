import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectMembersService } from './project-members.service';
import { GitService } from '../git/git.service';
import { PermissionService } from '../common/services/permission.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let _service: ProjectsService;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
  };

  const mockProjectMembersService = {
    findAll: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
  };

  const mockGitService = {
    initRepository: jest.fn(),
    getCommits: jest.fn(),
    getBranches: jest.fn(),
    getFileContent: jest.fn(),
    getTree: jest.fn(),
    getDiff: jest.fn(),
  };

  const mockPermissionService = {
    checkProjectAccess: jest.fn().mockResolvedValue(true),
    checkProjectRole: jest.fn().mockResolvedValue(true),
    getUserProjectRole: jest.fn().mockResolvedValue('OWNER'),
    canAccessProject: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: ProjectMembersService,
          useValue: mockProjectMembersService,
        },
        {
          provide: GitService,
          useValue: mockGitService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
