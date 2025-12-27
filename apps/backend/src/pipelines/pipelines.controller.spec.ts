import { Test, TestingModule } from '@nestjs/testing';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';
import { PermissionService } from '../common/services/permission.service';
import { PipelineStatus, User } from '@prisma/client';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';

describe('PipelinesController', () => {
  let controller: PipelinesController;
  let pipelinesService: PipelinesService;
  let permissionService: PermissionService;

  const mockPipelinesService = {
    createPipeline: jest.fn(),
    getPipelines: jest.fn(),
    getPipeline: jest.fn(),
    updatePipeline: jest.fn(),
    deletePipeline: jest.fn(),
    triggerPipeline: jest.fn(),
    getPipelineRuns: jest.fn(),
    getPipelineRun: jest.fn(),
    updatePipelineStatus: jest.fn(),
    getProjectPipelineRuns: jest.fn(),
  };

  const mockPermissionService = {
    checkProjectPermission: jest.fn(),
  };

  // ECP-A1: 测试使用部分 Mock User，使用双重断言绕过类型检查
  const mockUser = { id: 'user-1', username: 'testuser' } as unknown as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipelinesController],
      providers: [
        {
          provide: PipelinesService,
          useValue: mockPipelinesService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    })
      .overrideGuard(WebhookSignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PipelinesController>(PipelinesController);
    pipelinesService = module.get<PipelinesService>(PipelinesService);
    permissionService = module.get<PermissionService>(PermissionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPipeline', () => {
    const projectId = 'project-1';
    const createDto = {
      name: 'Test Pipeline',
      config: { steps: [] },
      triggers: ['push'],
      active: true,
    };

    it('should create a pipeline successfully', async () => {
      const mockPipeline = { id: 'pipeline-1', ...createDto, projectId };

      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined);
      mockPipelinesService.createPipeline.mockResolvedValue(mockPipeline);

      const result = await controller.createPipeline(
        projectId,
        createDto,
        mockUser,
      );

      expect(result).toEqual(mockPipeline);
      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        mockUser,
        projectId,
        'MAINTAINER',
      );
      expect(pipelinesService.createPipeline).toHaveBeenCalledWith(
        projectId,
        createDto,
      );
    });
  });

  describe('getPipelines', () => {
    const projectId = 'project-1';

    it('should return paginated pipelines', async () => {
      const mockResult = {
        pipelines: [{ id: 'pipeline-1' }],
        total: 1,
      };

      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined);
      mockPipelinesService.getPipelines.mockResolvedValue(mockResult);

      const result = await controller.getPipelines(
        projectId,
        '1',
        '20',
        mockUser,
      );

      expect(result).toEqual(mockResult);
      expect(pipelinesService.getPipelines).toHaveBeenCalledWith(
        projectId,
        1,
        20,
      );
    });
  });

  describe('getPipeline', () => {
    const pipelineId = 'pipeline-1';

    it('should return a pipeline', async () => {
      const mockPipeline = {
        id: pipelineId,
        projectId: 'project-1',
        name: 'Test',
      };

      mockPipelinesService.getPipeline.mockResolvedValue(mockPipeline);
      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined);

      const result = await controller.getPipeline(pipelineId, mockUser);

      expect(result).toEqual(mockPipeline);
      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        mockUser,
        mockPipeline.projectId,
        'VIEWER',
      );
    });
  });

  describe('updatePipeline', () => {
    const pipelineId = 'pipeline-1';
    const updateDto = { name: 'Updated Name' };

    it('should update a pipeline successfully', async () => {
      const mockPipeline = {
        id: pipelineId,
        projectId: 'project-1',
        name: 'Old Name',
      };
      const updatedPipeline = { ...mockPipeline, ...updateDto };

      mockPipelinesService.getPipeline.mockResolvedValue(mockPipeline);
      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined);
      mockPipelinesService.updatePipeline.mockResolvedValue(updatedPipeline);

      const result = await controller.updatePipeline(
        pipelineId,
        updateDto,
        mockUser,
      );

      expect(result).toEqual(updatedPipeline);
      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        mockUser.id,
        mockPipeline.projectId,
        'MAINTAINER',
      );
    });
  });

  describe('deletePipeline', () => {
    const pipelineId = 'pipeline-1';

    it('should delete a pipeline successfully', async () => {
      const mockPipeline = { id: pipelineId, projectId: 'project-1' };

      mockPipelinesService.getPipeline.mockResolvedValue(mockPipeline);
      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined);
      mockPipelinesService.deletePipeline.mockResolvedValue(undefined);

      await controller.deletePipeline(pipelineId, mockUser);

      expect(pipelinesService.deletePipeline).toHaveBeenCalledWith(pipelineId);
    });
  });

  describe('triggerPipeline', () => {
    const pipelineId = 'pipeline-1';
    const triggerDto = {
      commitSha: 'a1b2c3d4',
      branch: 'main',
    };

    it('should trigger a pipeline successfully', async () => {
      const mockPipeline = { id: pipelineId, projectId: 'project-1' };
      const mockRun = {
        id: 'run-1',
        pipelineId,
        status: PipelineStatus.PENDING,
      };

      mockPipelinesService.getPipeline.mockResolvedValue(mockPipeline);
      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined);
      mockPipelinesService.triggerPipeline.mockResolvedValue(mockRun);

      const result = await controller.triggerPipeline(
        pipelineId,
        triggerDto,
        mockUser,
      );

      expect(result).toEqual(mockRun);
      expect(permissionService.checkProjectPermission).toHaveBeenCalledWith(
        mockUser.id,
        mockPipeline.projectId,
        'MEMBER',
      );
    });
  });

  describe('getPipelineRuns', () => {
    const pipelineId = 'pipeline-1';

    it('should return paginated pipeline runs', async () => {
      const mockPipeline = { id: pipelineId, projectId: 'project-1' };
      const mockResult = {
        runs: [{ id: 'run-1' }],
        total: 1,
      };

      mockPipelinesService.getPipeline.mockResolvedValue(mockPipeline);
      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined);
      mockPipelinesService.getPipelineRuns.mockResolvedValue(mockResult);

      const result = await controller.getPipelineRuns(
        pipelineId,
        '1',
        '20',
        mockUser,
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('updatePipelineStatus', () => {
    const runId = 'run-1';
    const updateDto = {
      status: PipelineStatus.SUCCESS,
      duration: 120,
      logs: 'Build successful',
    };

    it('should update pipeline status', async () => {
      const mockRun = {
        id: runId,
        status: PipelineStatus.SUCCESS,
      };

      mockPipelinesService.updatePipelineStatus.mockResolvedValue(mockRun);

      const result = await controller.updatePipelineStatus(runId, updateDto);

      expect(result).toEqual(mockRun);
      expect(pipelinesService.updatePipelineStatus).toHaveBeenCalledWith(
        runId,
        updateDto,
      );
    });
  });

  describe('getProjectPipelineRuns', () => {
    const projectId = 'project-1';

    it('should return all pipeline runs for a project', async () => {
      const mockResult = {
        runs: [
          { id: 'run-1', pipeline: { id: 'pipeline-1', name: 'Pipeline 1' } },
        ],
        total: 1,
      };

      mockPermissionService.checkProjectPermission.mockResolvedValue(undefined);
      mockPipelinesService.getProjectPipelineRuns.mockResolvedValue(mockResult);

      const result = await controller.getProjectPipelineRuns(
        projectId,
        '1',
        '20',
        mockUser,
      );

      expect(result).toEqual(mockResult);
      expect(pipelinesService.getProjectPipelineRuns).toHaveBeenCalledWith(
        projectId,
        1,
        20,
      );
    });
  });
});
