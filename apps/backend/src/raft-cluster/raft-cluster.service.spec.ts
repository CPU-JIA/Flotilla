/**
 * RaftClusterService Unit Tests
 *
 * 测试集群管理服务的核心功能
 * ECP-D1: 可测试性 - 使用 Mock 隔离外部依赖
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RaftClusterService } from './raft-cluster.service';
import {
  ClusterConfigService,
  RaftClusterSettings,
} from './cluster-config.service';
import { CommandType, NodeState, ClientResponse } from '../raft/types';

// Mock RaftNode
const mockRaftNode = {
  start: jest.fn(),
  stop: jest.fn(),
  exportState: jest.fn(),
  handleClientWrite: jest.fn(),
  on: jest.fn(),
};

// Mock dependencies
jest.mock('../raft/raft-node', () => ({
  RaftNode: jest.fn().mockImplementation(() => mockRaftNode),
}));

jest.mock('../raft/websocket-transport', () => ({
  WebSocketTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../raft/storage', () => ({
  FilePersistentStorage: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../raft/git-state-machine', () => ({
  GitStateMachine: jest.fn().mockImplementation(() => ({
    loadSnapshotFromFile: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('RaftClusterService', () => {
  let service: RaftClusterService;
  let configService: ClusterConfigService;

  const mockSettings: RaftClusterSettings = {
    nodeId: 'node-1',
    nodes: ['node-1', 'node-2', 'node-3'],
    ports: { 'node-1': 8000, 'node-2': 8001, 'node-3': 8002 },
    electionTimeoutMin: 150,
    electionTimeoutMax: 450,
    heartbeatInterval: 100,
    rpcTimeout: 100,
    autoStart: false,
    dataDir: './data/raft-test',
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    mockRaftNode.start.mockResolvedValue(undefined);
    mockRaftNode.stop.mockResolvedValue(undefined);
    mockRaftNode.exportState.mockReturnValue(null);
    mockRaftNode.handleClientWrite.mockResolvedValue({ success: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RaftClusterService,
        {
          provide: ClusterConfigService,
          useValue: {
            getClusterSettings: jest.fn().mockReturnValue(mockSettings),
            validateConfig: jest
              .fn()
              .mockReturnValue({ valid: true, errors: [] }),
            toRaftConfig: jest.fn().mockReturnValue({
              nodeId: mockSettings.nodeId,
              nodes: mockSettings.nodes,
              electionTimeoutMin: mockSettings.electionTimeoutMin,
              electionTimeoutMax: mockSettings.electionTimeoutMax,
              heartbeatInterval: mockSettings.heartbeatInterval,
              rpcTimeout: mockSettings.rpcTimeout,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RaftClusterService>(RaftClusterService);
    configService = module.get<ClusterConfigService>(ClusterConfigService);
  });

  afterEach(async () => {
    // 确保集群停止
    try {
      await service.stopCluster();
    } catch {
      // 忽略停止错误
    }
  });

  describe('Cluster Lifecycle', () => {
    describe('startCluster', () => {
      it('should_start_cluster_when_not_running', async () => {
        // Act
        await service.startCluster();

        // Assert
        expect(mockRaftNode.start).toHaveBeenCalledTimes(1);
        const status = service.getClusterStatus();
        expect(status.status).toBe('running');
      });

      it('should_throw_error_when_cluster_already_running', async () => {
        // Arrange
        await service.startCluster();

        // Act & Assert
        await expect(service.startCluster()).rejects.toThrow(
          'Cluster is already running',
        );
      });

      it('should_set_status_to_error_when_start_fails', async () => {
        // Arrange
        mockRaftNode.start.mockRejectedValue(new Error('Start failed'));

        // Act & Assert
        await expect(service.startCluster()).rejects.toThrow('Start failed');
        const status = service.getClusterStatus();
        expect(status.status).toBe('error');
      });

      it('should_setup_event_handlers_on_start', async () => {
        // Act
        await service.startCluster();

        // Assert
        expect(mockRaftNode.on).toHaveBeenCalledWith(
          'leader_elected',
          expect.any(Function),
        );
        expect(mockRaftNode.on).toHaveBeenCalledWith(
          'error',
          expect.any(Function),
        );
        expect(mockRaftNode.on).toHaveBeenCalledWith(
          'state_changed',
          expect.any(Function),
        );
      });
    });

    describe('stopCluster', () => {
      it('should_stop_running_cluster', async () => {
        // Arrange
        await service.startCluster();

        // Act
        await service.stopCluster();

        // Assert
        expect(mockRaftNode.stop).toHaveBeenCalledTimes(1);
        const status = service.getClusterStatus();
        expect(status.status).toBe('stopped');
      });

      it('should_do_nothing_when_cluster_already_stopped', async () => {
        // Act
        await service.stopCluster();

        // Assert
        expect(mockRaftNode.stop).not.toHaveBeenCalled();
      });

      it('should_set_status_to_error_when_stop_fails', async () => {
        // Arrange
        await service.startCluster();
        mockRaftNode.stop.mockRejectedValue(new Error('Stop failed'));

        // Act & Assert
        await expect(service.stopCluster()).rejects.toThrow('Stop failed');
        const status = service.getClusterStatus();
        expect(status.status).toBe('error');
      });
    });

    describe('restartCluster', () => {
      it('should_stop_and_start_cluster', async () => {
        // Arrange
        await service.startCluster();

        // Act
        await service.restartCluster();

        // Assert
        expect(mockRaftNode.stop).toHaveBeenCalled();
        expect(mockRaftNode.start).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Cluster Status', () => {
    describe('getClusterStatus', () => {
      it('should_return_stopped_status_initially', () => {
        // Act
        const status = service.getClusterStatus();

        // Assert
        expect(status.nodeId).toBe('node-1');
        expect(status.status).toBe('stopped');
        expect(status.isLeader).toBe(false);
        expect(status.currentTerm).toBe(0);
        expect(status.clusterSize).toBe(3);
      });

      it('should_return_running_status_after_start', async () => {
        // Arrange
        mockRaftNode.exportState.mockReturnValue({
          nodeId: 'node-1',
          state: NodeState.FOLLOWER,
          currentTerm: 1,
          votedFor: null,
          commitIndex: 0,
          lastApplied: 0,
          logLength: 0,
          clusterSize: 3,
        });
        await service.startCluster();

        // Act
        const status = service.getClusterStatus();

        // Assert
        expect(status.status).toBe('running');
        expect(status.currentTerm).toBe(1);
        expect(status.isLeader).toBe(false);
      });

      it('should_return_isLeader_true_when_node_is_leader', async () => {
        // Arrange
        mockRaftNode.exportState.mockReturnValue({
          nodeId: 'node-1',
          state: NodeState.LEADER,
          currentTerm: 2,
          votedFor: 'node-1',
          commitIndex: 5,
          lastApplied: 5,
          logLength: 5,
          clusterSize: 3,
        });
        await service.startCluster();

        // Act
        const status = service.getClusterStatus();

        // Assert
        expect(status.isLeader).toBe(true);
        expect(status.currentTerm).toBe(2);
      });
    });

    describe('getClusterMetrics', () => {
      it('should_return_initial_metrics', () => {
        // Act
        const metrics = service.getClusterMetrics();

        // Assert
        expect(metrics.totalCommands).toBe(0);
        expect(metrics.commandsPerSecond).toBe(0);
        expect(metrics.averageResponseTime).toBe(0);
        expect(metrics.leaderElections).toBe(0);
        expect(metrics.uptime).toBe(0);
      });

      it('should_track_uptime_after_start', async () => {
        // Arrange
        await service.startCluster();

        // Act - wait a bit
        await new Promise((resolve) => setTimeout(resolve, 100));
        const metrics = service.getClusterMetrics();

        // Assert
        expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Command Execution', () => {
    describe('executeCommand', () => {
      it('should_throw_error_when_cluster_not_running', async () => {
        // Arrange
        const command = {
          type: CommandType.CREATE_PROJECT,
          payload: { id: '1', name: 'test' },
        };

        // Act & Assert
        await expect(service.executeCommand(command)).rejects.toThrow(
          'Raft cluster is not running',
        );
      });

      it('should_execute_command_when_cluster_running', async () => {
        // Arrange
        await service.startCluster();
        const command = {
          type: CommandType.CREATE_PROJECT,
          payload: { id: '1', name: 'test' },
        };
        const expectedResponse: ClientResponse = {
          success: true,
          data: { id: '1' },
        };
        mockRaftNode.handleClientWrite.mockResolvedValue(expectedResponse);

        // Act
        const result = await service.executeCommand(command);

        // Assert
        expect(result).toEqual(expectedResponse);
        expect(mockRaftNode.handleClientWrite).toHaveBeenCalledWith(command);
      });

      it('should_update_metrics_after_command_execution', async () => {
        // Arrange
        await service.startCluster();
        const command = {
          type: CommandType.CREATE_PROJECT,
          payload: { id: '1', name: 'test' },
        };

        // Act
        await service.executeCommand(command);
        const metrics = service.getClusterMetrics();

        // Assert
        expect(metrics.totalCommands).toBe(1);
      });

      it('should_throw_error_when_command_fails', async () => {
        // Arrange
        await service.startCluster();
        const command = {
          type: CommandType.CREATE_PROJECT,
          payload: { id: '1', name: 'test' },
        };
        mockRaftNode.handleClientWrite.mockRejectedValue(
          new Error('Command failed'),
        );

        // Act & Assert
        await expect(service.executeCommand(command)).rejects.toThrow(
          'Command failed',
        );
      });
    });

    describe('createProject', () => {
      it('should_create_project_command', async () => {
        // Arrange
        await service.startCluster();
        const projectData = {
          id: 'proj-1',
          name: 'Test Project',
          description: 'A test project',
          ownerId: 'user-1',
        };

        // Act
        await service.createProject(projectData);

        // Assert
        expect(mockRaftNode.handleClientWrite).toHaveBeenCalledWith({
          type: CommandType.CREATE_PROJECT,
          payload: projectData,
        });
      });
    });

    describe('gitCommit', () => {
      it('should_create_git_commit_command', async () => {
        // Arrange
        await service.startCluster();
        const commitData = {
          repositoryId: 'repo-1',
          branchName: 'main',
          message: 'Initial commit',
          author: { name: 'Test', email: 'test@example.com' },
          files: [
            {
              path: 'README.md',
              content: '# Hello',
              mimeType: 'text/markdown',
            },
          ],
        };

        // Act
        await service.gitCommit(commitData);

        // Assert
        expect(mockRaftNode.handleClientWrite).toHaveBeenCalledWith({
          type: CommandType.GIT_COMMIT,
          payload: commitData,
        });
      });
    });

    describe('gitCreateBranch', () => {
      it('should_create_git_branch_command', async () => {
        // Arrange
        await service.startCluster();
        const branchData = {
          repositoryId: 'repo-1',
          branchName: 'feature/new',
          fromBranch: 'main',
        };

        // Act
        await service.gitCreateBranch(branchData);

        // Assert
        expect(mockRaftNode.handleClientWrite).toHaveBeenCalledWith({
          type: CommandType.GIT_CREATE_BRANCH,
          payload: branchData,
        });
      });
    });
  });

  describe('Leader Management', () => {
    describe('isLeader', () => {
      it('should_return_false_when_cluster_not_running', () => {
        // Act
        const result = service.isLeader();

        // Assert
        expect(result).toBe(false);
      });

      it('should_return_false_when_node_is_follower', async () => {
        // Arrange
        mockRaftNode.exportState.mockReturnValue({
          state: NodeState.FOLLOWER,
        });
        await service.startCluster();

        // Act
        const result = service.isLeader();

        // Assert
        expect(result).toBe(false);
      });

      it('should_return_true_when_node_is_leader', async () => {
        // Arrange
        mockRaftNode.exportState.mockReturnValue({
          state: NodeState.LEADER,
        });
        await service.startCluster();

        // Act
        const result = service.isLeader();

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('getLeaderId', () => {
      it('should_return_null_when_cluster_not_running', () => {
        // Act
        const result = service.getLeaderId();

        // Assert
        expect(result).toBeNull();
      });

      it('should_return_leader_id_when_available', async () => {
        // Arrange
        mockRaftNode.exportState.mockReturnValue({
          leaderId: 'node-2',
        });
        await service.startCluster();

        // Act
        const result = service.getLeaderId();

        // Assert
        expect(result).toBe('node-2');
      });
    });
  });

  describe('Module Lifecycle', () => {
    describe('onModuleInit', () => {
      it('should_not_auto_start_when_autoStart_is_false', async () => {
        // Act
        await service.onModuleInit();

        // Assert
        expect(mockRaftNode.start).not.toHaveBeenCalled();
      });

      it('should_auto_start_when_autoStart_is_true', async () => {
        // Arrange
        const autoStartSettings = { ...mockSettings, autoStart: true };
        (configService.getClusterSettings as jest.Mock).mockReturnValue(
          autoStartSettings,
        );

        // Act
        await service.onModuleInit();

        // Assert
        expect(mockRaftNode.start).toHaveBeenCalled();
      });

      it('should_not_start_when_config_invalid', async () => {
        // Arrange
        (configService.validateConfig as jest.Mock).mockReturnValue({
          valid: false,
          errors: ['Invalid config'],
        });

        // Act
        await service.onModuleInit();

        // Assert
        expect(mockRaftNode.start).not.toHaveBeenCalled();
      });
    });

    describe('onModuleDestroy', () => {
      it('should_stop_cluster_on_destroy', async () => {
        // Arrange
        await service.startCluster();

        // Act
        await service.onModuleDestroy();

        // Assert
        expect(mockRaftNode.stop).toHaveBeenCalled();
      });
    });
  });

  describe('Event Handlers', () => {
    it('should_increment_leader_elections_on_leader_elected_event', async () => {
      // Arrange
      await service.startCluster();

      // 获取注册的 leader_elected 回调
      const leaderElectedCall = mockRaftNode.on.mock.calls.find(
        (call) => call[0] === 'leader_elected',
      );
      const callback = leaderElectedCall[1];

      // Act - 模拟 leader 选举事件
      callback({ leaderId: 'node-1', term: 1 });

      // Assert
      const metrics = service.getClusterMetrics();
      expect(metrics.leaderElections).toBe(1);
    });
  });
});
