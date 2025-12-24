import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationService } from './collaboration.service';
import * as _Y from 'yjs';

// Mock Yjs
jest.mock('yjs', () => ({
  Doc: jest.fn().mockImplementation(() => ({})),
  applyUpdate: jest.fn(),
}));

/**
 * CollaborationGateway 单元测试
 *
 * ECP-B4: Context-Aware TDD - 针对Gateway进行单元测试
 * ECP-D1: Design for Testability - 使用mock测试WebSocket逻辑
 *
 * 测试覆盖：
 * - 连接认证
 * - 加入/离开文档
 * - 消息广播
 */
describe('CollaborationGateway', () => {
  let gateway: CollaborationGateway;
  let jwtService: JwtService;
  let collaborationService: CollaborationService;

  // Mock Socket
  const mockSocket = {
    id: 'socket-123',
    data: {},
    handshake: {
      query: {},
      headers: {},
    },
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
  };

  // Mock JwtService
  const mockJwtService = {
    verify: jest.fn(),
  };

  // Mock CollaborationService
  const mockCollaborationService = {
    getOrCreateSession: jest.fn(),
    joinSession: jest.fn(),
    leaveSession: jest.fn(),
    getActiveUsers: jest.fn(),
    updateLastActive: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CollaborationService,
          useValue: mockCollaborationService,
        },
      ],
    }).compile();

    gateway = module.get<CollaborationGateway>(CollaborationGateway);
    jwtService = module.get<JwtService>(JwtService);
    collaborationService =
      module.get<CollaborationService>(CollaborationService);

    // Mock server
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should accept connection with valid token', () => {
      mockSocket.handshake.query.token = 'valid-token';
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      gateway.handleConnection(mockSocket as any);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockSocket.data.userId).toBe('user-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        message: 'Successfully connected to collaboration service',
        userId: 'user-1',
      });
    });

    it('should reject connection without token', () => {
      mockSocket.handshake.query.token = undefined;
      mockSocket.handshake.headers.authorization = undefined;

      gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should reject connection with invalid token', () => {
      mockSocket.handshake.query.token = 'invalid-token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should accept token from Authorization header', () => {
      mockSocket.handshake.query.token = undefined;
      mockSocket.handshake.headers.authorization = 'Bearer valid-token';
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      gateway.handleConnection(mockSocket as any);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockSocket.data.userId).toBe('user-1');
    });
  });

  describe('handleDisconnect', () => {
    it('should cleanup user session on disconnect', async () => {
      mockSocket.data.userId = 'user-1';
      gateway['userSessions'].set('socket-123', {
        userId: 'user-1',
        sessionId: 'session-1',
        documentId: 'test.md',
        projectId: 'project-1',
      });

      mockCollaborationService.leaveSession.mockResolvedValue(undefined);

      await gateway.handleDisconnect(mockSocket as any);

      expect(collaborationService.leaveSession).toHaveBeenCalledWith(
        'session-1',
        'user-1',
      );
      expect(mockSocket.to).toHaveBeenCalledWith('test.md');
      expect(gateway['userSessions'].has('socket-123')).toBe(false);
    });

    it('should handle disconnect without active session', async () => {
      mockSocket.data.userId = undefined;

      await gateway.handleDisconnect(mockSocket as any);

      expect(collaborationService.leaveSession).not.toHaveBeenCalled();
    });
  });

  describe('handleJoinDocument', () => {
    it('should allow user to join document', async () => {
      mockSocket.data.userId = 'user-1';

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
          avatar: null,
        },
      };

      mockCollaborationService.getOrCreateSession.mockResolvedValue(
        mockSession,
      );
      mockCollaborationService.joinSession.mockResolvedValue(mockParticipant);
      mockCollaborationService.getActiveUsers.mockResolvedValue([
        mockParticipant,
      ]);

      const result = await gateway.handleJoinDocument(
        {
          documentId: 'test.md',
          projectId: 'project-1',
          documentType: 'file',
        },
        mockSocket as any,
      );

      expect(result.event).toBe('document-joined');
      expect(result.data.sessionId).toBe('session-1');
      expect(result.data.activeUsers).toHaveLength(1);
      expect(mockSocket.join).toHaveBeenCalledWith('test.md');
    });

    it('should return error if documentId missing', async () => {
      mockSocket.data.userId = 'user-1';

      const result = await gateway.handleJoinDocument(
        {
          documentId: '',
          projectId: 'project-1',
          documentType: 'file',
        },
        mockSocket as any,
      );

      expect(result.event).toBe('error');
      expect(result.data.message).toContain('required');
    });
  });

  describe('handleLeaveDocument', () => {
    it('should allow user to leave document', async () => {
      mockSocket.data.userId = 'user-1';
      gateway['userSessions'].set('socket-123', {
        userId: 'user-1',
        sessionId: 'session-1',
        documentId: 'test.md',
        projectId: 'project-1',
      });

      mockCollaborationService.leaveSession.mockResolvedValue(undefined);

      const result = await gateway.handleLeaveDocument(
        { documentId: 'test.md' },
        mockSocket as any,
      );

      expect(result.event).toBe('document-left');
      expect(result.data.documentId).toBe('test.md');
      expect(mockSocket.leave).toHaveBeenCalledWith('test.md');
      expect(collaborationService.leaveSession).toHaveBeenCalled();
    });

    it('should return error if not in session', async () => {
      mockSocket.data.userId = 'user-1';

      const result = await gateway.handleLeaveDocument(
        { documentId: 'test.md' },
        mockSocket as any,
      );

      expect(result.event).toBe('error');
      expect(result.data.message).toBe('Not in any session');
    });
  });

  describe('handleSyncUpdate', () => {
    it('should broadcast update to other users', async () => {
      mockSocket.data.userId = 'user-1';
      gateway['userSessions'].set('socket-123', {
        userId: 'user-1',
        sessionId: 'session-1',
        documentId: 'test.md',
        projectId: 'project-1',
      });

      // Mock Yjs doc with proper Y.Doc interface
      const mockYDoc = {
        transact: jest.fn(),
      };
      gateway['docs'].set('test.md', mockYDoc as any);

      mockCollaborationService.updateLastActive.mockResolvedValue(undefined);

      const updateData = new Uint8Array([1, 2, 3]);

      const result = await gateway.handleSyncUpdate(
        {
          documentId: 'test.md',
          update: updateData,
        },
        mockSocket as any,
      );

      expect(result.event).toBe('sync-update-ack');
      expect(result.data.success).toBe(true);
      expect(collaborationService.updateLastActive).toHaveBeenCalledWith(
        'session-1',
        'user-1',
      );
    });

    it('should return error if not in session', async () => {
      mockSocket.data.userId = 'user-1';

      const result = await gateway.handleSyncUpdate(
        {
          documentId: 'test.md',
          update: new Uint8Array([1, 2, 3]),
        },
        mockSocket as any,
      );

      expect(result.event).toBe('error');
    });
  });

  describe('handleAwarenessUpdate', () => {
    it('should broadcast awareness to other users', async () => {
      mockSocket.data.userId = 'user-1';
      gateway['userSessions'].set('socket-123', {
        userId: 'user-1',
        sessionId: 'session-1',
        documentId: 'test.md',
        projectId: 'project-1',
      });

      mockCollaborationService.updateLastActive.mockResolvedValue(undefined);

      const result = await gateway.handleAwarenessUpdate(
        {
          documentId: 'test.md',
          state: {
            cursor: { line: 10, column: 5 },
          },
        },
        mockSocket as any,
      );

      expect(result.event).toBe('awareness-update-ack');
      expect(result.data.success).toBe(true);
      expect(mockSocket.to).toHaveBeenCalledWith('test.md');
    });
  });

  describe('getOnlineSessionCount', () => {
    it('should return count of active sessions', () => {
      gateway['userSessions'].set('socket-1', {
        userId: 'user-1',
        sessionId: 'session-1',
        documentId: 'test.md',
        projectId: 'project-1',
      });
      gateway['userSessions'].set('socket-2', {
        userId: 'user-2',
        sessionId: 'session-2',
        documentId: 'test2.md',
        projectId: 'project-1',
      });

      const count = gateway.getOnlineSessionCount();

      expect(count).toBe(2);
    });
  });

  describe('getDocumentConnectionCount', () => {
    it('should return count of connections for document', () => {
      gateway['userSessions'].set('socket-1', {
        userId: 'user-1',
        sessionId: 'session-1',
        documentId: 'test.md',
        projectId: 'project-1',
      });
      gateway['userSessions'].set('socket-2', {
        userId: 'user-2',
        sessionId: 'session-1',
        documentId: 'test.md',
        projectId: 'project-1',
      });
      gateway['userSessions'].set('socket-3', {
        userId: 'user-3',
        sessionId: 'session-2',
        documentId: 'other.md',
        projectId: 'project-1',
      });

      const count = gateway.getDocumentConnectionCount('test.md');

      expect(count).toBe(2);
    });
  });
});
