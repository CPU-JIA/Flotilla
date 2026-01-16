/**
 * Concurrency Test Helper Functions
 *
 * 提供并发测试的辅助功能：
 * - 创建测试用户和获取认证 Token
 * - 创建测试项目和仓库
 * - 并发创建 Issue/PR
 * - 清理测试数据
 */

import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';

export interface TestContext {
  app: INestApplication<App>;
  userId: string;
  username: string;
  authToken: string;
  organizationId: string;
  projectId: string;
}

/**
 * 创建测试用户并获取认证 Token
 */
export async function createTestUserAndGetToken(
  app: INestApplication,
  username: string = `testuser_${Date.now()}`,
): Promise<{ userId: string; username: string; token: string }> {
  const prisma = app.get(PrismaService);

  const password = 'Test123456!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email: `${username}@test.com`,
      passwordHash,
      role: 'USER',
      isActive: true,
      emailVerified: true,
    },
  });

  // 使用登录端点获取真实的 JWT Token
  const loginResponse = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({
      email: user.email,
      password,
    })
    .expect(200);

  return {
    userId: user.id,
    username: user.username,
    token: loginResponse.body.accessToken,
  };
}

/**
 * 创建测试组织
 */
export async function createTestOrganization(
  app: INestApplication,
  token: string,
  name: string = `Test Org ${Date.now()}`,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      description: 'Test organization for concurrency tests',
    })
    .expect(201);

  return response.body.id;
}

/**
 * 创建测试项目
 */
export async function createTestProject(
  app: INestApplication,
  token: string,
  organizationId: string,
  name: string = `Test Project ${Date.now()}`,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      description: 'Test project for concurrency tests',
      visibility: 'PRIVATE',
      organizationId,
    })
    .expect(201);

  return response.body.id;
}

/**
 * 创建 Issue
 */
export async function createIssue(
  app: INestApplication,
  token: string,
  projectId: string,
  dto: {
    title: string;
    body?: string;
  },
) {
  const response = await request(app.getHttpServer())
    .post(`/api/projects/${projectId}/issues`)
    .set('Authorization', `Bearer ${token}`)
    .send(dto);

  if (response.status !== 201) {
    throw new Error(
      `Failed to create issue: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body;
}

/**
 * 创建 Pull Request
 */
export async function createPullRequest(
  app: INestApplication,
  token: string,
  projectId: string,
  dto: {
    title: string;
    body?: string;
    sourceBranch: string;
    targetBranch: string;
  },
) {
  const response = await request(app.getHttpServer())
    .post('/api/pull-requests')
    .set('Authorization', `Bearer ${token}`)
    .send({
      ...dto,
      projectId,
    });

  if (response.status !== 201) {
    throw new Error(
      `Failed to create PR: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body;
}

/**
 * 创建分支（通过 Repository Service）
 */
export async function createBranch(
  app: INestApplication,
  projectId: string,
  branchName: string,
): Promise<void> {
  const prisma = app.get(PrismaService);

  // 获取仓库
  const repository = await prisma.repository.findUnique({
    where: { projectId },
  });

  if (!repository) {
    throw new Error(`Repository not found for project ${projectId}`);
  }

  // 创建分支
  await prisma.branch.create({
    data: {
      repositoryId: repository.id,
      name: branchName,
    },
  });
}

/**
 * 初始化完整的测试上下文
 */
export async function setupTestContext(
  app: INestApplication,
): Promise<TestContext> {
  const { userId, username, token } = await createTestUserAndGetToken(app);
  const organizationId = await createTestOrganization(app, token);
  const projectId = await createTestProject(app, token, organizationId);

  // 初始化仓库
  const prisma = app.get(PrismaService);
  await prisma.repository.create({
    data: {
      projectId,
      defaultBranch: 'main',
    },
  });

  // 创建 main 分支
  await createBranch(app, projectId, 'main');

  return {
    app,
    userId,
    username,
    authToken: token,
    organizationId,
    projectId,
  };
}

/**
 * 清理测试数据
 */
export async function cleanupTestData(
  app: INestApplication,
  projectId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  const prisma = app.get(PrismaService);

  // 按依赖顺序删除
  await prisma.issue.deleteMany({ where: { projectId } });
  await prisma.pullRequest.deleteMany({ where: { projectId } });
  await prisma.branch.deleteMany({
    where: { repository: { projectId } },
  });
  await prisma.repository.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

/**
 * 测量并发执行时间
 */
export async function measureConcurrentExecution<T>(
  tasks: Array<() => Promise<T>>,
): Promise<{ results: T[]; duration: number }> {
  const start = Date.now();
  const results = await Promise.all(tasks.map((task) => task()));
  const duration = Date.now() - start;

  return { results, duration };
}
