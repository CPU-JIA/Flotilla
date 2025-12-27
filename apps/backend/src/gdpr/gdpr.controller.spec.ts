import { Test, TestingModule } from '@nestjs/testing';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import { DataExportFormat, DataExportStatus, User } from '@prisma/client';

describe('GdprController', () => {
  let controller: GdprController;
  let _gdprService: GdprService;

  const mockGdprService = {
    requestExport: jest.fn(),
    getExportStatus: jest.fn(),
    getUserExports: jest.fn(),
    downloadExport: jest.fn(),
  };

  // ECP-A1: 测试使用部分 Mock User，使用双重断言绕过类型检查
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  } as unknown as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [
        {
          provide: GdprService,
          useValue: mockGdprService,
        },
      ],
    }).compile();

    controller = module.get<GdprController>(GdprController);
    _gdprService = module.get<GdprService>(GdprService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestExport', () => {
    it('should create a new export request', async () => {
      const dto = { format: DataExportFormat.JSON };
      const mockExportRequest = {
        id: 'export-123',
        userId: mockUser.id,
        format: DataExportFormat.JSON,
        status: DataExportStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGdprService.requestExport.mockResolvedValue(mockExportRequest);

      const result = await controller.requestExport(mockUser, dto as any);

      expect(result.id).toBe('export-123');
      expect(result.format).toBe(DataExportFormat.JSON);
      expect(result.status).toBe(DataExportStatus.PENDING);
      expect(result.message).toContain('email when it is ready');
      expect(mockGdprService.requestExport).toHaveBeenCalledWith(
        mockUser.id,
        dto,
      );
    });

    it('should handle CSV format request', async () => {
      const dto = { format: DataExportFormat.CSV };
      const mockExportRequest = {
        id: 'export-456',
        userId: mockUser.id,
        format: DataExportFormat.CSV,
        status: DataExportStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGdprService.requestExport.mockResolvedValue(mockExportRequest);

      const result = await controller.requestExport(mockUser, dto as any);

      expect(result.format).toBe(DataExportFormat.CSV);
      expect(mockGdprService.requestExport).toHaveBeenCalledWith(
        mockUser.id,
        dto,
      );
    });
  });

  describe('getExportStatus', () => {
    it('should return export status', async () => {
      const exportId = 'export-123';
      const mockStatus = {
        id: exportId,
        userId: mockUser.id,
        format: DataExportFormat.JSON,
        status: DataExportStatus.PROCESSING,
        filePath: null,
        fileSize: null,
        expiresAt: null,
        errorMsg: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGdprService.getExportStatus.mockResolvedValue(mockStatus);

      const result = await controller.getExportStatus(mockUser, exportId);

      expect(result).toEqual(mockStatus);
      expect(mockGdprService.getExportStatus).toHaveBeenCalledWith(
        exportId,
        mockUser.id,
      );
    });

    it('should return completed export status', async () => {
      const exportId = 'export-123';
      const mockStatus = {
        id: exportId,
        userId: mockUser.id,
        format: DataExportFormat.JSON,
        status: DataExportStatus.COMPLETED,
        filePath: 'path/to/file.json',
        fileSize: 1024,
        expiresAt: new Date(),
        errorMsg: null,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGdprService.getExportStatus.mockResolvedValue(mockStatus);

      const result = await controller.getExportStatus(mockUser, exportId);

      expect(result.status).toBe(DataExportStatus.COMPLETED);
      expect(result.filePath).toBeDefined();
      expect(result.fileSize).toBeDefined();
    });
  });

  describe('getUserExports', () => {
    it('should return user export history', async () => {
      const mockExports = [
        {
          id: 'export-1',
          userId: mockUser.id,
          format: DataExportFormat.JSON,
          status: DataExportStatus.COMPLETED,
          filePath: 'path/to/file1.json',
          fileSize: 1024,
          expiresAt: new Date(),
          errorMsg: null,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'export-2',
          userId: mockUser.id,
          format: DataExportFormat.CSV,
          status: DataExportStatus.PENDING,
          filePath: null,
          fileSize: null,
          expiresAt: null,
          errorMsg: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGdprService.getUserExports.mockResolvedValue(mockExports);

      const result = await controller.getUserExports(mockUser);

      expect(result).toEqual(mockExports);
      expect(result).toHaveLength(2);
      expect(mockGdprService.getUserExports).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return empty array if no exports', async () => {
      mockGdprService.getUserExports.mockResolvedValue([]);

      const result = await controller.getUserExports(mockUser);

      expect(result).toEqual([]);
      expect(mockGdprService.getUserExports).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('downloadExport', () => {
    it('should return download URL for completed export', async () => {
      const exportId = 'export-123';
      const mockDownload = {
        url: 'http://minio.example.com/download-url',
        fileName: 'flotilla-data-export-json.json',
        fileSize: 1024,
        expiresAt: new Date(),
      };

      mockGdprService.downloadExport.mockResolvedValue(mockDownload);

      const result = await controller.downloadExport(mockUser, exportId);

      expect(result.url).toBe(mockDownload.url);
      expect(result.fileName).toContain('flotilla-data-export');
      expect(result.fileSize).toBe(1024);
      expect(mockGdprService.downloadExport).toHaveBeenCalledWith(
        exportId,
        mockUser.id,
      );
    });

    it('should return CSV download URL', async () => {
      const exportId = 'export-456';
      const mockDownload = {
        url: 'http://minio.example.com/download-url-csv',
        fileName: 'flotilla-data-export-csv.csv',
        fileSize: 2048,
        expiresAt: new Date(),
      };

      mockGdprService.downloadExport.mockResolvedValue(mockDownload);

      const result = await controller.downloadExport(mockUser, exportId);

      expect(result.fileName).toContain('.csv');
      expect(result.fileSize).toBe(2048);
    });
  });
});
