import { Test, TestingModule } from '@nestjs/testing';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';

describe('RepositoriesController', () => {
  let controller: RepositoriesController;
  let service: RepositoriesService;

  const mockRepositoriesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    createBranch: jest.fn(),
    deleteBranch: jest.fn(),
    getBranches: jest.fn(),
    getFiles: jest.fn(),
    downloadFile: jest.fn(),
    createCommit: jest.fn(),
    getCommits: jest.fn(),
    getCommit: jest.fn(),
    getCommitDiff: jest.fn(),
    getCommitFiles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepositoriesController],
      providers: [
        {
          provide: RepositoriesService,
          useValue: mockRepositoriesService,
        },
      ],
    }).compile();

    controller = module.get<RepositoriesController>(RepositoriesController);
    service = module.get<RepositoriesService>(RepositoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
