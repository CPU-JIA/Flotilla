import { Test, TestingModule } from '@nestjs/testing';
import { PipelinesService } from './pipelines.service';
import { PrismaService } from '../common/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PipelineStatus } from '@prisma/client';

describe('PipelinesService', () => {
  let service: PipelinesService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
    },
    pipeline: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pipelineRun: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelinesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PipelinesService>(PipelinesService);
    _prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPipeline', () => {
    const projectId = 'project-1';
    const createDto = {
      name: 'Test Pipeline',
      config: { steps: [{ name: 'Build', run: 'npm run build' }] },
      triggers: ['push'],
      active: true,
    };

    it('should create a pipeline successfully', async () => {
      const mockProject = { id: projectId, name: 'Test Project' };
      const mockPipeline = { id: 'pipeline-1', ...createDto, projectId };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.pipeline.findUnique.mockResolvedValue(null);
      mockPrismaService.pipeline.create.mockResolvedValue(mockPipeline);

      const result = await service.createPipeline(projectId, createDto);

      expect(result).toEqual(mockPipeline);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(mockPrismaService.pipeline.create).toHaveBeenCalledWith({
        data: { ...createDto, projectId },
      });
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.createPipeline(projectId, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if pipeline name already exists', async () => {
      const mockProject = { id: projectId, name: 'Test Project' };
      const existingPipeline = { id: 'pipeline-1', name: createDto.name };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.pipeline.findUnique.mockResolvedValue(existingPipeline);

      await expect(
        service.createPipeline(projectId, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPipelines', () => {
    const projectId = 'project-1';
    const mockPipelines = [
      { id: 'pipeline-1', name: 'Pipeline 1' },
      { id: 'pipeline-2', name: 'Pipeline 2' },
    ];

    it('should return paginated pipelines', async () => {
      mockPrismaService.pipeline.findMany.mockResolvedValue(mockPipelines);
      mockPrismaService.pipeline.count.mockResolvedValue(2);

      const result = await service.getPipelines(projectId, 1, 20);

      expect(result).toEqual({
        pipelines: mockPipelines,
        total: 2,
      });
      expect(mockPrismaService.pipeline.findMany).toHaveBeenCalledWith({
        where: { projectId },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getPipeline', () => {
    it('should return a pipeline by ID', async () => {
      const mockPipeline = { id: 'pipeline-1', name: 'Test Pipeline' };
      mockPrismaService.pipeline.findUnique.mockResolvedValue(mockPipeline);

      const result = await service.getPipeline('pipeline-1');

      expect(result).toEqual(mockPipeline);
    });

    it('should throw NotFoundException if pipeline does not exist', async () => {
      mockPrismaService.pipeline.findUnique.mockResolvedValue(null);

      await expect(service.getPipeline('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePipeline', () => {
    const pipelineId = 'pipeline-1';
    const mockPipeline = {
      id: pipelineId,
      name: 'Old Name',
      projectId: 'project-1',
    };
    const updateDto = { name: 'New Name' };

    it('should update a pipeline successfully', async () => {
      const updatedPipeline = { ...mockPipeline, ...updateDto };

      mockPrismaService.pipeline.findUnique
        .mockResolvedValueOnce(mockPipeline) // getPipeline call
        .mockResolvedValueOnce(null); // name uniqueness check

      mockPrismaService.pipeline.update.mockResolvedValue(updatedPipeline);

      const result = await service.updatePipeline(pipelineId, updateDto);

      expect(result).toEqual(updatedPipeline);
    });

    it('should throw BadRequestException if new name conflicts', async () => {
      const conflictingPipeline = { id: 'pipeline-2', name: 'New Name' };

      mockPrismaService.pipeline.findUnique
        .mockResolvedValueOnce(mockPipeline)
        .mockResolvedValueOnce(conflictingPipeline);

      await expect(
        service.updatePipeline(pipelineId, updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePipeline', () => {
    it('should delete a pipeline successfully', async () => {
      const mockPipeline = { id: 'pipeline-1', name: 'Test Pipeline' };

      mockPrismaService.pipeline.findUnique.mockResolvedValue(mockPipeline);
      mockPrismaService.pipeline.delete.mockResolvedValue(mockPipeline);

      await service.deletePipeline('pipeline-1');

      expect(mockPrismaService.pipeline.delete).toHaveBeenCalledWith({
        where: { id: 'pipeline-1' },
      });
    });

    it('should throw NotFoundException if pipeline does not exist', async () => {
      mockPrismaService.pipeline.findUnique.mockResolvedValue(null);

      await expect(service.deletePipeline('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('triggerPipeline', () => {
    const pipelineId = 'pipeline-1';
    const mockPipeline = { id: pipelineId, active: true };
    const triggerDto = {
      commitSha: 'a1b2c3d4',
      branch: 'main',
      metadata: { triggeredBy: 'user' },
    };

    it('should trigger a pipeline run successfully', async () => {
      const mockRun = {
        id: 'run-1',
        pipelineId,
        ...triggerDto,
        status: PipelineStatus.PENDING,
      };

      mockPrismaService.pipeline.findUnique.mockResolvedValue(mockPipeline);
      mockPrismaService.pipelineRun.create.mockResolvedValue(mockRun);

      const result = await service.triggerPipeline(pipelineId, triggerDto);

      expect(result).toEqual(mockRun);
      expect(mockPrismaService.pipelineRun.create).toHaveBeenCalledWith({
        data: {
          pipelineId,
          commitSha: triggerDto.commitSha,
          branch: triggerDto.branch,
          status: PipelineStatus.PENDING,
          metadata: triggerDto.metadata,
        },
      });
    });

    it('should throw BadRequestException if pipeline is not active', async () => {
      const inactivePipeline = { id: pipelineId, active: false };

      mockPrismaService.pipeline.findUnique.mockResolvedValue(inactivePipeline);

      await expect(
        service.triggerPipeline(pipelineId, triggerDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePipelineStatus', () => {
    const runId = 'run-1';
    const mockRun = {
      id: runId,
      pipelineId: 'pipeline-1',
      status: PipelineStatus.PENDING,
      pipeline: { id: 'pipeline-1' },
    };

    it('should update status from PENDING to RUNNING', async () => {
      const updateDto = { status: PipelineStatus.RUNNING };
      const updatedRun = { ...mockRun, status: PipelineStatus.RUNNING };

      mockPrismaService.pipelineRun.findUnique.mockResolvedValue(mockRun);
      mockPrismaService.pipelineRun.update.mockResolvedValue(updatedRun);

      const result = await service.updatePipelineStatus(runId, updateDto);

      expect(result.status).toBe(PipelineStatus.RUNNING);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const invalidUpdateDto = { status: PipelineStatus.SUCCESS };
      mockPrismaService.pipelineRun.findUnique.mockResolvedValue(mockRun);

      await expect(
        service.updatePipelineStatus(runId, invalidUpdateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set finishedAt when status is terminal', async () => {
      const updateDto = {
        status: PipelineStatus.SUCCESS,
        duration: 120,
        logs: 'Build successful',
      };
      const runningMock = { ...mockRun, status: PipelineStatus.RUNNING };

      mockPrismaService.pipelineRun.findUnique.mockResolvedValue(runningMock);
      mockPrismaService.pipelineRun.update.mockImplementation(({ data }) => {
        return Promise.resolve({ ...runningMock, ...data });
      });

      await service.updatePipelineStatus(runId, updateDto);

      expect(mockPrismaService.pipelineRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            finishedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('getPipelineRuns', () => {
    const pipelineId = 'pipeline-1';
    const mockRuns = [
      { id: 'run-1', status: PipelineStatus.SUCCESS },
      { id: 'run-2', status: PipelineStatus.RUNNING },
    ];

    it('should return paginated pipeline runs', async () => {
      mockPrismaService.pipeline.findUnique.mockResolvedValue({
        id: pipelineId,
      });
      mockPrismaService.pipelineRun.findMany.mockResolvedValue(mockRuns);
      mockPrismaService.pipelineRun.count.mockResolvedValue(2);

      const result = await service.getPipelineRuns(pipelineId, 1, 20);

      expect(result).toEqual({
        runs: mockRuns,
        total: 2,
      });
    });
  });
});
