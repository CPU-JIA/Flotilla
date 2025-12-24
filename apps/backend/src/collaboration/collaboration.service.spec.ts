import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CollaborationService 单元测试
 *
 * ECP-B4: Context-Aware TDD - 针对业务逻辑编写单元测试
 * ECP-D1: Design for Testability - 使用依赖注入便于测试
 *
 * 测试覆盖：
 * - 创建会话
 * - 用户加入/离开会话
 * - 获取活跃用户
 * - 会话清理
 */
describe('CollaborationService', () => {
  let service: CollaborationService;
  let prisma: PrismaService;

  // Mock数据
  const mockSession = {
    id: 'session-1',
    documentId: 'test.md',
    documentType: 'file',
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [],
  };

  const mockParticipant = {
    id: 'participant-1',
    sessionId: 'session-1',
    userId: 'user-1',
    color: '#FF6B6B',
    joinedAt: new Date(),
    lastActiveAt: new Date(),
    user: {
      id: 'user-1',
      username: 'testuser',
      avatar: 'https://example.com/avatar.png',
    },
  };

  // Mock PrismaService
  const mockPrismaService = {
    collaborationSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    collaborationParticipant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    // 创建测试模块
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CollaborationService>(CollaborationService);
    prisma = module.get<PrismaService>(PrismaService);

    // 清理所有mock调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      mockPrismaService.collaborationSession.findFirst.mockResolvedValue(null);
      mockPrismaService.collaborationSession.create.mockResolvedValue(
        mockSession,
      );

      const result = await service.createSession(
        'test.md',
        'file',
        'project-1',
      );

      expect(result).toEqual(mockSession);
      expect(prisma.collaborationSession.findFirst).toHaveBeenCalledWith({
        where: {
          documentId: 'test.md',
          projectId: 'project-1',
        },
        include: {
          participants: true,
        },
      });
      expect(prisma.collaborationSession.create).toHaveBeenCalled();
    });

    it('should reuse existing session', async () => {
      mockPrismaService.collaborationSession.findFirst.mockResolvedValue(
        mockSession,
      );

      const result = await service.createSession(
        'test.md',
        'file',
        'project-1',
      );

      expect(result).toEqual(mockSession);
      expect(prisma.collaborationSession.create).not.toHaveBeenCalled();
    });

    it('should throw error if documentId or projectId is missing', async () => {
      await expect(
        service.createSession('', 'file', 'project-1'),
      ).rejects.toThrow('documentId and projectId are required');

      await expect(
        service.createSession('test.md', 'file', ''),
      ).rejects.toThrow('documentId and projectId are required');
    });
  });

  describe('joinSession', () => {
    it('should allow user to join session', async () => {
      mockPrismaService.collaborationSession.findUnique.mockResolvedValue(
        mockSession,
      );
      mockPrismaService.collaborationParticipant.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.collaborationParticipant.create.mockResolvedValue(
        mockParticipant,
      );

      const result = await service.joinSession(
        'session-1',
        'user-1',
        '#FF6B6B',
      );

      expect(result).toEqual(mockParticipant);
      expect(prisma.collaborationParticipant.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-1',
          userId: 'user-1',
          color: '#FF6B6B',
        },
      });
    });

    it('should update existing participant', async () => {
      mockPrismaService.collaborationSession.findUnique.mockResolvedValue(
        mockSession,
      );
      mockPrismaService.collaborationParticipant.findUnique.mockResolvedValue(
        mockParticipant,
      );
      mockPrismaService.collaborationParticipant.update.mockResolvedValue({
        ...mockParticipant,
        lastActiveAt: new Date(),
      });

      const result = await service.joinSession(
        'session-1',
        'user-1',
        '#4ECDC4',
      );

      expect(result.userId).toBe('user-1');
      expect(prisma.collaborationParticipant.update).toHaveBeenCalled();
      expect(prisma.collaborationParticipant.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrismaService.collaborationSession.findUnique.mockResolvedValue(null);

      await expect(
        service.joinSession('invalid-session', 'user-1', '#FF6B6B'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if parameters are missing', async () => {
      await expect(
        service.joinSession('', 'user-1', '#FF6B6B'),
      ).rejects.toThrow('sessionId, userId, and color are required');
    });
  });

  describe('leaveSession', () => {
    it('should allow user to leave session', async () => {
      mockPrismaService.collaborationParticipant.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.collaborationParticipant.count.mockResolvedValue(2); // 还有其他参与者

      await service.leaveSession('session-1', 'user-1');

      expect(prisma.collaborationParticipant.deleteMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-1',
          userId: 'user-1',
        },
      });
      expect(prisma.collaborationSession.delete).not.toHaveBeenCalled();
    });

    it('should delete session when last participant leaves', async () => {
      mockPrismaService.collaborationParticipant.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.collaborationParticipant.count.mockResolvedValue(0); // 没有参与者了
      mockPrismaService.collaborationSession.delete.mockResolvedValue(
        mockSession,
      );

      await service.leaveSession('session-1', 'user-1');

      expect(prisma.collaborationSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('should throw error if parameters are missing', async () => {
      await expect(service.leaveSession('', 'user-1')).rejects.toThrow(
        'sessionId and userId are required',
      );
    });
  });

  describe('getActiveUsers', () => {
    it('should return list of active users', async () => {
      const mockUsers = [
        mockParticipant,
        {
          ...mockParticipant,
          id: 'participant-2',
          userId: 'user-2',
          user: {
            id: 'user-2',
            username: 'testuser2',
            avatar: null,
          },
        },
      ];

      mockPrismaService.collaborationParticipant.findMany.mockResolvedValue(
        mockUsers,
      );

      const result = await service.getActiveUsers('session-1');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(prisma.collaborationParticipant.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      });
    });

    it('should throw error if sessionId is missing', async () => {
      await expect(service.getActiveUsers('')).rejects.toThrow(
        'sessionId is required',
      );
    });
  });

  describe('updateLastActive', () => {
    it('should update participant last active time', async () => {
      mockPrismaService.collaborationParticipant.updateMany.mockResolvedValue({
        count: 1,
      });

      await service.updateLastActive('session-1', 'user-1');

      expect(prisma.collaborationParticipant.updateMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-1',
          userId: 'user-1',
        },
        data: {
          lastActiveAt: expect.any(Date),
        },
      });
    });

    it('should not throw error if parameters are empty', async () => {
      await expect(
        service.updateLastActive('', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getOrCreateSession', () => {
    it('should return existing session', async () => {
      const sessionWithParticipants = {
        ...mockSession,
        participants: [mockParticipant],
      };

      mockPrismaService.collaborationSession.findFirst.mockResolvedValue(
        sessionWithParticipants,
      );

      const result = await service.getOrCreateSession(
        'test.md',
        'file',
        'project-1',
      );

      expect(result).toEqual(sessionWithParticipants);
      expect(prisma.collaborationSession.create).not.toHaveBeenCalled();
    });

    it('should create new session if not exists', async () => {
      const sessionWithParticipants = {
        ...mockSession,
        participants: [],
      };

      mockPrismaService.collaborationSession.findFirst.mockResolvedValue(null);
      mockPrismaService.collaborationSession.create.mockResolvedValue(
        sessionWithParticipants,
      );

      const result = await service.getOrCreateSession(
        'test.md',
        'file',
        'project-1',
      );

      expect(result).toEqual(sessionWithParticipants);
      expect(prisma.collaborationSession.create).toHaveBeenCalled();
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('should cleanup inactive sessions', async () => {
      const oldDate = new Date(Date.now() - 60 * 60 * 1000); // 1小时前
      const inactiveSessions = [
        {
          ...mockSession,
          updatedAt: oldDate,
          participants: [], // 没有活跃参与者
        },
      ];

      mockPrismaService.collaborationSession.findMany.mockResolvedValue(
        inactiveSessions,
      );
      mockPrismaService.collaborationSession.deleteMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.cleanupInactiveSessions(30);

      expect(result).toBe(1);
      expect(prisma.collaborationSession.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['session-1'],
          },
        },
      });
    });

    it('should not delete sessions with active participants', async () => {
      const recentDate = new Date();
      const activeSessions = [
        {
          ...mockSession,
          updatedAt: recentDate,
          participants: [mockParticipant], // 有活跃参与者
        },
      ];

      mockPrismaService.collaborationSession.findMany.mockResolvedValue(
        activeSessions,
      );

      const result = await service.cleanupInactiveSessions(30);

      expect(result).toBe(0);
      expect(prisma.collaborationSession.deleteMany).not.toHaveBeenCalled();
    });
  });
});
