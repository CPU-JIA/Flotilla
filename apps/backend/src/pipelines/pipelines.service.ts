import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { TriggerPipelineDto } from './dto/trigger-pipeline.dto';
import { UpdatePipelineStatusDto } from './dto/update-pipeline-status.dto';
import { Pipeline, PipelineRun, PipelineStatus } from '@prisma/client';

// 定义返回类型:PipelineRun包含pipeline关系
type PipelineRunWithPipeline = PipelineRun & {
  pipeline: Pipeline;
};

/**
 * Pipeline Service
 * ECP-A1: SOLID - 单一职责，专注于流水线业务逻辑
 * ECP-C2: Systematic Error Handling - 统一错误处理
 * ECP-C4: Statelessness Principle - 无状态服务设计
 */
@Injectable()
export class PipelinesService {
  private readonly logger = new Logger(PipelinesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建流水线配置
   * ECP-C1: Defensive Programming - 验证项目存在性
   */
  async createPipeline(
    projectId: string,
    createPipelineDto: CreatePipelineDto,
  ): Promise<Pipeline> {
    // 验证项目是否存在
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // 检查是否已存在同名流水线
    const existingPipeline = await this.prisma.pipeline.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: createPipelineDto.name,
        },
      },
    });

    if (existingPipeline) {
      throw new BadRequestException(
        `Pipeline with name "${createPipelineDto.name}" already exists`,
      );
    }

    // 创建流水线
    const pipeline = await this.prisma.pipeline.create({
      data: {
        projectId,
        name: createPipelineDto.name,
        config: createPipelineDto.config as never, // 类型转换为 Prisma 的 JsonValue
        triggers: createPipelineDto.triggers,
        active: createPipelineDto.active,
      },
    });

    this.logger.log(
      `Pipeline created: ${pipeline.id} for project ${projectId}`,
    );

    return pipeline;
  }

  /**
   * 获取项目的所有流水线
   * ECP-C3: Performance Awareness - 分页查询
   */
  async getPipelines(
    projectId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ pipelines: Pipeline[]; total: number }> {
    const skip = (page - 1) * limit;

    const [pipelines, total] = await Promise.all([
      this.prisma.pipeline.findMany({
        where: { projectId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pipeline.count({ where: { projectId } }),
    ]);

    return { pipelines, total };
  }

  /**
   * 获取单个流水线详情
   */
  async getPipeline(pipelineId: string): Promise<Pipeline> {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
    }

    return pipeline;
  }

  /**
   * 更新流水线配置
   */
  async updatePipeline(
    pipelineId: string,
    updatePipelineDto: UpdatePipelineDto,
  ): Promise<Pipeline> {
    const pipeline = await this.getPipeline(pipelineId);

    // 如果要更新名称，检查是否与其他流水线冲突
    if (updatePipelineDto.name && updatePipelineDto.name !== pipeline.name) {
      const existingPipeline = await this.prisma.pipeline.findUnique({
        where: {
          projectId_name: {
            projectId: pipeline.projectId,
            name: updatePipelineDto.name,
          },
        },
      });

      if (existingPipeline) {
        throw new BadRequestException(
          `Pipeline with name "${updatePipelineDto.name}" already exists`,
        );
      }
    }

    const updatedPipeline = await this.prisma.pipeline.update({
      where: { id: pipelineId },
      data: {
        name: updatePipelineDto.name,
        config: updatePipelineDto.config
          ? (updatePipelineDto.config as never)
          : undefined,
        triggers: updatePipelineDto.triggers,
        active: updatePipelineDto.active,
      },
    });

    this.logger.log(`Pipeline updated: ${pipelineId}`);

    return updatedPipeline;
  }

  /**
   * 删除流水线
   */
  async deletePipeline(pipelineId: string): Promise<void> {
    await this.getPipeline(pipelineId); // 验证存在性

    await this.prisma.pipeline.delete({
      where: { id: pipelineId },
    });

    this.logger.log(`Pipeline deleted: ${pipelineId}`);
  }

  /**
   * 触发流水线运行
   * ECP-C2: Systematic Error Handling - 捕获所有可能的错误
   */
  async triggerPipeline(
    pipelineId: string,
    triggerPipelineDto: TriggerPipelineDto,
  ): Promise<PipelineRun> {
    const pipeline = await this.getPipeline(pipelineId);

    // 检查流水线是否激活
    if (!pipeline.active) {
      throw new BadRequestException('Pipeline is not active');
    }

    // 创建运行记录
    const run = await this.prisma.pipelineRun.create({
      data: {
        pipelineId,
        commitSha: triggerPipelineDto.commitSha,
        branch: triggerPipelineDto.branch,
        status: PipelineStatus.PENDING,
        metadata: triggerPipelineDto.metadata || {},
      },
    });

    this.logger.log(
      `Pipeline triggered: ${pipelineId}, run ID: ${run.id}, commit: ${triggerPipelineDto.commitSha}`,
    );

    // 异步执行流水线（不阻塞响应）
    // 生产环境应使用 Bull Queue 或 BullMQ 替换 setTimeout
    this.executePipelineAsync(run.id, pipeline).catch((error) => {
      this.logger.error(
        `Pipeline execution failed for run ${run.id}: ${error.message}`,
      );
    });

    return run;
  }

  /**
   * 获取流水线运行历史
   * ECP-C3: Performance Awareness - 分页查询和索引优化
   */
  async getPipelineRuns(
    pipelineId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ runs: PipelineRun[]; total: number }> {
    await this.getPipeline(pipelineId); // 验证流水线存在

    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      this.prisma.pipelineRun.findMany({
        where: { pipelineId },
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.pipelineRun.count({ where: { pipelineId } }),
    ]);

    return { runs, total };
  }

  /**
   * 获取单个运行记录
   */
  async getPipelineRun(runId: string): Promise<PipelineRunWithPipeline> {
    const run = await this.prisma.pipelineRun.findUnique({
      where: { id: runId },
      include: { pipeline: true },
    });

    if (!run) {
      throw new NotFoundException(`Pipeline run with ID ${runId} not found`);
    }

    return run;
  }

  /**
   * 更新流水线运行状态
   * 用于外部CI系统回调
   * ECP-C1: Defensive Programming - 验证状态转换合法性
   */
  async updatePipelineStatus(
    runId: string,
    updateStatusDto: UpdatePipelineStatusDto,
  ): Promise<PipelineRun> {
    const run = await this.getPipelineRun(runId);

    // 状态转换验证
    const validTransitions: Record<PipelineStatus, PipelineStatus[]> = {
      PENDING: [
        PipelineStatus.RUNNING,
        PipelineStatus.CANCELLED,
        PipelineStatus.FAILURE,
      ],
      RUNNING: [
        PipelineStatus.SUCCESS,
        PipelineStatus.FAILURE,
        PipelineStatus.CANCELLED,
      ],
      SUCCESS: [], // 终态
      FAILURE: [], // 终态
      CANCELLED: [], // 终态
    };

    if (!validTransitions[run.status].includes(updateStatusDto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${run.status} to ${updateStatusDto.status}`,
      );
    }

    // 更新状态
    const updatedRun = await this.prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status: updateStatusDto.status,
        duration: updateStatusDto.duration,
        logs: updateStatusDto.logs,
        finishedAt:
          updateStatusDto.status === PipelineStatus.SUCCESS ||
          updateStatusDto.status === PipelineStatus.FAILURE ||
          updateStatusDto.status === PipelineStatus.CANCELLED
            ? new Date()
            : undefined,
      },
    });

    this.logger.log(
      `Pipeline run status updated: ${runId} -> ${updateStatusDto.status}`,
    );

    return updatedRun;
  }

  /**
   * 获取项目的所有流水线运行记录（跨流水线查询）
   */
  async getProjectPipelineRuns(
    projectId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ runs: PipelineRun[]; total: number }> {
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      this.prisma.pipelineRun.findMany({
        where: {
          pipeline: {
            projectId,
          },
        },
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          pipeline: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.pipelineRun.count({
        where: {
          pipeline: {
            projectId,
          },
        },
      }),
    ]);

    return { runs, total };
  }

  /**
   * 异步执行流水线
   * ECP-D2: Why注释 - 简化版实现，生产环境应使用消息队列(Bull/BullMQ)
   *
   * 执行流程：
   * 1. 更新状态为 RUNNING
   * 2. 模拟执行步骤 (实际应调用外部CI系统或Webhook)
   * 3. 更新最终状态 (SUCCESS/FAILURE)
   */
  private async executePipelineAsync(
    runId: string,
    pipeline: Pipeline,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. 更新状态为 RUNNING
      await this.prisma.pipelineRun.update({
        where: { id: runId },
        data: {
          status: PipelineStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      this.logger.log(`Pipeline run ${runId} started`);

      // 2. 模拟执行流水线步骤
      // 实际实现应该：
      // - 解析 pipeline.config (YAML/JSON格式的构建配置)
      // - 调用外部CI系统 (Jenkins, GitHub Actions, GitLab CI)
      // - 或通过 Webhook 通知外部执行器
      // - 或使用容器运行时 (Docker, Kubernetes Jobs)

      const config = pipeline.config as any;
      const steps = config?.steps || [];
      const logs: string[] = [];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        logs.push(
          `[Step ${i + 1}/${steps.length}] ${step.name || `Step ${i + 1}`}`,
        );

        // 模拟步骤执行时间 (实际应等待真实执行)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        logs.push(`[Step ${i + 1}] Completed successfully`);
      }

      // 如果没有配置步骤，执行默认流程
      if (steps.length === 0) {
        logs.push('[INFO] No steps configured, using default pipeline');
        logs.push('[STEP] Checkout code');
        await new Promise((resolve) => setTimeout(resolve, 500));
        logs.push('[STEP] Install dependencies');
        await new Promise((resolve) => setTimeout(resolve, 500));
        logs.push('[STEP] Run tests');
        await new Promise((resolve) => setTimeout(resolve, 500));
        logs.push('[STEP] Build artifacts');
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const duration = Date.now() - startTime;

      // 3. 更新为成功状态
      await this.prisma.pipelineRun.update({
        where: { id: runId },
        data: {
          status: PipelineStatus.SUCCESS,
          duration,
          logs: logs.join('\n'),
          finishedAt: new Date(),
        },
      });

      this.logger.log(
        `Pipeline run ${runId} completed successfully in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      // 更新为失败状态
      await this.prisma.pipelineRun.update({
        where: { id: runId },
        data: {
          status: PipelineStatus.FAILURE,
          duration,
          logs: `Error: ${error.message}\n${error.stack}`,
          finishedAt: new Date(),
        },
      });

      this.logger.error(
        `Pipeline run ${runId} failed after ${duration}ms: ${error.message}`,
      );
      throw error;
    }
  }
}
