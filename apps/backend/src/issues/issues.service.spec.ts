import { Test, TestingModule } from '@nestjs/testing';
import { IssuesService } from './issues.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhookService } from '../webhooks/webhooks.service';
import { NotFoundException } from '@nestjs/common';

describe('IssuesService', () => {
  let service: IssuesService;
  let _prisma: PrismaService;

  const mockPrisma = {
    issue: {
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
    $queryRaw: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn(),
    notifyIssueCreated: jest.fn(),
    notifyIssueUpdated: jest.fn(),
    notifyIssueClosed: jest.fn(),
    notifyIssueAssigned: jest.fn(),
    notifyIssueCommented: jest.fn(),
    createBatch: jest.fn(),
  };

  const mockWebhookService = {
    triggerWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
      ],
    }).compile();

    service = module.get<IssuesService>(IssuesService);
    _prisma = module.get<PrismaService>(PrismaService);
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
      mockPrisma.$queryRaw.mockResolvedValue([{ nextissuenumber: 1 }]);
      mockPrisma.issue.create.mockResolvedValue({
        id: 'issue-1',
        projectId,
        number: 1,
        title: createDto.title,
        body: createDto.body,
        state: 'OPEN',
        authorId,
        assignees: [],
        labels: [],
        milestoneId: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(projectId, authorId, createDto);

      expect(result.number).toBe(1);
    });

    it('should increment issue number within the same project', async () => {
      const projectId = 'project-1';
      const authorId = 'user-1';

      mockPrisma.$queryRaw.mockResolvedValue([{ nextissuenumber: 6 }]);
      mockPrisma.issue.create.mockResolvedValue({
        id: 'issue-6',
        projectId,
        number: 6,
        title: 'Test Issue',
        state: 'OPEN',
        authorId,
        body: null,
        labels: [],
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
      mockPrisma.$queryRaw.mockResolvedValue([{ nextissuenumber: 1 }]);
      mockPrisma.issue.create.mockResolvedValue({
        id: 'issue-1',
        projectId,
        number: 1,
        title: createDto.title,
        body: null,
        state: 'OPEN',
        authorId,
        milestoneId: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignees: [
          {
            userId: 'user-2',
            user: { id: 'user-2', username: 'user2', email: 'user2@test.com' },
          },
          {
            userId: 'user-3',
            user: { id: 'user-3', username: 'user3', email: 'user3@test.com' },
          },
        ],
        labels: [
          {
            labelId: 'label-1',
            label: {
              id: 'label-1',
              name: 'bug',
              color: '#ff0000',
              description: 'Bug report',
            },
          },
          {
            labelId: 'label-2',
            label: {
              id: 'label-2',
              name: 'feature',
              color: '#00ff00',
              description: 'Feature request',
            },
          },
        ],
      });

      const result = await service.create(projectId, authorId, createDto);

      expect((result as any).assignees).toHaveLength(2);
      expect((result as any).labels).toHaveLength(2);
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
