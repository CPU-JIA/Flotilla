/**
 * Raft集群HTTP API控制器
 *
 * 提供RESTful API接口管理Raft集群
 * ECP-A1: 单一职责 - 专注于HTTP接口层
 * ECP-C1: 防御性编程 - 输入验证和错误处理
 * ECP-B3: 命名约定 - 清晰的API端点命名
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsArray, IsObject } from 'class-validator'
import { RaftClusterService } from './raft-cluster.service'
import { ClusterConfigService } from './cluster-config.service'
import { Public } from '../auth/decorators/public.decorator'
import type { Command, ClientResponse } from '../raft/types'

// DTO类定义
export class RaftCreateProjectDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsString()
  @IsNotEmpty()
  ownerId: string
}

export class RaftGitCommitDto {
  @IsString()
  @IsNotEmpty()
  repositoryId: string

  @IsString()
  @IsNotEmpty()
  branchName: string

  @IsString()
  @IsNotEmpty()
  message: string

  @IsObject()
  author: { name: string; email: string }

  @IsArray()
  files: Array<{ path: string; content: string; mimeType: string }>
}

export class RaftGitBranchDto {
  @IsString()
  @IsNotEmpty()
  repositoryId: string

  @IsString()
  @IsNotEmpty()
  branchName: string

  @IsString()
  @IsNotEmpty()
  fromBranch: string
}

export class RaftExecuteCommandDto {
  @IsString()
  @IsNotEmpty()
  type: string

  payload: any
}

@ApiTags('Raft Cluster')
@Controller('raft-cluster')
@Public()
export class RaftClusterController {
  private readonly logger = new Logger(RaftClusterController.name)

  constructor(
    private readonly clusterService: RaftClusterService,
    private readonly configService: ClusterConfigService,
  ) {}

  /**
   * 获取集群状态
   */
  @Get('status')
  @ApiOperation({ summary: '获取Raft集群状态' })
  @ApiResponse({ status: 200, description: '集群状态信息' })
  getClusterStatus() {
    try {
      return {
        success: true,
        data: this.clusterService.getClusterStatus(),
      }
    } catch (error) {
      this.logger.error('Failed to get cluster status:', error)
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 获取集群指标
   */
  @Get('metrics')
  @ApiOperation({ summary: '获取Raft集群性能指标' })
  @ApiResponse({ status: 200, description: '集群性能指标' })
  getClusterMetrics() {
    try {
      return {
        success: true,
        data: this.clusterService.getClusterMetrics(),
      }
    } catch (error) {
      this.logger.error('Failed to get cluster metrics:', error)
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 获取集群配置
   */
  @Get('config')
  @ApiOperation({ summary: '获取Raft集群配置' })
  @ApiResponse({ status: 200, description: '集群配置信息' })
  getClusterConfig() {
    try {
      const settings = this.configService.getClusterSettings()
      const validation = this.configService.validateConfig(settings)

      return {
        success: true,
        data: {
          settings,
          validation,
        },
      }
    } catch (error) {
      this.logger.error('Failed to get cluster config:', error)
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 启动集群
   */
  @Post('start')
  @ApiOperation({ summary: '启动Raft集群' })
  @ApiResponse({ status: 200, description: '集群启动成功' })
  @ApiResponse({ status: 500, description: '集群启动失败' })
  async startCluster() {
    try {
      await this.clusterService.startCluster()
      return {
        success: true,
        message: 'Raft cluster started successfully',
      }
    } catch (error) {
      this.logger.error('Failed to start cluster:', error)
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 停止集群
   */
  @Post('stop')
  @ApiOperation({ summary: '停止Raft集群' })
  @ApiResponse({ status: 200, description: '集群停止成功' })
  async stopCluster() {
    try {
      await this.clusterService.stopCluster()
      return {
        success: true,
        message: 'Raft cluster stopped successfully',
      }
    } catch (error) {
      this.logger.error('Failed to stop cluster:', error)
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 重启集群
   */
  @Post('restart')
  @ApiOperation({ summary: '重启Raft集群' })
  @ApiResponse({ status: 200, description: '集群重启成功' })
  async restartCluster() {
    try {
      await this.clusterService.restartCluster()
      return {
        success: true,
        message: 'Raft cluster restarted successfully',
      }
    } catch (error) {
      this.logger.error('Failed to restart cluster:', error)
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 执行通用命令
   */
  @Post('command')
  @ApiOperation({ summary: '执行分布式命令' })
  @ApiBody({ type: RaftExecuteCommandDto })
  @ApiResponse({ status: 200, description: '命令执行成功' })
  @ApiResponse({ status: 400, description: '命令格式错误' })
  @ApiResponse({ status: 503, description: '集群不可用' })
  async executeCommand(@Body() commandDto: RaftExecuteCommandDto) {
    try {
      if (!commandDto.type || !commandDto.payload) {
        throw new HttpException(
          {
            success: false,
            error: 'Command type and payload are required',
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      const command: Command = {
        type: commandDto.type as any,
        payload: commandDto.payload,
      }

      const result = await this.clusterService.executeCommand(command)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      this.logger.error('Failed to execute command:', error)

      if (error instanceof HttpException) {
        throw error
      }

      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 创建项目
   */
  @Post('projects')
  @ApiOperation({ summary: '通过Raft共识创建项目' })
  @ApiBody({ type: RaftCreateProjectDto })
  @ApiResponse({ status: 201, description: '项目创建成功' })
  async createProject(@Body() projectDto: RaftCreateProjectDto) {
    try {
      const result = await this.clusterService.createProject(projectDto)

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            error: result.error,
            leaderId: result.leaderId,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        )
      }

      return {
        success: true,
        data: result,
        message: 'Project created successfully through Raft consensus',
      }
    } catch (error) {
      this.logger.error('Failed to create project:', error)

      if (error instanceof HttpException) {
        throw error
      }

      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Git提交
   */
  @Post('git/commit')
  @ApiOperation({ summary: '通过Raft共识执行Git提交' })
  @ApiBody({ type: RaftGitCommitDto })
  @ApiResponse({ status: 200, description: 'Git提交成功' })
  async gitCommit(@Body() commitDto: RaftGitCommitDto) {
    try {
      const result = await this.clusterService.gitCommit(commitDto)

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            error: result.error,
            leaderId: result.leaderId,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        )
      }

      return {
        success: true,
        data: result,
        message: 'Git commit executed successfully through Raft consensus',
      }
    } catch (error) {
      this.logger.error('Failed to execute git commit:', error)

      if (error instanceof HttpException) {
        throw error
      }

      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Git创建分支
   */
  @Post('git/branch')
  @ApiOperation({ summary: '通过Raft共识创建Git分支' })
  @ApiBody({ type: RaftGitBranchDto })
  @ApiResponse({ status: 201, description: 'Git分支创建成功' })
  async gitCreateBranch(@Body() branchDto: RaftGitBranchDto) {
    try {
      const result = await this.clusterService.gitCreateBranch(branchDto)

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            error: result.error,
            leaderId: result.leaderId,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        )
      }

      return {
        success: true,
        data: result,
        message: 'Git branch created successfully through Raft consensus',
      }
    } catch (error) {
      this.logger.error('Failed to create git branch:', error)

      if (error instanceof HttpException) {
        throw error
      }

      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 健康检查
   */
  @Get('health')
  @ApiOperation({ summary: 'Raft集群健康检查' })
  @ApiResponse({ status: 200, description: '健康状态' })
  getHealth() {
    try {
      const status = this.clusterService.getClusterStatus()
      const isHealthy = status.status === 'running'

      return {
        success: true,
        healthy: isHealthy,
        status: status.status,
        isLeader: status.isLeader,
        currentTerm: status.currentTerm,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      this.logger.error('Health check failed:', error)
      return {
        success: false,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }
}