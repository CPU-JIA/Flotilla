/**
 * HTTP Smart Service Security Tests
 *
 * 🔒 SECURITY: Test security fixes for Git HTTP Smart Protocol
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HttpSmartService } from './http-smart.service';

describe('HttpSmartService - Security Tests', () => {
  let service: HttpSmartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpSmartService],
    }).compile();

    service = module.get<HttpSmartService>(HttpSmartService);
  });

  describe('CWE-78: Environment Variable Injection Prevention', () => {
    it('should reject projectId with path traversal', async () => {
      const maliciousOptions = {
        projectId: '../../../etc/passwd',
        service: 'git-upload-pack' as const,
        repoPath: '/tmp/test',
        pathInfo: '/info/refs',
      };

      await expect(
        service.executeGitHttpBackend(maliciousOptions),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject projectId with shell metacharacters', async () => {
      const maliciousProjectIds = [
        'project;rm -rf /',
        'project|whoami',
        'project`ls`',
        'project$(whoami)',
      ];

      for (const projectId of maliciousProjectIds) {
        const options = {
          projectId,
          service: 'git-upload-pack' as const,
          repoPath: '/tmp/test',
          pathInfo: '/info/refs',
        };

        await expect(service.executeGitHttpBackend(options)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should accept valid projectId (cuid format)', async () => {
      const validProjectId = 'cmhfopcmt000dxbu8rvmjvtse';

      // We can't fully test this without mocking spawn, but we can verify it doesn't throw validation error
      const options = {
        projectId: validProjectId,
        service: 'git-upload-pack' as const,
        repoPath: '/tmp/test',
        pathInfo: '/info/refs',
      };

      // This will fail because git process won't actually run, but validation should pass
      await expect(service.executeGitHttpBackend(options)).rejects.not.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid pathInfo', async () => {
      const options = {
        projectId: 'valid-project-id',
        service: 'git-upload-pack' as const,
        repoPath: '/tmp/test',
        pathInfo: '/../../etc/passwd',
      };

      await expect(service.executeGitHttpBackend(options)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject queryString with shell metacharacters', async () => {
      const maliciousQueryStrings = [
        'service=git-upload-pack;rm -rf /',
        'a=1|whoami',
        'key=`ls`',
      ];

      for (const queryString of maliciousQueryStrings) {
        const options = {
          projectId: 'valid-project-id',
          service: 'git-upload-pack' as const,
          repoPath: '/tmp/test',
          pathInfo: '/info/refs',
          queryString,
        };

        await expect(service.executeGitHttpBackend(options)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should accept valid queryString', async () => {
      const options = {
        projectId: 'valid-project-id',
        service: 'git-upload-pack' as const,
        repoPath: '/tmp/test',
        pathInfo: '/info/refs',
        queryString: 'service=git-upload-pack',
      };

      // This will fail because git process won't actually run, but validation should pass
      await expect(service.executeGitHttpBackend(options)).rejects.not.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Input Validation', () => {
    it('should validate projectId format', async () => {
      const invalidIds = [
        '',
        ' ',
        'project with spaces',
        'project/slash',
        'project\\backslash',
      ];

      for (const projectId of invalidIds) {
        const options = {
          projectId,
          service: 'git-upload-pack' as const,
          repoPath: '/tmp/test',
        };

        await expect(service.executeGitHttpBackend(options)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should only allow whitelisted pathInfo values', async () => {
      const allowedPaths = [
        '/info/refs',
        '/git-upload-pack',
        '/git-receive-pack',
      ];
      const disallowedPaths = [
        '/etc/passwd',
        '/arbitrary/path',
        '/git-upload-pack/../../../etc',
      ];

      // Allowed paths should not throw validation error
      for (const pathInfo of allowedPaths) {
        const options = {
          projectId: 'valid-id',
          service: 'git-upload-pack' as const,
          repoPath: '/tmp/test',
          pathInfo,
        };

        await expect(
          service.executeGitHttpBackend(options),
        ).rejects.not.toThrow(BadRequestException);
      }

      // Disallowed paths should throw validation error
      for (const pathInfo of disallowedPaths) {
        const options = {
          projectId: 'valid-id',
          service: 'git-upload-pack' as const,
          repoPath: '/tmp/test',
          pathInfo,
        };

        await expect(service.executeGitHttpBackend(options)).rejects.toThrow(
          BadRequestException,
        );
      }
    });
  });

  describe('Service Delegation Methods', () => {
    it('should call executeGitHttpBackend with correct parameters for handleInfoRefs', async () => {
      const spy = jest
        .spyOn(service, 'executeGitHttpBackend')
        .mockResolvedValue({
          statusCode: 200,
          headers: {},
          body: Buffer.from('test'),
        });

      await service.handleInfoRefs(
        'test-project',
        '/tmp/repos/test',
        'git-upload-pack',
      );

      expect(spy).toHaveBeenCalledWith({
        projectId: 'test-project',
        service: 'git-upload-pack',
        repoPath: '/tmp/repos/test',
        pathInfo: '/info/refs',
        queryString: 'service=git-upload-pack',
      });
    });

    it('should call executeGitHttpBackend with correct parameters for handleUploadPack', async () => {
      const spy = jest
        .spyOn(service, 'executeGitHttpBackend')
        .mockResolvedValue({
          statusCode: 200,
          headers: {},
          body: Buffer.from('test'),
        });

      const requestBody = Buffer.from('test-request');

      await service.handleUploadPack(
        'test-project',
        '/tmp/repos/test',
        requestBody,
      );

      expect(spy).toHaveBeenCalledWith({
        projectId: 'test-project',
        service: 'git-upload-pack',
        repoPath: '/tmp/repos/test',
        pathInfo: '/git-upload-pack',
        contentType: 'application/x-git-upload-pack-request',
        requestBody,
      });
    });

    it('should call executeGitHttpBackend with correct parameters for handleReceivePack', async () => {
      const spy = jest
        .spyOn(service, 'executeGitHttpBackend')
        .mockResolvedValue({
          statusCode: 200,
          headers: {},
          body: Buffer.from('test'),
        });

      const requestBody = Buffer.from('test-request');

      await service.handleReceivePack(
        'test-project',
        '/tmp/repos/test',
        requestBody,
      );

      expect(spy).toHaveBeenCalledWith({
        projectId: 'test-project',
        service: 'git-receive-pack',
        repoPath: '/tmp/repos/test',
        pathInfo: '/git-receive-pack',
        contentType: 'application/x-git-receive-pack-request',
        requestBody,
      });
    });
  });
});
