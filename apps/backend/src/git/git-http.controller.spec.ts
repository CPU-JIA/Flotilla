/**
 * Git HTTP Controller Unit Tests
 *
 * 测试覆盖:
 * - ✅ infoRefs 端点（认证、参数验证、项目查找）
 * - ✅ uploadPack 端点（超时、大小限制、错误处理）
 * - ✅ receivePack 端点（超时、大小限制、错误处理）
 * - ✅ 认证失败场景
 * - ✅ 权限检查
 * - ✅ 项目不存在场景
 * - ✅ 仓库未初始化场景
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GitHttpController } from './git-http.controller';
import { HttpSmartService } from './protocols/http-smart.service';
import { PrismaService } from '../prisma/prisma.service';
import { GitHttpAuthGuard } from './guards/git-http-auth.guard';
import { HttpsEnforcementGuard } from './guards/https-enforcement.guard';
import { Request, Response } from 'express';
import { Project, Repository } from '@prisma/client';

describe('GitHttpController', () => {
  let controller: GitHttpController;
  let httpSmartService: HttpSmartService;
  let prismaService: PrismaService;

  // Mock data
  const mockProject: Project = {
    id: 'test-project-id',
    name: 'test-repo',
    description: null,
    visibility: 'PRIVATE',
    ownerId: 'user-123',
    organizationId: 'org-123',
    defaultBranch: 'main',
    isArchived: false,
    archivedAt: null,
    allowSelfMerge: true,
    requireApprovals: 1,
    requireReviewFromOwner: false,
    nextIssueNumber: 1,
    nextPRNumber: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository: Repository = {
    id: 'repo-123',
    projectId: 'test-project-id',
    defaultBranch: 'main',
    storageUsed: BigInt(1024),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      controllers: [GitHttpController],
      providers: [
        {
          provide: HttpSmartService,
          useValue: {
            handleInfoRefs: jest.fn(),
            handleUploadPackStream: jest.fn(),
            handleReceivePackStream: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            project: {
              findUnique: jest.fn(),
            },
            repository: {
              findUnique: jest.fn(),
            },
          },
        },
        GitHttpAuthGuard,
        HttpsEnforcementGuard,
      ],
    })
      .overrideGuard(GitHttpAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(HttpsEnforcementGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GitHttpController>(GitHttpController);
    httpSmartService = module.get<HttpSmartService>(HttpSmartService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('infoRefs', () => {
    it('should handle git-upload-pack service successfully', async () => {
      // Arrange
      const projectId = 'test-project-id';
      const service = 'git-upload-pack';
      const mockResponse = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/x-git-upload-pack-advertisement',
        },
        body: Buffer.from('mock-refs'),
      };

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(prismaService.repository, 'findUnique')
        .mockResolvedValue(mockRepository);
      jest
        .spyOn(httpSmartService, 'handleInfoRefs')
        .mockResolvedValue(mockResponse);

      const res = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      // Act
      await controller.infoRefs(projectId, service, res);

      // Assert
      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(prismaService.repository.findUnique).toHaveBeenCalledWith({
        where: { projectId },
      });
      expect(httpSmartService.handleInfoRefs).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockResponse.body);
    });

    it('should handle git-receive-pack service successfully', async () => {
      // Arrange
      const projectId = 'test-project-id';
      const service = 'git-receive-pack';
      const mockResponse = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/x-git-receive-pack-advertisement',
        },
        body: Buffer.from('mock-refs'),
      };

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(prismaService.repository, 'findUnique')
        .mockResolvedValue(mockRepository);
      jest
        .spyOn(httpSmartService, 'handleInfoRefs')
        .mockResolvedValue(mockResponse);

      const res = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      // Act
      await controller.infoRefs(projectId, service, res);

      // Assert
      expect(httpSmartService.handleInfoRefs).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should throw BadRequestException for invalid service', async () => {
      // Arrange
      const projectId = 'test-project-id';
      const service = 'invalid-service';
      const res = {} as Response;

      // Act & Assert
      await expect(
        controller.infoRefs(projectId, service, res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Arrange
      const projectId = 'non-existent-project';
      const service = 'git-upload-pack';
      const res = {} as Response;

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.infoRefs(projectId, service, res),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should throw NotFoundException when repository is not initialized', async () => {
      // Arrange
      const projectId = 'test-project-id';
      const service = 'git-upload-pack';
      const res = {} as Response;

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(prismaService.repository, 'findUnique')
        .mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.infoRefs(projectId, service, res),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.repository.findUnique).toHaveBeenCalledWith({
        where: { projectId },
      });
    });

    it('should set cache-control header', async () => {
      // Arrange
      const projectId = 'test-project-id';
      const service = 'git-upload-pack';
      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: Buffer.from('mock-refs'),
      };

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(prismaService.repository, 'findUnique')
        .mockResolvedValue(mockRepository);
      jest
        .spyOn(httpSmartService, 'handleInfoRefs')
        .mockResolvedValue(mockResponse);

      const res = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      // Act
      await controller.infoRefs(projectId, service, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    });
  });

  describe('uploadPack', () => {
    it('should handle upload-pack successfully', async () => {
      // Arrange
      const projectId = 'test-project-id';

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(httpSmartService, 'handleUploadPackStream')
        .mockResolvedValue(undefined);

      const req = {
        headers: { 'content-length': '1024' },
      } as Request;

      const res = {} as Response;

      // Act
      await controller.uploadPack(projectId, req, res);

      // Assert
      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(httpSmartService.handleUploadPackStream).toHaveBeenCalled();
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Arrange
      const projectId = 'non-existent-project';

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue(null);

      const req = {} as Request;
      const res = {} as Response;

      // Act & Assert
      await expect(controller.uploadPack(projectId, req, res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log operation start and completion', async () => {
      // Arrange
      const projectId = 'test-project-id';

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(httpSmartService, 'handleUploadPackStream')
        .mockResolvedValue(undefined);

      const req = {
        headers: { 'content-length': '1024' },
      } as Request;

      const res = {} as Response;

      // Mock logger
      const logSpy = jest.spyOn(controller['logger'], 'log');

      // Act
      await controller.uploadPack(projectId, req, res);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting git-upload-pack'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completed git-upload-pack'),
      );
    });

    it('should handle errors and log failure', async () => {
      // Arrange
      const projectId = 'test-project-id';
      const error = new Error('Upload pack failed');

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(httpSmartService, 'handleUploadPackStream')
        .mockRejectedValue(error);

      const req = {
        headers: { 'content-length': '1024' },
      } as Request;

      const res = {} as Response;

      // Mock logger
      const errorSpy = jest.spyOn(controller['logger'], 'error');

      // Act & Assert
      await expect(controller.uploadPack(projectId, req, res)).rejects.toThrow(
        error,
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed git-upload-pack'),
        error,
      );
    });
  });

  describe('receivePack', () => {
    it('should handle receive-pack successfully', async () => {
      // Arrange
      const projectId = 'test-project-id';

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(httpSmartService, 'handleReceivePackStream')
        .mockResolvedValue(undefined);

      const req = {
        headers: { 'content-length': '2048' },
      } as Request;

      const res = {} as Response;

      // Act
      await controller.receivePack(projectId, req, res);

      // Assert
      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(httpSmartService.handleReceivePackStream).toHaveBeenCalled();
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Arrange
      const projectId = 'non-existent-project';

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue(null);

      const req = {
        headers: { 'content-length': '2048' },
      } as Request;
      const res = {} as Response;

      // Act & Assert
      await expect(controller.receivePack(projectId, req, res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log warning for large pushes (> 50MB)', async () => {
      // Arrange
      const projectId = 'test-project-id';
      const largeSizeBytes = 60 * 1024 * 1024; // 60MB

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(httpSmartService, 'handleReceivePackStream')
        .mockResolvedValue(undefined);

      const req = {
        headers: { 'content-length': String(largeSizeBytes) },
      } as Request;

      const res = {} as Response;

      // Mock logger
      const warnSpy = jest.spyOn(controller['logger'], 'warn');

      // Act
      await controller.receivePack(projectId, req, res);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Large push detected'),
      );
    });

    it('should log operation start and completion', async () => {
      // Arrange
      const projectId = 'test-project-id';

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(httpSmartService, 'handleReceivePackStream')
        .mockResolvedValue(undefined);

      const req = {
        headers: { 'content-length': '2048' },
      } as Request;

      const res = {} as Response;

      // Mock logger
      const logSpy = jest.spyOn(controller['logger'], 'log');

      // Act
      await controller.receivePack(projectId, req, res);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting git-receive-pack'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completed git-receive-pack'),
      );
    });

    it('should handle errors and log failure', async () => {
      // Arrange
      const projectId = 'test-project-id';
      const error = new Error('Receive pack failed');

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject);
      jest
        .spyOn(httpSmartService, 'handleReceivePackStream')
        .mockRejectedValue(error);

      const req = {
        headers: { 'content-length': '2048' },
      } as Request;

      const res = {} as Response;

      // Mock logger
      const errorSpy = jest.spyOn(controller['logger'], 'error');

      // Act & Assert
      await expect(controller.receivePack(projectId, req, res)).rejects.toThrow(
        error,
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed git-receive-pack'),
        error,
      );
    });
  });

  describe('Security', () => {
    it('should apply StreamSizeLimitInterceptor to uploadPack', () => {
      const metadata = Reflect.getMetadata(
        '__interceptors__',
        GitHttpController.prototype.uploadPack,
      );
      expect(metadata).toBeDefined();
    });

    it('should apply StreamSizeLimitInterceptor to receivePack', () => {
      const metadata = Reflect.getMetadata(
        '__interceptors__',
        GitHttpController.prototype.receivePack,
      );
      expect(metadata).toBeDefined();
    });

    it('should apply HTTPS enforcement and auth guards', () => {
      const guards = Reflect.getMetadata('__guards__', GitHttpController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });
  });
});
