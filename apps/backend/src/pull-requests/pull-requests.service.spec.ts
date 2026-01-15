import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PullRequestsService } from './pull-requests.service';
import { PrismaService } from '../prisma/prisma.service';
import { GitService } from '../git/git.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BranchProtectionService } from '../branch-protection/branch-protection.service';
import { PRMergeService } from './pr-merge.service';
import { PRReviewService } from './pr-review.service';
import { CreatePullRequestDto } from './dto/create-pull-request.dto';
import {
  MergePullRequestDto,
  MergeStrategy,
} from './dto/merge-pull-request.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { PullRequestCreateCommentDto } from './dto/create-comment.dto';
import { PRState } from '@prisma/client';

describe('PullRequestsService', () => {
  let service: PullRequestsService;
  let _prisma: PrismaService;
  let _gitService: GitService;

  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
    },
    pullRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    pREvent: {
      create: jest.fn(),
    },
    pRReview: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pRComment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockGitService = {
    mergeCommit: jest.fn(),
    squashMerge: jest.fn(),
    rebaseMerge: jest.fn(),
    getDiff: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn(),
    notifyPullRequestCreated: jest.fn(),
    notifyPullRequestMerged: jest.fn(),
    notifyPullRequestReviewed: jest.fn(),
    notifyPullRequestCommented: jest.fn(),
  };

  const mockBranchProtectionService = {
    checkBranchProtection: jest.fn().mockResolvedValue({ allowed: true }),
    validateMergeRequirements: jest.fn().mockResolvedValue({ valid: true }),
    getBranchProtectionRules: jest.fn().mockResolvedValue([]),
    findByBranch: jest.fn().mockResolvedValue(null),
    findByProject: jest.fn().mockResolvedValue([]),
    checkMergePermission: jest.fn().mockResolvedValue({ allowed: true }),
  };

  const mockPRMergeService = {
    merge: jest.fn(),
    canMergePR: jest.fn(),
  };

  const mockPRReviewService = {
    addReview: jest.fn(),
    getReviewSummary: jest.fn(),
    addComment: jest.fn(),
    getComments: jest.fn(),
    getReviews: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PullRequestsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: GitService,
          useValue: mockGitService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: BranchProtectionService,
          useValue: mockBranchProtectionService,
        },
        {
          provide: PRMergeService,
          useValue: mockPRMergeService,
        },
        {
          provide: PRReviewService,
          useValue: mockPRReviewService,
        },
      ],
    }).compile();

    service = module.get<PullRequestsService>(PullRequestsService);
    _prisma = module.get<PrismaService>(PrismaService);
    _gitService = module.get<GitService>(GitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreatePullRequestDto = {
      projectId: 'proj-1',
      title: 'Test PR',
      body: 'Test body',
      sourceBranch: 'feature',
      targetBranch: 'main',
    };
    const authorId = 'user-1';

    it('should create first PR with number 1', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ nextprnumber: 1 }]);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
      });
      mockPrisma.pullRequest.create.mockResolvedValue({
        id: 'pr-1',
        projectId: 'proj-1',
        number: 1,
        title: createDto.title,
        body: createDto.body,
        sourceBranch: createDto.sourceBranch,
        targetBranch: createDto.targetBranch,
        state: PRState.OPEN,
        authorId,
        mergedAt: null,
        mergedBy: null,
        mergeCommit: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: authorId,
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        },
        project: {
          id: 'proj-1',
          name: 'Test Project',
        },
      });
      mockPrisma.pREvent.create.mockResolvedValue({
        id: 'event-1',
        pullRequestId: 'pr-1',
        actorId: authorId,
        event: 'opened',
        metadata: null,
        createdAt: new Date(),
      });

      const result = await service.create(authorId, createDto);

      expect(result.number).toBe(1);
      expect(result.state).toBe(PRState.OPEN);
      expect(mockPrisma.pREvent.create).toHaveBeenCalledWith({
        data: {
          pullRequestId: 'pr-1',
          actorId: authorId,
          event: 'opened',
        },
      });
    });

    it('should auto-increment PR number within same project', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ nextprnumber: 6 }]);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
      });
      mockPrisma.pullRequest.create.mockResolvedValue({
        id: 'pr-6',
        projectId: 'proj-1',
        number: 6,
        title: createDto.title,
        state: PRState.OPEN,
        authorId,
        sourceBranch: createDto.sourceBranch,
        targetBranch: createDto.targetBranch,
        mergedAt: null,
        mergedBy: null,
        mergeCommit: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: authorId,
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        },
        project: { id: 'proj-1', name: 'Test Project' },
      });
      mockPrisma.pREvent.create.mockResolvedValue({});

      const result = await service.create(authorId, createDto);

      expect(result.number).toBe(6);
    });

    it('should throw error if source and target branches are same', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
      });

      const invalidDto = {
        ...createDto,
        sourceBranch: 'main',
        targetBranch: 'main',
      };

      await expect(service.create(authorId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(authorId, invalidDto)).rejects.toThrow(
        'Source and target branches cannot be the same',
      );
    });

    it('should throw error if project not found', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(service.create(authorId, createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(authorId, createDto)).rejects.toThrow(
        'Project proj-1 not found',
      );
    });

    it('should create opened event', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ nextprnumber: 1 }]);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
      });
      mockPrisma.pullRequest.create.mockResolvedValue({
        id: 'pr-1',
        number: 1,
        projectId: 'proj-1',
        title: createDto.title,
        state: PRState.OPEN,
        authorId,
        sourceBranch: createDto.sourceBranch,
        targetBranch: createDto.targetBranch,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: authorId,
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        },
        project: { id: 'proj-1', name: 'Test Project' },
      });
      mockPrisma.pREvent.create.mockResolvedValue({
        id: 'event-1',
        pullRequestId: 'pr-1',
        actorId: authorId,
        event: 'opened',
      });

      await service.create(authorId, createDto);

      expect(mockPrisma.pREvent.create).toHaveBeenCalledWith({
        data: {
          pullRequestId: 'pr-1',
          actorId: authorId,
          event: 'opened',
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all PRs without state filter', async () => {
      const mockPRs = [
        { id: 'pr-1', number: 1, title: 'PR 1', state: PRState.OPEN },
        { id: 'pr-2', number: 2, title: 'PR 2', state: PRState.MERGED },
      ];

      mockPrisma.pullRequest.findMany.mockResolvedValue(mockPRs);

      const result = await service.findAll('proj-1');

      expect(result).toEqual(mockPRs);
      expect(mockPrisma.pullRequest.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        include: expect.anything(),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter PRs by state', async () => {
      const mockPRs = [
        { id: 'pr-1', number: 1, title: 'PR 1', state: PRState.OPEN },
      ];

      mockPrisma.pullRequest.findMany.mockResolvedValue(mockPRs);

      await service.findAll('proj-1', PRState.OPEN);

      expect(mockPrisma.pullRequest.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1', state: PRState.OPEN },
        include: expect.anything(),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should order by createdAt desc', async () => {
      mockPrisma.pullRequest.findMany.mockResolvedValue([]);

      await service.findAll('proj-1');

      expect(mockPrisma.pullRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return PR with all relations', async () => {
      const mockPR = {
        id: 'pr-1',
        projectId: 'proj-1',
        number: 1,
        title: 'Test PR',
        state: PRState.OPEN,
        author: { id: 'user-1', username: 'testuser' },
        reviews: [],
        comments: [],
        events: [],
      };

      mockPrisma.pullRequest.findUnique.mockResolvedValue(mockPR);

      const result = await service.findOne('pr-1');

      expect(result).toEqual(mockPR);
      expect(mockPrisma.pullRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'pr-1' },
        include: expect.objectContaining({
          author: expect.anything(),
          reviews: expect.anything(),
          comments: expect.anything(),
          events: expect.anything(),
        }),
      });
    });

    it('should throw NotFoundException if PR not found', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue(null);

      await expect(service.findOne('pr-999')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('pr-999')).rejects.toThrow(
        'Pull request pr-999 not found',
      );
    });
  });

  describe('findByNumber', () => {
    it('should query using projectId_number composite key', async () => {
      const mockPR = {
        id: 'pr-1',
        projectId: 'proj-1',
        number: 1,
        title: 'Test PR',
        state: PRState.OPEN,
      };

      mockPrisma.pullRequest.findUnique.mockResolvedValue(mockPR);

      const result = await service.findByNumber('proj-1', 1);

      expect(result).toEqual(mockPR);
      expect(mockPrisma.pullRequest.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_number: {
            projectId: 'proj-1',
            number: 1,
          },
        },
        include: expect.anything(),
      });
    });

    it('should throw NotFoundException if PR not found', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue(null);

      await expect(service.findByNumber('proj-1', 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('merge', () => {
    const prId = 'pr-1';
    const userId = 'user-2';
    const mockPR = {
      id: prId,
      projectId: 'proj-1',
      number: 1,
      title: 'Test PR',
      body: 'Test body',
      sourceBranch: 'feature',
      targetBranch: 'main',
      state: PRState.OPEN,
      authorId: 'user-1',
      project: { id: 'proj-1', name: 'Test Project' },
      author: {
        id: 'user-1',
        username: 'author',
        email: 'author@example.com',
        avatar: null,
      },
    };
    const mockMerger = {
      username: 'merger',
      email: 'merger@example.com',
    };

    beforeEach(() => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue(mockPR);
      mockPrisma.user.findUnique.mockResolvedValue(mockMerger);
      mockPrisma.pullRequest.update.mockResolvedValue({
        ...mockPR,
        state: PRState.MERGED,
        mergedAt: new Date(),
        mergedBy: userId,
        mergeCommit: 'abc123',
      });
      mockPrisma.pREvent.create.mockResolvedValue({});
      // 设置 PRMergeService mock 返回值
      mockPRMergeService.merge.mockResolvedValue({
        ...mockPR,
        state: PRState.MERGED,
        mergedAt: new Date(),
        mergedBy: userId,
        mergeCommit: 'abc123',
      });
    });

    it('should merge PR with MERGE strategy', async () => {
      const dto: MergePullRequestDto = { strategy: MergeStrategy.MERGE };

      const result = await service.merge(prId, userId, dto);

      expect(result.state).toBe(PRState.MERGED);
      expect(result.mergeCommit).toBe('abc123');
      expect(mockPRMergeService.merge).toHaveBeenCalledWith(prId, userId, dto);
    });

    it('should merge PR with SQUASH strategy', async () => {
      const dto: MergePullRequestDto = { strategy: MergeStrategy.SQUASH };

      await service.merge(prId, userId, dto);

      expect(mockPRMergeService.merge).toHaveBeenCalledWith(prId, userId, dto);
    });

    it('should merge PR with REBASE strategy', async () => {
      const dto: MergePullRequestDto = { strategy: MergeStrategy.REBASE };

      await service.merge(prId, userId, dto);

      expect(mockPRMergeService.merge).toHaveBeenCalledWith(prId, userId, dto);
    });

    it('should throw error if PR is not OPEN', async () => {
      const dto: MergePullRequestDto = { strategy: MergeStrategy.MERGE };

      mockPRMergeService.merge.mockRejectedValue(
        new BadRequestException('PR is not open'),
      );

      await expect(service.merge(prId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.merge(prId, userId, dto)).rejects.toThrow(
        'PR is not open',
      );
    });

    it('should throw InternalServerErrorException if Git merge fails', async () => {
      const dto: MergePullRequestDto = { strategy: MergeStrategy.MERGE };

      mockPRMergeService.merge.mockRejectedValue(
        new InternalServerErrorException('Merge failed'),
      );

      await expect(service.merge(prId, userId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.merge(prId, userId, dto)).rejects.toThrow(
        'Merge failed',
      );
    });

    it('should update PR state and timestamps after successful merge', async () => {
      const dto: MergePullRequestDto = { strategy: MergeStrategy.MERGE };

      const result = await service.merge(prId, userId, dto);

      expect(result.state).toBe(PRState.MERGED);
      expect(mockPRMergeService.merge).toHaveBeenCalledWith(prId, userId, dto);
    });

    it('should create merged event', async () => {
      const dto: MergePullRequestDto = {
        strategy: MergeStrategy.SQUASH,
        commitMessage: 'Custom message',
      };

      await service.merge(prId, userId, dto);

      expect(mockPRMergeService.merge).toHaveBeenCalledWith(prId, userId, dto);
    });
  });

  describe('addReview', () => {
    const prId = 'pr-1';
    const reviewerId = 'user-2';
    const mockPR = {
      id: prId,
      state: PRState.OPEN,
    };

    it('should create review successfully', async () => {
      const dto: CreateReviewDto = {
        state: 'APPROVED' as any,
        body: 'LGTM',
      };

      const mockReview = {
        id: 'review-1',
        pullRequestId: prId,
        reviewerId,
        state: 'APPROVED',
        body: dto.body,
        createdAt: new Date(),
        reviewer: {
          id: reviewerId,
          username: 'reviewer',
          avatar: null,
        },
      };

      mockPRReviewService.addReview.mockResolvedValue(mockReview);

      const result = await service.addReview(prId, reviewerId, dto);

      expect(result.state).toBe('APPROVED');
      expect(mockPRReviewService.addReview).toHaveBeenCalledWith(
        prId,
        reviewerId,
        dto,
      );
    });

    it('should throw error if PR is not OPEN', async () => {
      const dto: CreateReviewDto = {
        state: 'APPROVED' as any,
      };

      mockPRReviewService.addReview.mockRejectedValue(
        new BadRequestException('Cannot review a closed or merged PR'),
      );

      await expect(service.addReview(prId, reviewerId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addReview(prId, reviewerId, dto)).rejects.toThrow(
        'Cannot review a closed or merged PR',
      );
    });

    it('should throw NotFoundException if PR not found', async () => {
      const dto: CreateReviewDto = {
        state: 'APPROVED' as any,
      };

      mockPRReviewService.addReview.mockRejectedValue(
        new NotFoundException('Pull request not found'),
      );

      await expect(service.addReview(prId, reviewerId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create reviewed event', async () => {
      const dto: CreateReviewDto = {
        state: 'CHANGES_REQUESTED' as any,
        body: 'Please fix this',
      };

      const mockReview = {
        id: 'review-1',
        pullRequestId: prId,
        reviewerId,
        state: 'CHANGES_REQUESTED',
        body: dto.body,
        createdAt: new Date(),
        reviewer: { id: reviewerId, username: 'reviewer', avatar: null },
      };

      mockPRReviewService.addReview.mockResolvedValue(mockReview);

      await service.addReview(prId, reviewerId, dto);

      expect(mockPRReviewService.addReview).toHaveBeenCalledWith(
        prId,
        reviewerId,
        dto,
      );
    });
  });

  describe('addComment', () => {
    const prId = 'pr-1';
    const authorId = 'user-2';

    it('should create general comment', async () => {
      const dto: PullRequestCreateCommentDto = {
        body: 'This is a comment',
      };

      const mockComment = {
        id: 'comment-1',
        pullRequestId: prId,
        authorId,
        body: dto.body,
        filePath: null,
        lineNumber: null,
        commitHash: null,
        createdAt: new Date(),
        author: {
          id: authorId,
          username: 'commenter',
          avatar: null,
        },
      };

      mockPRReviewService.addComment.mockResolvedValue(mockComment);

      const result = await service.addComment(prId, authorId, dto);

      expect(result.body).toBe(dto.body);
      expect(result.filePath).toBeNull();
      expect(result.lineNumber).toBeNull();
      expect(mockPRReviewService.addComment).toHaveBeenCalledWith(
        prId,
        authorId,
        dto,
      );
    });

    it('should create line-specific comment', async () => {
      const dto: PullRequestCreateCommentDto = {
        body: 'Fix this line',
        filePath: 'src/index.ts',
        lineNumber: 42,
        commitHash: 'abc123',
      };

      const mockComment = {
        id: 'comment-2',
        pullRequestId: prId,
        authorId,
        body: dto.body,
        filePath: dto.filePath,
        lineNumber: dto.lineNumber,
        commitHash: dto.commitHash,
        createdAt: new Date(),
        author: { id: authorId, username: 'commenter', avatar: null },
      };

      mockPRReviewService.addComment.mockResolvedValue(mockComment);

      const result = await service.addComment(prId, authorId, dto);

      expect(result.filePath).toBe('src/index.ts');
      expect(result.lineNumber).toBe(42);
      expect(result.commitHash).toBe('abc123');
      expect(mockPRReviewService.addComment).toHaveBeenCalledWith(
        prId,
        authorId,
        dto,
      );
    });

    it('should throw NotFoundException if PR not found', async () => {
      const dto: PullRequestCreateCommentDto = {
        body: 'Comment',
      };

      mockPRReviewService.addComment.mockRejectedValue(
        new NotFoundException('Pull request not found'),
      );

      await expect(service.addComment(prId, authorId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getReviewSummary', () => {
    const prId = 'pr-1';

    it('should aggregate latest reviews per reviewer', async () => {
      const mockReviews = [
        {
          id: 'review-3',
          pullRequestId: prId,
          reviewerId: 'user-1',
          state: 'APPROVED',
          createdAt: new Date('2025-10-25T12:00:00Z'),
          reviewer: { id: 'user-1', username: 'reviewer1', avatar: null },
        },
        {
          id: 'review-2',
          pullRequestId: prId,
          reviewerId: 'user-1',
          state: 'CHANGES_REQUESTED',
          createdAt: new Date('2025-10-25T11:00:00Z'),
          reviewer: { id: 'user-1', username: 'reviewer1', avatar: null },
        },
        {
          id: 'review-1',
          pullRequestId: prId,
          reviewerId: 'user-2',
          state: 'COMMENTED',
          createdAt: new Date('2025-10-25T10:00:00Z'),
          reviewer: { id: 'user-2', username: 'reviewer2', avatar: null },
        },
      ];

      const mockSummary = {
        totalReviewers: 2,
        approved: 1,
        commented: 1,
        changesRequested: 0,
        reviewers: [
          { id: 'user-1', username: 'reviewer1', state: 'APPROVED' },
          { id: 'user-2', username: 'reviewer2', state: 'COMMENTED' },
        ],
      };

      mockPRReviewService.getReviewSummary.mockResolvedValue(mockSummary);

      const result = await service.getReviewSummary(prId);

      expect(result.totalReviewers).toBe(2);
      expect(result.approved).toBe(1);
      expect(result.commented).toBe(1);
      expect(result.changesRequested).toBe(0);
      expect(result.reviewers).toHaveLength(2);
      expect(result.reviewers[0].id).toBe('user-1');
      expect(result.reviewers[0].state).toBe('APPROVED');
      expect(mockPRReviewService.getReviewSummary).toHaveBeenCalledWith(prId);
    });

    it('should count reviews by state correctly', async () => {
      const mockSummary = {
        totalReviewers: 3,
        approved: 2,
        changesRequested: 1,
        commented: 0,
        reviewers: [
          { id: 'user-1', username: 'r1', state: 'APPROVED' },
          { id: 'user-2', username: 'r2', state: 'APPROVED' },
          { id: 'user-3', username: 'r3', state: 'CHANGES_REQUESTED' },
        ],
      };

      mockPRReviewService.getReviewSummary.mockResolvedValue(mockSummary);

      const result = await service.getReviewSummary(prId);

      expect(result.approved).toBe(2);
      expect(result.changesRequested).toBe(1);
      expect(result.commented).toBe(0);
      expect(mockPRReviewService.getReviewSummary).toHaveBeenCalledWith(prId);
    });
  });

  describe('canMergePR', () => {
    const prId = 'pr-1';
    const userId = 'user-merger';
    const authorId = 'user-author';

    it('should block merge with active change requests', async () => {
      const mockResult = {
        allowed: false,
        reason: 'Cannot merge with active change requests',
        hasChangeRequests: true,
        approvalCount: 0,
        requiredApprovals: 1,
      };

      mockPRMergeService.canMergePR.mockResolvedValue(mockResult);

      const result = await service.canMergePR(prId, userId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('change requests');
      expect(result.hasChangeRequests).toBe(true);
      expect(mockPRMergeService.canMergePR).toHaveBeenCalledWith(prId, userId);
    });

    it('should block merge with insufficient approvals', async () => {
      const mockResult = {
        allowed: false,
        reason: 'Need 1 more approval',
        approvalCount: 1,
        requiredApprovals: 2,
        hasChangeRequests: false,
      };

      mockPRMergeService.canMergePR.mockResolvedValue(mockResult);

      const result = await service.canMergePR(prId, userId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('1 more approval');
      expect(result.approvalCount).toBe(1);
      expect(result.requiredApprovals).toBe(2);
      expect(mockPRMergeService.canMergePR).toHaveBeenCalledWith(prId, userId);
    });

    it('should block self-merge when disallowed', async () => {
      const mockResult = {
        allowed: false,
        reason: 'Cannot merge your own PR',
        hasChangeRequests: false,
        approvalCount: 1,
        requiredApprovals: 1,
      };

      mockPRMergeService.canMergePR.mockResolvedValue(mockResult);

      const result = await service.canMergePR(prId, authorId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('own PR');
      expect(mockPRMergeService.canMergePR).toHaveBeenCalledWith(
        prId,
        authorId,
      );
    });

    it('should require owner approval when configured', async () => {
      const ownerId = 'owner-1';
      const mockResult = {
        allowed: false,
        reason: 'Requires owner approval',
        hasChangeRequests: false,
        approvalCount: 1,
        requiredApprovals: 1,
      };

      mockPRMergeService.canMergePR.mockResolvedValue(mockResult);

      const result = await service.canMergePR(prId, userId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('owner approval');
      expect(mockPRMergeService.canMergePR).toHaveBeenCalledWith(prId, userId);
    });

    it('should allow merge when all rules pass', async () => {
      const mockResult = {
        allowed: true,
        approvalCount: 1,
        requiredApprovals: 1,
        hasChangeRequests: false,
      };

      mockPRMergeService.canMergePR.mockResolvedValue(mockResult);

      const result = await service.canMergePR(prId, userId);

      expect(result.allowed).toBe(true);
      expect(result.approvalCount).toBe(1);
      expect(result.requiredApprovals).toBe(1);
      expect(result.hasChangeRequests).toBe(false);
      expect(mockPRMergeService.canMergePR).toHaveBeenCalledWith(prId, userId);
    });

    it('should throw NotFoundException if PR not found', async () => {
      mockPRMergeService.canMergePR.mockRejectedValue(
        new NotFoundException('Pull request not found'),
      );

      await expect(service.canMergePR(prId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDiff', () => {
    const prId = 'pr-1';

    it('should return diff with line-level comments', async () => {
      const mockPR = {
        id: prId,
        projectId: 'proj-1',
        sourceBranch: 'feature',
        targetBranch: 'main',
      };

      const mockDiff = {
        files: [
          {
            path: 'src/index.ts',
            status: 'modified',
            additions: 10,
            deletions: 5,
            patch: '@@ -1,5 +1,10 @@...',
          },
        ],
        summary: {
          totalFiles: 1,
          totalAdditions: 10,
          totalDeletions: 5,
        },
      };

      const mockComments = [
        {
          id: 'comment-1',
          pullRequestId: prId,
          authorId: 'user-1',
          body: 'Fix this line',
          filePath: 'src/index.ts',
          lineNumber: 42,
          commitHash: 'abc123',
          createdAt: new Date(),
          author: { id: 'user-1', username: 'commenter', avatar: null },
        },
      ];

      mockPrisma.pullRequest.findUnique.mockResolvedValue(mockPR);
      mockGitService.getDiff.mockResolvedValue(mockDiff);
      mockPrisma.pRComment.findMany.mockResolvedValue(mockComments);

      const result = await service.getDiff(prId);

      expect(result.files).toEqual(mockDiff.files);
      expect(result.summary).toEqual(mockDiff.summary);
      expect(result.comments).toEqual(mockComments);
      expect(mockGitService.getDiff).toHaveBeenCalledWith(
        'proj-1',
        'feature',
        'main',
      );
      expect(mockPrisma.pRComment.findMany).toHaveBeenCalledWith({
        where: {
          pullRequestId: prId,
          filePath: { not: null },
        },
        include: expect.anything(),
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should throw NotFoundException if PR not found', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue(null);

      await expect(service.getDiff(prId)).rejects.toThrow(NotFoundException);
      await expect(service.getDiff(prId)).rejects.toThrow(
        `Pull request ${prId} not found`,
      );
    });
  });

  describe('close', () => {
    const prId = 'pr-1';
    const userId = 'user-2';
    const mockPR = {
      id: prId,
      number: 1,
      projectId: 'proj-1',
      authorId: 'user-1',
      state: PRState.OPEN,
      author: {
        id: 'user-1',
        username: 'author',
      },
    };

    it('should successfully close an open PR', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue(mockPR);
      mockPrisma.pullRequest.update.mockResolvedValue({
        ...mockPR,
        state: PRState.CLOSED,
        closedAt: new Date(),
      });
      mockPrisma.pREvent.create.mockResolvedValue({});

      const result = await service.close(prId, userId);

      expect(result.state).toBe(PRState.CLOSED);
      expect(mockPrisma.pullRequest.update).toHaveBeenCalledWith({
        where: { id: prId },
        data: {
          state: PRState.CLOSED,
          closedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.pREvent.create).toHaveBeenCalledWith({
        data: {
          pullRequestId: prId,
          actorId: userId,
          event: 'closed',
        },
      });
    });

    it('should throw NotFoundException if PR not found', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue(null);

      await expect(service.close(prId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if PR is already closed', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue({
        ...mockPR,
        state: PRState.CLOSED,
      });

      await expect(service.close(prId, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.close(prId, userId)).rejects.toThrow(
        'PR is already closed or merged',
      );
    });

    it('should throw BadRequestException if PR is already merged', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue({
        ...mockPR,
        state: PRState.MERGED,
      });

      await expect(service.close(prId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const prId = 'pr-1';
    const userId = 'user-1';
    const mockPR = {
      id: prId,
      authorId: userId,
      state: PRState.OPEN,
      title: 'Original Title',
      body: 'Original Body',
    };

    it('should successfully update PR title and body', async () => {
      const updateDto = {
        title: 'Updated Title',
        body: 'Updated Body',
      };

      mockPrisma.pullRequest.findUnique.mockResolvedValue(mockPR);
      mockPrisma.pullRequest.update.mockResolvedValue({
        ...mockPR,
        ...updateDto,
        author: {
          id: userId,
          username: 'author',
          avatar: null,
        },
      });

      const result = await service.update(prId, userId, updateDto);

      expect(result.title).toBe('Updated Title');
      expect(result.body).toBe('Updated Body');
      expect(mockPrisma.pullRequest.update).toHaveBeenCalledWith({
        where: { id: prId },
        data: updateDto,
        include: expect.anything(),
      });
    });

    it('should throw NotFoundException if PR not found', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.update(prId, userId, { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue({
        ...mockPR,
        authorId: 'other-user',
      });

      await expect(
        service.update(prId, userId, { title: 'New Title' }),
      ).rejects.toThrow('Only the author can update this PR');
    });

    it('should throw BadRequestException if PR is not OPEN', async () => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue({
        ...mockPR,
        state: PRState.MERGED,
      });

      await expect(
        service.update(prId, userId, { title: 'New Title' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(prId, userId, { title: 'New Title' }),
      ).rejects.toThrow('Cannot update a closed or merged PR');
    });
  });

  describe('getComments', () => {
    const prId = 'pr-1';

    it('should return all comments ordered by createdAt ascending', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          pullRequestId: prId,
          body: 'First comment',
          createdAt: new Date('2025-01-01'),
          author: { id: 'user-1', username: 'user1', avatar: null },
        },
        {
          id: 'comment-2',
          pullRequestId: prId,
          body: 'Second comment',
          createdAt: new Date('2025-01-02'),
          author: { id: 'user-2', username: 'user2', avatar: null },
        },
      ];

      mockPRReviewService.getComments.mockResolvedValue(mockComments);

      const result = await service.getComments(prId);

      expect(result).toEqual(mockComments);
      expect(mockPRReviewService.getComments).toHaveBeenCalledWith(prId);
    });
  });

  describe('getReviews', () => {
    const prId = 'pr-1';

    it('should return all reviews ordered by createdAt descending', async () => {
      const mockReviews = [
        {
          id: 'review-2',
          pullRequestId: prId,
          state: 'APPROVED',
          createdAt: new Date('2025-01-02'),
          reviewer: { id: 'user-2', username: 'reviewer2', avatar: null },
        },
        {
          id: 'review-1',
          pullRequestId: prId,
          state: 'COMMENTED',
          createdAt: new Date('2025-01-01'),
          reviewer: { id: 'user-1', username: 'reviewer1', avatar: null },
        },
      ];

      mockPRReviewService.getReviews.mockResolvedValue(mockReviews);

      const result = await service.getReviews(prId);

      expect(result).toEqual(mockReviews);
      expect(mockPRReviewService.getReviews).toHaveBeenCalledWith(prId);
    });
  });

  describe('Branch Protection', () => {
    const prId = 'pr-1';
    const userId = 'user-2';
    const mockPR = {
      id: prId,
      projectId: 'proj-1',
      number: 1,
      title: 'Test PR',
      body: 'Test body',
      sourceBranch: 'feature',
      targetBranch: 'main',
      state: PRState.OPEN,
      authorId: 'user-1',
      project: { id: 'proj-1', name: 'Test Project' },
      author: {
        id: 'user-1',
        username: 'author',
        email: 'author@example.com',
        avatar: null,
      },
    };

    const mockMergedPR = {
      ...mockPR,
      state: PRState.MERGED,
      mergedAt: new Date(),
      mergedById: userId,
    };

    beforeEach(() => {
      mockPrisma.pullRequest.findUnique.mockResolvedValue(mockPR);
      mockPrisma.user.findUnique.mockResolvedValue({
        username: 'merger',
        email: 'merger@example.com',
      });
      mockPrisma.pREvent.create.mockResolvedValue({});
      // 默认设置 merge 成功返回
      mockPRMergeService.merge.mockResolvedValue(mockMergedPR);
    });

    it('should enforce branch protection rules during merge', async () => {
      const dto: MergePullRequestDto = { strategy: MergeStrategy.MERGE };

      // 覆盖 beforeEach 的默认设置，模拟分支保护拒绝
      mockPRMergeService.merge.mockRejectedValue(
        new BadRequestException('分支 "main" 受保护，需要至少 2 个批准审查'),
      );

      await expect(service.merge(prId, userId, dto)).rejects.toThrow(
        '分支 "main" 受保护，需要至少 2 个批准审查',
      );
    });

    it('should allow merge when branch protection requirements are met', async () => {
      const dto: MergePullRequestDto = { strategy: MergeStrategy.MERGE };

      const result = await service.merge(prId, userId, dto);

      expect(result.state).toBe(PRState.MERGED);
      expect(mockPRMergeService.merge).toHaveBeenCalledWith(prId, userId, dto);
    });

    it('should allow merge when no branch protection exists', async () => {
      const dto: MergePullRequestDto = { strategy: MergeStrategy.MERGE };

      const result = await service.merge(prId, userId, dto);

      expect(result.state).toBe(PRState.MERGED);
      expect(mockPRMergeService.merge).toHaveBeenCalledWith(prId, userId, dto);
    });
  });
});
