import { Test, TestingModule } from '@nestjs/testing';
import { IssuesService } from './issues.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('IssuesService', () => {
  let service: IssuesService;
  let prisma: PrismaService;

  const mockPrisma = {
    issue: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<IssuesService>(IssuesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an issue with auto-incremented number starting from 1', async () => {
      const projectId = 'project-1';
      const authorId = 'user-1';
      const createDto = {
        title: 'Test Issue',
        body: 'Test description',
      };

      mockPrisma.issue.findFirst.mockResolvedValue(null); // No previous issues
      mockPrisma.issue.create.mockResolvedValue({
        id: 'issue-1',
        projectId,
        number: 1,
        title: createDto.title,
        body: createDto.body,
        state: 'OPEN',
        authorId,
        assigneeIds: [],
        labelIds: [],
        milestoneId: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(projectId, authorId, createDto);

      expect(result.number).toBe(1);
      expect(mockPrisma.issue.findFirst).toHaveBeenCalledWith({
        where: { projectId },
        orderBy: { number: 'desc' },
      });
    });

    it('should increment issue number within the same project', async () => {
      const projectId = 'project-1';
      const authorId = 'user-1';

      mockPrisma.issue.findFirst.mockResolvedValue({ number: 5 }); // Last issue was #5
      mockPrisma.issue.create.mockResolvedValue({
        id: 'issue-6',
        projectId,
        number: 6,
        title: 'Test Issue',
        state: 'OPEN',
        authorId,
        assigneeIds: [],
        labelIds: [],
        milestoneId: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(projectId, authorId, {
        title: 'Test Issue',
      });

      expect(result.number).toBe(6);
    });

    it('should handle assignees and labels', async () => {
      const projectId = 'project-1';
      const authorId = 'user-1';
      const createDto = {
        title: 'Test Issue',
        assigneeIds: ['user-2', 'user-3'],
        labelIds: ['label-1', 'label-2'],
      };

      mockPrisma.issue.findFirst.mockResolvedValue(null);
      mockPrisma.issue.create.mockResolvedValue({
        id: 'issue-1',
        projectId,
        number: 1,
        ...createDto,
        state: 'OPEN',
        authorId,
        milestoneId: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(projectId, authorId, createDto);

      expect(result.assigneeIds).toEqual(['user-2', 'user-3']);
      expect(result.labelIds).toEqual(['label-1', 'label-2']);
    });
  });

  describe('findAll', () => {
    it('should return paginated issues', async () => {
      const projectId = 'project-1';
      const mockIssues = [
        { id: '1', number: 1, title: 'Issue 1', state: 'OPEN' },
        { id: '2', number: 2, title: 'Issue 2', state: 'OPEN' },
      ];

      mockPrisma.issue.findMany.mockResolvedValue(mockIssues);
      mockPrisma.issue.count.mockResolvedValue(2);

      const result = await service.findAll(projectId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter issues by state', async () => {
      const projectId = 'project-1';
      mockPrisma.issue.findMany.mockResolvedValue([]);
      mockPrisma.issue.count.mockResolvedValue(0);

      await service.findAll(projectId, { state: 'CLOSED' });

      expect(mockPrisma.issue.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ state: 'CLOSED' }),
        skip: 0,
        take: 20,
        include: expect.anything(),
        orderBy: expect.anything(),
      });
    });
  });

  describe('findOne', () => {
    it('should return an issue by project and number', async () => {
      const projectId = 'project-1';
      const number = 1;
      const mockIssue = {
        id: 'issue-1',
        projectId,
        number,
        title: 'Test Issue',
        state: 'OPEN',
      };

      mockPrisma.issue.findUnique.mockResolvedValue(mockIssue);

      const result = await service.findOne(projectId, number);

      expect(result).toEqual(mockIssue);
      expect(mockPrisma.issue.findUnique).toHaveBeenCalledWith({
        where: { projectId_number: { projectId, number } },
        include: expect.anything(),
      });
    });

    it('should throw NotFoundException if issue does not exist', async () => {
      mockPrisma.issue.findUnique.mockResolvedValue(null);

      await expect(service.findOne('project-1', 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an issue', async () => {
      const projectId = 'project-1';
      const number = 1;
      const updateDto = { title: 'Updated Title' };
      const mockIssue = {
        id: 'issue-1',
        projectId,
        number,
        authorId: 'user-1',
        title: 'Old Title',
      };

      mockPrisma.issue.findUnique.mockResolvedValue(mockIssue);
      mockPrisma.issue.update.mockResolvedValue({
        ...mockIssue,
        ...updateDto,
      });

      const result = await service.update(
        projectId,
        number,
        'user-1',
        updateDto,
      );

      expect(result.title).toBe('Updated Title');
    });
  });

  describe('close', () => {
    it('should close an open issue', async () => {
      const projectId = 'project-1';
      const number = 1;
      const mockIssue = {
        id: 'issue-1',
        projectId,
        number,
        state: 'OPEN',
        closedAt: null,
      };

      mockPrisma.issue.findUnique.mockResolvedValue(mockIssue);
      mockPrisma.issue.update.mockResolvedValue({
        ...mockIssue,
        state: 'CLOSED',
        closedAt: new Date(),
      });

      const result = await service.close(projectId, number);

      expect(result.state).toBe('CLOSED');
      expect(result.closedAt).toBeDefined();
    });
  });
});
