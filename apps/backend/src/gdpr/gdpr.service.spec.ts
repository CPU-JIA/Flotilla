import { Test, TestingModule } from '@nestjs/testing';
import { GdprService } from './gdpr.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { DataExportFormat, DataExportStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('GdprService', () => {
  let service: GdprService;
  let _prismaService: PrismaService;
  let _minioService: MinioService;
  let _emailService: EmailService;
  let _configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    dataExportRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    organizationMember: {
      findMany: jest.fn(),
    },
    teamMember: {
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    issue: {
      findMany: jest.fn(),
    },
    issueAssignee: {
      findMany: jest.fn(),
    },
    issueComment: {
      findMany: jest.fn(),
    },
    pullRequest: {
      findMany: jest.fn(),
    },
    pRAssignee: {
      findMany: jest.fn(),
    },
    pRComment: {
      findMany: jest.fn(),
    },
    pRReview: {
      findMany: jest.fn(),
    },
    commit: {
      findMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
  };

  const mockMinioService = {
    uploadFile: jest.fn(),
    getFileUrl: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GdprService>(GdprService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _minioService = module.get<MinioService>(MinioService);
    _emailService = module.get<EmailService>(EmailService);
    _configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestExport', () => {
    it('should create a new export request', async () => {
      const userId = 'user-123';
      const dto = { format: DataExportFormat.JSON };

      mockPrismaService.dataExportRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.dataExportRequest.create.mockResolvedValue({
        id: 'export-123',
        userId,
        format: DataExportFormat.JSON,
        status: DataExportStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.requestExport(userId, dto as any);

      expect(result.id).toBe('export-123');
      expect(result.status).toBe(DataExportStatus.PENDING);
      expect(
        mockPrismaService.dataExportRequest.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          userId,
          status: {
            in: [DataExportStatus.PENDING, DataExportStatus.PROCESSING],
          },
        },
      });
      expect(mockPrismaService.dataExportRequest.create).toHaveBeenCalled();
    });

    it('should throw error if pending export exists', async () => {
      const userId = 'user-123';
      const dto = { format: DataExportFormat.JSON };

      mockPrismaService.dataExportRequest.findFirst.mockResolvedValue({
        id: 'existing-export',
        userId,
        status: DataExportStatus.PENDING,
      });

      await expect(service.requestExport(userId, dto as any)).rejects.toThrow(
        'You already have a pending export request',
      );
    });
  });

  describe('collectUserData', () => {
    it('should collect all user data', async () => {
      const userId = 'user-123';

      // Mock user data
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        avatar: null,
        bio: 'Test bio',
        role: 'USER',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock empty collections
      mockPrismaService.organizationMember.findMany.mockResolvedValue([]);
      mockPrismaService.teamMember.findMany.mockResolvedValue([]);
      mockPrismaService.project.findMany.mockResolvedValue([]);
      mockPrismaService.issue.findMany.mockResolvedValue([]);
      mockPrismaService.issueAssignee.findMany.mockResolvedValue([]);
      mockPrismaService.issueComment.findMany.mockResolvedValue([]);
      mockPrismaService.pullRequest.findMany.mockResolvedValue([]);
      mockPrismaService.pRAssignee.findMany.mockResolvedValue([]);
      mockPrismaService.pRComment.findMany.mockResolvedValue([]);
      mockPrismaService.pRReview.findMany.mockResolvedValue([]);
      mockPrismaService.commit.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.collectUserData(userId);

      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('test@example.com');
      expect(result.exportDate).toBeDefined();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'nonexistent-user';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.collectUserData(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getExportStatus', () => {
    it('should return export status for valid request', async () => {
      const exportId = 'export-123';
      const userId = 'user-123';

      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue({
        id: exportId,
        userId,
        format: DataExportFormat.JSON,
        status: DataExportStatus.COMPLETED,
        filePath: 'path/to/file',
        fileSize: 1024,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getExportStatus(exportId, userId);

      expect(result.id).toBe(exportId);
      expect(result.status).toBe(DataExportStatus.COMPLETED);
    });

    it('should throw error if export not found', async () => {
      const exportId = 'nonexistent';
      const userId = 'user-123';

      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue(null);

      await expect(service.getExportStatus(exportId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if user does not own the export', async () => {
      const exportId = 'export-123';
      const userId = 'user-123';
      const wrongUserId = 'user-456';

      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue({
        id: exportId,
        userId: wrongUserId,
        status: DataExportStatus.COMPLETED,
      });

      await expect(service.getExportStatus(exportId, userId)).rejects.toThrow(
        'Unauthorized access to export request',
      );
    });
  });

  describe('getUserExports', () => {
    it('should return user export history', async () => {
      const userId = 'user-123';
      const mockExports = [
        {
          id: 'export-1',
          userId,
          format: DataExportFormat.JSON,
          status: DataExportStatus.COMPLETED,
          createdAt: new Date(),
        },
        {
          id: 'export-2',
          userId,
          format: DataExportFormat.CSV,
          status: DataExportStatus.PENDING,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.dataExportRequest.findMany.mockResolvedValue(
        mockExports,
      );

      const result = await service.getUserExports(userId);

      expect(result).toEqual(mockExports);
      expect(mockPrismaService.dataExportRequest.findMany).toHaveBeenCalledWith(
        {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      );
    });
  });

  describe('downloadExport', () => {
    it('should return download URL for completed export', async () => {
      const exportId = 'export-123';
      const userId = 'user-123';
      const filePath = 'path/to/file.json';
      const fileSize = 1024;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue({
        id: exportId,
        userId,
        format: DataExportFormat.JSON,
        status: DataExportStatus.COMPLETED,
        filePath,
        fileSize,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockMinioService.getFileUrl.mockResolvedValue(
        'http://minio.example.com/download-url',
      );

      const result = await service.downloadExport(exportId, userId);

      expect(result.url).toBe('http://minio.example.com/download-url');
      expect(result.fileName).toContain('flotilla-data-export-json.json');
      expect(result.fileSize).toBe(fileSize);
      expect(mockMinioService.getFileUrl).toHaveBeenCalledWith(filePath, 3600);
    });

    it('should throw error if export is not completed', async () => {
      const exportId = 'export-123';
      const userId = 'user-123';

      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue({
        id: exportId,
        userId,
        status: DataExportStatus.PROCESSING,
      });

      await expect(service.downloadExport(exportId, userId)).rejects.toThrow(
        'Export is not ready for download',
      );
    });

    it('should throw error and mark as expired if file has expired', async () => {
      const exportId = 'export-123';
      const userId = 'user-123';
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue({
        id: exportId,
        userId,
        status: DataExportStatus.COMPLETED,
        filePath: 'path/to/file.json',
        expiresAt,
      });

      mockPrismaService.dataExportRequest.update.mockResolvedValue({});

      await expect(service.downloadExport(exportId, userId)).rejects.toThrow(
        'Export file has expired',
      );

      expect(mockPrismaService.dataExportRequest.update).toHaveBeenCalledWith({
        where: { id: exportId },
        data: { status: DataExportStatus.EXPIRED },
      });
    });
  });

  describe('cleanupExpiredExports', () => {
    it('should cleanup expired exports', async () => {
      const expiredExports = [
        {
          id: 'export-1',
          userId: 'user-123',
          filePath: 'path/to/file1.json',
          status: DataExportStatus.COMPLETED,
          expiresAt: new Date(Date.now() - 1000),
        },
        {
          id: 'export-2',
          userId: 'user-456',
          filePath: 'path/to/file2.json',
          status: DataExportStatus.COMPLETED,
          expiresAt: new Date(Date.now() - 2000),
        },
      ];

      mockPrismaService.dataExportRequest.findMany.mockResolvedValue(
        expiredExports,
      );
      mockMinioService.deleteFile.mockResolvedValue(undefined);
      mockPrismaService.dataExportRequest.update.mockResolvedValue({});

      await service.cleanupExpiredExports();

      expect(mockPrismaService.dataExportRequest.findMany).toHaveBeenCalled();
      expect(mockMinioService.deleteFile).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.dataExportRequest.update).toHaveBeenCalledTimes(
        2,
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      const expiredExports = [
        {
          id: 'export-1',
          userId: 'user-123',
          filePath: 'path/to/file.json',
          status: DataExportStatus.COMPLETED,
          expiresAt: new Date(Date.now() - 1000),
        },
      ];

      mockPrismaService.dataExportRequest.findMany.mockResolvedValue(
        expiredExports,
      );
      mockMinioService.deleteFile.mockRejectedValue(new Error('MinIO error'));

      // Should not throw
      await expect(service.cleanupExpiredExports()).resolves.not.toThrow();
    });
  });
});
