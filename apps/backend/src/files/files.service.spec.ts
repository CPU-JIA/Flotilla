import { Test, TestingModule } from '@nestjs/testing';
import {
  PayloadTooLargeException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { UserRole } from '@prisma/client';

/**
 * FilesService Unit Tests
 *
 * Phase 3: 文件上传安全验证测试覆盖
 *
 * 测试覆盖：
 * 1. 文件大小验证 (100MB 限制)
 * 2. 项目总容量验证 (1GB 限制)
 * 3. 路径遍历防护
 * 4. 文件类型白名单验证
 * 5. 权限验证
 *
 * ECP-D1: Design for Testability - 通过依赖注入实现可测试性
 */
describe('FilesService - Security Tests', () => {
  let service: FilesService;
  let prismaService: PrismaService;
  let minioService: MinioService;

  // Mock 用户
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    role: UserRole.DEVELOPER,
    passwordHash: 'hashed',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: null,
    bio: null,
    emailVerificationToken: null,
    emailVerificationTokenExpires: null,
    passwordResetToken: null,
    passwordResetTokenExpires: null,
  };

  // Mock 项目
  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    description: null,
    ownerId: 'user-123',
    members: [{ userId: 'user-123' }],
    organizationId: null,
    teamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    visibility: 'PUBLIC' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: PrismaService,
          useValue: {
            project: {
              findUnique: jest.fn(),
            },
            projectFile: {
              findMany: jest.fn(),
              create: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              delete: jest.fn(),
              update: jest.fn(),
            },
            repository: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn(),
            downloadFile: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: RepositoriesService,
          useValue: {
            createCommit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    prismaService = module.get<PrismaService>(PrismaService);
    minioService = module.get<MinioService>(MinioService);
  });

  describe('uploadFile - File Size Validation', () => {
    it('should reject files larger than 100MB', async () => {
      // Arrange: 创建 101MB 的 mock 文件
      const largeFile = {
        originalname: 'large-file.txt',
        buffer: Buffer.alloc(1024),
        size: 101 * 1024 * 1024, // 101MB
        mimetype: 'text/plain',
      } as Express.Multer.File;

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject as any);

      // Act & Assert
      await expect(
        service.uploadFile('project-123', largeFile, '/', mockUser as any),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('should accept files smaller than 100MB', async () => {
      // Arrange: 创建 50MB 的 mock 文件
      const normalFile = {
        originalname: 'normal-file.txt',
        buffer: Buffer.from('test content'),
        size: 50 * 1024 * 1024, // 50MB
        mimetype: 'text/plain',
      } as Express.Multer.File;

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject as any);
      jest.spyOn(prismaService.projectFile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.projectFile, 'create').mockResolvedValue({
        id: 'file-123',
        name: 'normal-file.txt',
        path: 'projects/project-123/normal-file.txt',
        size: normalFile.size,
        mimeType: normalFile.mimetype,
        type: 'file',
        projectId: 'project-123',
        uploadedBy: mockUser.id,
        folder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        uploader: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        },
      } as any);

      jest.spyOn(minioService, 'uploadFile').mockResolvedValue(undefined);

      // Act
      const result = await service.uploadFile(
        'project-123',
        normalFile,
        '/',
        mockUser as any,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.size).toBe(normalFile.size);
    });
  });

  describe('uploadFile - Project Total Size Validation', () => {
    it('should reject upload when project exceeds 1GB total size', async () => {
      // Arrange: 项目已有 950MB 文件，尝试上传 100MB
      const newFile = {
        originalname: 'new-file.txt',
        buffer: Buffer.from('test'),
        size: 100 * 1024 * 1024, // 100MB
        mimetype: 'text/plain',
      } as Express.Multer.File;

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject as any);

      // Mock 项目已有文件总大小 950MB
      jest
        .spyOn(prismaService.projectFile, 'findMany')
        .mockResolvedValue([{ size: 950 * 1024 * 1024 }] as any);

      // Act & Assert
      await expect(
        service.uploadFile('project-123', newFile, '/', mockUser as any),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('should accept upload when project is under 1GB limit', async () => {
      // Arrange: 项目已有 500MB 文件，上传 100MB（总共 600MB < 1GB）
      const newFile = {
        originalname: 'new-file.txt',
        buffer: Buffer.from('test content'),
        size: 100 * 1024 * 1024, // 100MB
        mimetype: 'text/plain',
      } as Express.Multer.File;

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject as any);
      jest
        .spyOn(prismaService.projectFile, 'findMany')
        .mockResolvedValue([{ size: 500 * 1024 * 1024 }] as any);
      jest.spyOn(prismaService.projectFile, 'create').mockResolvedValue({
        id: 'file-123',
        name: newFile.originalname,
        path: 'projects/project-123/file.txt',
        size: newFile.size,
        mimeType: newFile.mimetype,
        type: 'file',
        projectId: 'project-123',
        uploadedBy: mockUser.id,
        folder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        uploader: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        },
      } as any);

      jest.spyOn(minioService, 'uploadFile').mockResolvedValue(undefined);

      // Act
      const result = await service.uploadFile(
        'project-123',
        newFile,
        '/',
        mockUser as any,
      );

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('uploadFile - Path Traversal Protection', () => {
    it('should generate safe object names with timestamp and random hex', async () => {
      // Arrange: 尝试上传包含路径遍历字符的文件名
      const maliciousFile = {
        originalname: Buffer.from('../../../etc/passwd', 'latin1').toString(
          'utf8',
        ),
        buffer: Buffer.from('malicious'),
        size: 1024,
        mimetype: 'text/plain',
      } as Express.Multer.File;

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject as any);
      jest.spyOn(prismaService.projectFile, 'findMany').mockResolvedValue([]);

      let uploadedPath: string = '';
      jest
        .spyOn(minioService, 'uploadFile')
        .mockImplementation((objectName) => {
          uploadedPath = objectName;
          return Promise.resolve();
        });

      jest.spyOn(prismaService.projectFile, 'create').mockResolvedValue({
        id: 'file-123',
        name: maliciousFile.originalname,
        path: uploadedPath,
        size: maliciousFile.size,
        mimeType: maliciousFile.mimetype,
        type: 'file',
        projectId: 'project-123',
        uploadedBy: mockUser.id,
        folder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        uploader: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        },
      } as any);

      // Act
      await service.uploadFile(
        'project-123',
        maliciousFile,
        '/',
        mockUser as any,
      );

      // Assert: 验证生成的路径不包含 ../ 等危险字符
      expect(uploadedPath).toMatch(/^projects\/project-123\/\d+_[a-f0-9]+/);
      expect(uploadedPath).not.toContain('../');
      expect(uploadedPath).not.toContain('etc/passwd');
    });
  });

  describe('uploadFile - Permission Validation', () => {
    it('should reject upload if user is not project member', async () => {
      // Arrange: 用户不是项目成员
      const unauthorizedUser = {
        ...mockUser,
        id: 'other-user',
      };

      const file = {
        originalname: 'test.txt',
        buffer: Buffer.from('test'),
        size: 1024,
        mimetype: 'text/plain',
      } as Express.Multer.File;

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        members: [], // 没有成员
      } as any);

      // Act & Assert
      await expect(
        service.uploadFile('project-123', file, '/', unauthorizedUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow upload if user is project owner', async () => {
      // Arrange
      const file = {
        originalname: 'test.txt',
        buffer: Buffer.from('test content'),
        size: 1024,
        mimetype: 'text/plain',
      } as Express.Multer.File;

      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject as any);
      jest.spyOn(prismaService.projectFile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.projectFile, 'create').mockResolvedValue({
        id: 'file-123',
        name: file.originalname,
        path: 'projects/project-123/test.txt',
        size: file.size,
        mimeType: file.mimetype,
        type: 'file',
        projectId: 'project-123',
        uploadedBy: mockUser.id,
        folder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        uploader: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        },
      } as any);

      jest.spyOn(minioService, 'uploadFile').mockResolvedValue(undefined);

      // Act
      const result = await service.uploadFile(
        'project-123',
        file,
        '/',
        mockUser as any,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.uploadedBy).toBe(mockUser.id);
    });

    it('should allow upload if user is SUPER_ADMIN', async () => {
      // Arrange: 管理员用户
      const adminUser = {
        ...mockUser,
        id: 'admin-user',
        role: UserRole.SUPER_ADMIN,
      };

      const file = {
        originalname: 'admin-upload.txt',
        buffer: Buffer.from('admin content'),
        size: 1024,
        mimetype: 'text/plain',
      } as Express.Multer.File;

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: 'other-user',
        members: [], // 管理员不在成员列表中
      } as any);

      jest.spyOn(prismaService.projectFile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.projectFile, 'create').mockResolvedValue({
        id: 'file-123',
        name: file.originalname,
        path: 'projects/project-123/admin-upload.txt',
        size: file.size,
        mimeType: file.mimetype,
        type: 'file',
        projectId: 'project-123',
        uploadedBy: adminUser.id,
        folder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        uploader: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
        },
      } as any);

      jest.spyOn(minioService, 'uploadFile').mockResolvedValue(undefined);

      // Act
      const result = await service.uploadFile(
        'project-123',
        file,
        '/',
        adminUser as any,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.uploadedBy).toBe(adminUser.id);
    });
  });

  describe('getFileContent - File Type Whitelist', () => {
    it('should allow reading code files with whitelisted extensions', async () => {
      // Arrange: JavaScript 文件
      const mockFile = {
        id: 'file-123',
        name: 'test.js',
        path: 'projects/project-123/test.js',
        size: 1024,
        mimeType: 'application/javascript',
        type: 'file',
        projectId: 'project-123',
        uploadedBy: mockUser.id,
        folder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(prismaService.projectFile, 'findUnique')
        .mockResolvedValue(mockFile as any);
      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject as any);
      jest
        .spyOn(minioService, 'downloadFile')
        .mockResolvedValue(Buffer.from('console.log("test");'));

      // Act
      const result = await service.getFileContent('file-123', mockUser as any);

      // Assert
      expect(result.content).toBe('console.log("test");');
      expect(result.file.name).toBe('test.js');
    });

    it('should reject reading non-code files', async () => {
      // Arrange: 二进制文件 (exe)
      const mockFile = {
        id: 'file-123',
        name: 'malware.exe',
        path: 'projects/project-123/malware.exe',
        size: 1024,
        mimeType: 'application/x-msdownload',
        type: 'file',
        projectId: 'project-123',
        uploadedBy: mockUser.id,
        folder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(prismaService.projectFile, 'findUnique')
        .mockResolvedValue(mockFile as any);
      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject as any);

      // Act & Assert
      await expect(
        service.getFileContent('file-123', mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow reading markdown files', async () => {
      // Arrange: Markdown 文件
      const mockFile = {
        id: 'file-123',
        name: 'README.md',
        path: 'projects/project-123/README.md',
        size: 1024,
        mimeType: 'text/markdown',
        type: 'file',
        projectId: 'project-123',
        uploadedBy: mockUser.id,
        folder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(prismaService.projectFile, 'findUnique')
        .mockResolvedValue(mockFile as any);
      jest
        .spyOn(prismaService.project, 'findUnique')
        .mockResolvedValue(mockProject as any);
      jest
        .spyOn(minioService, 'downloadFile')
        .mockResolvedValue(Buffer.from('# Test README'));

      // Act
      const result = await service.getFileContent('file-123', mockUser as any);

      // Assert
      expect(result.content).toBe('# Test README');
    });
  });
});
