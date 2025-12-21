import { Test, TestingModule } from '@nestjs/testing';
import { RepositoriesService } from './repositories.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { GitService } from '../git/git.service';

describe('RepositoriesService', () => {
  let service: RepositoriesService;
  let _prismaService: PrismaService;
  let _minioService: MinioService;
  let _gitService: GitService;

  const mockPrismaService = {
    repository: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    branch: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockMinioService = {
    uploadFile: jest.fn(),
    downloadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockGitService = {
    initRepository: jest.fn(),
    cloneRepository: jest.fn(),
    getCommits: jest.fn(),
    getBranches: jest.fn(),
    createBranch: jest.fn(),
    deleteBranch: jest.fn(),
    getFileContent: jest.fn(),
    getTree: jest.fn(),
    getDiff: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
        {
          provide: GitService,
          useValue: mockGitService,
        },
      ],
    }).compile();

    service = module.get<RepositoriesService>(RepositoriesService);
    prismaService = module.get<PrismaService>(PrismaService);
    minioService = module.get<MinioService>(MinioService);
    gitService = module.get<GitService>(GitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
