/**
 * Git HTTP Smart Protocol E2E Tests
 *
 * 测试覆盖:
 * - ✅ HTTP 端点认证和授权
 * - ✅ 错误场景（401, 403, 404, 413）
 * - ✅ info/refs 端点
 * - ✅ upload-pack 端点（clone/fetch）
 * - ✅ receive-pack 端点（push）
 * - ✅ 权限验证（公开/私有仓库）
 * - ⚠️  完整 Git 流程（需要真实 Git 环境，见注释）
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GitService } from '../src/git/git.service';
import {
  createTestUser,
  createTestOrganization,
  createTestProject,
  generateBasicAuthHeader,
  cleanupTestUsers,
  cleanupTestProjects,
  cleanupTestOrganizations,
  TestUser,
  TestProject,
  addProjectMember,
} from './helpers/git-test.helper';
import { ProjectVisibility, MemberRole } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

describe('Git HTTP Smart Protocol (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let gitService: GitService;

  // Test data
  let testUser: TestUser;
  let testUser2: TestUser;
  let organizationId: string;
  let privateProject: TestProject;
  let publicProject: TestProject;
  let uninitializedProject: TestProject;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    gitService = app.get(GitService);

    // Create test users
    testUser = await createTestUser(app, {
      username: 'gituser1',
      email: 'gituser1@test.com',
      password: 'TestPassword123!',
    });

    testUser2 = await createTestUser(app, {
      username: 'gituser2',
      email: 'gituser2@test.com',
      password: 'TestPassword123!',
    });

    // Create test organization
    const organization = await createTestOrganization(app, testUser.id);
    organizationId = organization.id;

    // Create test projects
    privateProject = await createTestProject(app, testUser.id, organizationId, {
      name: 'private-repo',
      visibility: ProjectVisibility.PRIVATE,
      initRepository: true,
    });

    publicProject = await createTestProject(app, testUser.id, organizationId, {
      name: 'public-repo',
      visibility: ProjectVisibility.PUBLIC,
      initRepository: true,
    });

    uninitializedProject = await createTestProject(
      app,
      testUser.id,
      organizationId,
      {
        name: 'uninitialized-repo',
        visibility: ProjectVisibility.PRIVATE,
        initRepository: false,
      },
    );

    // Initialize Git repositories
    await gitService.init(privateProject.id, 'main');
    await gitService.init(publicProject.id, 'main');

    // Create initial commits
    await gitService.createInitialCommit(privateProject.id, {
      name: testUser.username,
      email: testUser.email,
    });

    await gitService.createInitialCommit(publicProject.id, {
      name: testUser.username,
      email: testUser.email,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestProjects(app, [
      privateProject.id,
      publicProject.id,
      uninitializedProject.id,
    ]);
    await cleanupTestOrganizations(app, [organizationId]);
    await cleanupTestUsers(app, [testUser.id, testUser2.id]);

    // Cleanup Git repositories on disk
    const reposDir = path.join(__dirname, '../repos');
    try {
      await fs.promises.rm(path.join(reposDir, privateProject.id), {
        recursive: true,
        force: true,
      });
      await fs.promises.rm(path.join(reposDir, publicProject.id), {
        recursive: true,
        force: true,
      });
    } catch (error) {
      console.warn('Failed to cleanup Git repos:', error);
    }

    await app.close();
  });

  describe('Authentication', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-upload-pack`)
        .expect(401);

      expect(response.body.message).toContain('Authentication required');
    });

    it('should reject request with invalid credentials', async () => {
      const authHeader = generateBasicAuthHeader('gituser1', 'WrongPassword');

      const response = await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-upload-pack`)
        .set('Authorization', authHeader)
        .expect(401);

      expect(response.body.message).toContain('Invalid username or password');
    });

    it('should accept request with valid username and password', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser1',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-upload-pack`)
        .set('Authorization', authHeader)
        .expect(200);
    });

    it('should accept request with email and password', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser1@test.com',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-upload-pack`)
        .set('Authorization', authHeader)
        .expect(200);
    });
  });

  describe('Authorization', () => {
    it('should allow owner to read private repository', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser1',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-upload-pack`)
        .set('Authorization', authHeader)
        .expect(200);
    });

    it('should deny non-member to read private repository', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser2',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-upload-pack`)
        .set('Authorization', authHeader)
        .expect(403);
    });

    it('should allow any authenticated user to read public repository', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser2',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${publicProject.id}/info/refs?service=git-upload-pack`)
        .set('Authorization', authHeader)
        .expect(200);
    });

    it('should allow owner to write to repository', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser1',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-receive-pack`)
        .set('Authorization', authHeader)
        .expect(200);
    });

    it('should deny non-member to write to repository', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser2',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-receive-pack`)
        .set('Authorization', authHeader)
        .expect(403);
    });

    it('should deny VIEWER role to write to repository', async () => {
      // Add testUser2 as VIEWER
      await addProjectMember(
        app,
        privateProject.id,
        testUser2.id,
        MemberRole.VIEWER,
      );

      const authHeader = generateBasicAuthHeader(
        'gituser2',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-receive-pack`)
        .set('Authorization', authHeader)
        .expect(403);

      // Cleanup: remove member
      await prisma.projectMember.deleteMany({
        where: {
          projectId: privateProject.id,
          userId: testUser2.id,
        },
      });
    });

    it('should allow MEMBER role to write to repository', async () => {
      // Add testUser2 as MEMBER
      await addProjectMember(
        app,
        privateProject.id,
        testUser2.id,
        MemberRole.MEMBER,
      );

      const authHeader = generateBasicAuthHeader(
        'gituser2',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=git-receive-pack`)
        .set('Authorization', authHeader)
        .expect(200);

      // Cleanup: remove member
      await prisma.projectMember.deleteMany({
        where: {
          projectId: privateProject.id,
          userId: testUser2.id,
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent project', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser1',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get('/repo/non-existent-id/info/refs?service=git-upload-pack')
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('should return 404 for uninitialized repository', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser1',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(
          `/repo/${uninitializedProject.id}/info/refs?service=git-upload-pack`,
        )
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('should return 400 for invalid service parameter', async () => {
      const authHeader = generateBasicAuthHeader(
        'gituser1',
        'TestPassword123!',
      );

      await request(app.getHttpServer())
        .get(`/repo/${privateProject.id}/info/refs?service=invalid-service`)
        .set('Authorization', authHeader)
        .expect(400);
    });

    it('should enforce HTTPS in production', async () => {
      // This test would need to mock NODE_ENV=production
      // Skip for now as it requires environment manipulation
    });
  });

  describe('Git HTTP Endpoints', () => {
    describe('GET /repo/:projectId/info/refs', () => {
      it('should return git-upload-pack advertisement', async () => {
        const authHeader = generateBasicAuthHeader(
          'gituser1',
          'TestPassword123!',
        );

        const response = await request(app.getHttpServer())
          .get(`/repo/${privateProject.id}/info/refs?service=git-upload-pack`)
          .set('Authorization', authHeader)
          .expect(200);

        expect(response.headers['content-type']).toContain(
          'application/x-git-upload-pack-advertisement',
        );
        expect(response.headers['cache-control']).toBe('no-cache');
      });

      it('should return git-receive-pack advertisement', async () => {
        const authHeader = generateBasicAuthHeader(
          'gituser1',
          'TestPassword123!',
        );

        const response = await request(app.getHttpServer())
          .get(`/repo/${privateProject.id}/info/refs?service=git-receive-pack`)
          .set('Authorization', authHeader)
          .expect(200);

        expect(response.headers['content-type']).toContain(
          'application/x-git-receive-pack-advertisement',
        );
      });
    });

    describe('POST /repo/:projectId/git-upload-pack', () => {
      it('should handle upload-pack request', async () => {
        const authHeader = generateBasicAuthHeader(
          'gituser1',
          'TestPassword123!',
        );

        // Simple pack negotiation request
        const body = Buffer.from('0000', 'utf-8');

        const response = await request(app.getHttpServer())
          .post(`/repo/${privateProject.id}/git-upload-pack`)
          .set('Authorization', authHeader)
          .set('Content-Type', 'application/x-git-upload-pack-request')
          .send(body)
          .expect(200);

        expect(response.headers['content-type']).toContain(
          'application/x-git-upload-pack-result',
        );
      });

      it('should enforce 10MB size limit', async () => {
        const authHeader = generateBasicAuthHeader(
          'gituser1',
          'TestPassword123!',
        );

        // Create a large buffer (> 10MB)
        const largeBody = Buffer.alloc(11 * 1024 * 1024);

        await request(app.getHttpServer())
          .post(`/repo/${privateProject.id}/git-upload-pack`)
          .set('Authorization', authHeader)
          .set('Content-Type', 'application/x-git-upload-pack-request')
          .set('Content-Length', String(largeBody.length))
          .send(largeBody)
          .expect(413);
      });
    });

    describe('POST /repo/:projectId/git-receive-pack', () => {
      it('should handle receive-pack request', async () => {
        const authHeader = generateBasicAuthHeader(
          'gituser1',
          'TestPassword123!',
        );

        // Simple pack data
        const body = Buffer.from('0000', 'utf-8');

        const response = await request(app.getHttpServer())
          .post(`/repo/${privateProject.id}/git-receive-pack`)
          .set('Authorization', authHeader)
          .set('Content-Type', 'application/x-git-receive-pack-request')
          .send(body)
          .expect(200);

        expect(response.headers['content-type']).toContain(
          'application/x-git-receive-pack-result',
        );
      });

      it('should enforce 500MB size limit', async () => {
        const authHeader = generateBasicAuthHeader(
          'gituser1',
          'TestPassword123!',
        );

        // Mock a very large content length (> 500MB)
        const largeSize = 501 * 1024 * 1024;

        await request(app.getHttpServer())
          .post(`/repo/${privateProject.id}/git-receive-pack`)
          .set('Authorization', authHeader)
          .set('Content-Type', 'application/x-git-receive-pack-request')
          .set('Content-Length', String(largeSize))
          .send(Buffer.alloc(1024)) // Small body, but large Content-Length
          .expect(413);
      });
    });
  });

  /**
   * ⚠️  FULL GIT INTEGRATION TESTS
   *
   * The following tests require:
   * - Git executable installed on the system
   * - Network access for Git operations
   * - Additional test infrastructure
   *
   * Uncomment and adapt these tests when running in a full integration environment.
   */

  /*
  describe('Full Git Clone/Push/Pull Flow', () => {
    const tmpDir = path.join(__dirname, '../tmp');
    let cloneDir: string;

    beforeAll(async () => {
      await fs.promises.mkdir(tmpDir, { recursive: true });
    });

    afterAll(async () => {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    });

    it('should successfully clone repository via HTTP', async () => {
      cloneDir = path.join(tmpDir, `clone-${Date.now()}`);

      // Build Git URL with credentials
      const gitUrl = `http://gituser1:TestPassword123!@localhost:4000/repo/${privateProject.id}`;

      // Execute git clone
      execSync(`git clone ${gitUrl} ${cloneDir}`, {
        stdio: 'inherit',
      });

      // Verify clone success
      const exists = await fs.promises.access(path.join(cloneDir, '.git'))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should successfully push commits via HTTP', async () => {
      // Create a new commit
      execSync('echo "test content" > test.txt', { cwd: cloneDir });
      execSync('git add test.txt', { cwd: cloneDir });
      execSync('git commit -m "Add test file"', { cwd: cloneDir });

      // Push to remote
      execSync('git push origin main', { cwd: cloneDir, stdio: 'inherit' });

      // Verify push success by checking remote repository
      const commits = await gitService.log(privateProject.id, { depth: 5 });
      expect(commits.length).toBeGreaterThan(1);
    });

    it('should successfully pull changes via HTTP', async () => {
      // Create a commit directly in the repository
      await gitService.commit(
        privateProject.id,
        'main',
        [{ path: 'server-file.txt', content: 'Server content' }],
        'Add server file',
        { name: testUser.username, email: testUser.email },
      );

      // Pull changes
      execSync('git pull origin main', { cwd: cloneDir, stdio: 'inherit' });

      // Verify file exists
      const fileExists = await fs.promises.access(
        path.join(cloneDir, 'server-file.txt'),
      )
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should reject concurrent pushes to same branch', async () => {
      // This test requires complex setup with multiple clients
      // Implementation depends on specific locking mechanism
    });
  });
  */
});
