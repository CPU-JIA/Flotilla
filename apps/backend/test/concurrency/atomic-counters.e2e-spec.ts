/**
 * Atomic Counters - Concurrency E2E Tests
 *
 * 测试目标：验证原子计数器（Issue/PR 编号生成）在高并发场景下的正确性和性能
 *
 * 测试场景：
 * 1. Issue 编号并发创建 (10, 50, 100 并发)
 * 2. PR 编号并发创建 (10 并发)
 * 3. 混合并发 (Issue + PR 同时创建)
 * 4. 性能基准测试
 *
 * 验证标准：
 * - ✅ 编号连续无跳号
 * - ✅ 编号无重复
 * - ✅ 10并发 < 1秒
 * - ✅ 50并发 < 5秒
 * - ✅ 100并发 < 10秒
 * - ✅ 无数据库死锁
 * - ✅ 无竞态条件错误
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  setupTestContext,
  cleanupTestData,
  createIssue,
  createPullRequest,
  createBranch,
  measureConcurrentExecution,
  TestContext,
} from './concurrency-test.helper';

describe('Atomic Counters - Concurrency Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let context: TestContext;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // 设置测试上下文
    context = await setupTestContext(app);
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData(
      app,
      context.projectId,
      context.organizationId,
      context.userId,
    );
    await app.close();
  });

  describe('Issue Number Concurrency', () => {
    it('should generate sequential numbers under 10 concurrent requests', async () => {
      const tasks = Array.from(
        { length: 10 },
        (_, i) => () =>
          createIssue(app, context.authToken, context.projectId, {
            title: `Concurrent Issue ${i}`,
          }),
      );

      const { results: issues, duration } =
        await measureConcurrentExecution(tasks);

      // 验证编号连续
      const numbers = issues.map((issue) => issue.number).sort((a, b) => a - b);
      const expectedNumbers = Array.from({ length: 10 }, (_, i) => i + 1);

      expect(numbers).toEqual(expectedNumbers);

      // 验证无重复
      const uniqueNumbers = new Set(numbers);
      expect(uniqueNumbers.size).toBe(10);

      // 验证性能
      expect(duration).toBeLessThan(1000); // 1秒内完成

      console.log(`✅ 10 concurrent Issue creates completed in ${duration}ms`);
    });

    it('should handle 50 concurrent requests without conflicts', async () => {
      const tasks = Array.from(
        { length: 50 },
        (_, i) => () =>
          createIssue(app, context.authToken, context.projectId, {
            title: `High Concurrency Issue ${i}`,
          }),
      );

      const { results: issues, duration } =
        await measureConcurrentExecution(tasks);

      const numbers = issues.map((issue) => issue.number);
      const uniqueNumbers = new Set(numbers);

      // 验证无重复
      expect(uniqueNumbers.size).toBe(50);

      // 验证性能
      expect(duration).toBeLessThan(5000); // 5秒内完成

      console.log(`✅ 50 concurrent Issue creates completed in ${duration}ms`);
    });

    it('should maintain consistency under 100 concurrent creates', async () => {
      const tasks = Array.from(
        { length: 100 },
        (_, i) => () =>
          createIssue(app, context.authToken, context.projectId, {
            title: `Benchmark Issue ${i}`,
          }),
      );

      const { results: issues, duration } =
        await measureConcurrentExecution(tasks);

      const numbers = issues.map((issue) => issue.number);
      const uniqueNumbers = new Set(numbers);

      // 验证无重复
      expect(uniqueNumbers.size).toBe(100);

      // 验证性能
      expect(duration).toBeLessThan(10000); // 10秒内完成

      console.log(`✅ 100 concurrent Issue creates completed in ${duration}ms`);
    });

    it('should maintain consistency under rapid sequential creates', async () => {
      const issues = [];

      for (let i = 0; i < 20; i++) {
        const issue = await createIssue(
          app,
          context.authToken,
          context.projectId,
          {
            title: `Sequential Issue ${i}`,
          },
        );
        issues.push(issue);
      }

      const numbers = issues.map((issue) => issue.number);

      // 验证编号连续递增
      for (let i = 1; i < numbers.length; i++) {
        expect(numbers[i]).toBe(numbers[i - 1] + 1);
      }

      console.log('✅ Sequential Issue creates maintain correct order');
    });
  });

  describe('PR Number Concurrency', () => {
    beforeAll(async () => {
      // 创建测试分支
      await createBranch(app, context.projectId, 'feature-1');
      await createBranch(app, context.projectId, 'feature-2');
    });

    it('should generate sequential PR numbers under concurrent load', async () => {
      const tasks = Array.from(
        { length: 10 },
        (_, i) => () =>
          createPullRequest(app, context.authToken, context.projectId, {
            title: `Concurrent PR ${i}`,
            sourceBranch: i % 2 === 0 ? 'feature-1' : 'feature-2',
            targetBranch: 'main',
          }),
      );

      const { results: prs, duration } =
        await measureConcurrentExecution(tasks);

      // 验证编号连续
      const numbers = prs.map((pr) => pr.number).sort((a, b) => a - b);
      const expectedNumbers = Array.from({ length: 10 }, (_, i) => i + 1);

      expect(numbers).toEqual(expectedNumbers);

      // 验证无重复
      const uniqueNumbers = new Set(numbers);
      expect(uniqueNumbers.size).toBe(10);

      // 验证性能
      expect(duration).toBeLessThan(1000); // 1秒内完成

      console.log(`✅ 10 concurrent PR creates completed in ${duration}ms`);
    });
  });

  describe('Mixed Concurrency', () => {
    beforeAll(async () => {
      // 确保分支存在
      const prisma = app.get(PrismaService);
      const existingBranches = await prisma.branch.findMany({
        where: {
          repository: { projectId: context.projectId },
        },
      });

      if (!existingBranches.some((b) => b.name === 'feature-1')) {
        await createBranch(app, context.projectId, 'feature-1');
      }
    });

    it('should handle Issue and PR creation concurrently', async () => {
      const issueTasks = Array.from(
        { length: 5 },
        (_, i) => () =>
          createIssue(app, context.authToken, context.projectId, {
            title: `Mixed Issue ${i}`,
          }),
      );

      const prTasks = Array.from(
        { length: 5 },
        (_, i) => () =>
          createPullRequest(app, context.authToken, context.projectId, {
            title: `Mixed PR ${i}`,
            sourceBranch: 'feature-1',
            targetBranch: 'main',
          }),
      );

      const allTasks = [...issueTasks, ...prTasks];

      const { results, duration } = await measureConcurrentExecution(allTasks);

      const issues = results.slice(0, 5);
      const prs = results.slice(5);

      // 验证两个计数器独立工作
      const issueNumbers = issues.map((i: any) => i.number);
      const prNumbers = prs.map((pr: any) => pr.number);

      // Issue 编号应该有 5 个不重复的
      expect(new Set(issueNumbers).size).toBe(5);

      // PR 编号应该有 5 个不重复的
      expect(new Set(prNumbers).size).toBe(5);

      // 验证性能
      expect(duration).toBeLessThan(2000); // 2秒内完成

      console.log(
        `✅ Mixed 10 concurrent creates (5 Issues + 5 PRs) completed in ${duration}ms`,
      );
    });

    it('should not have deadlocks under high mixed load', async () => {
      const issueTasks = Array.from(
        { length: 25 },
        (_, i) => () =>
          createIssue(app, context.authToken, context.projectId, {
            title: `Heavy Load Issue ${i}`,
          }),
      );

      const prTasks = Array.from(
        { length: 25 },
        (_, i) => () =>
          createPullRequest(app, context.authToken, context.projectId, {
            title: `Heavy Load PR ${i}`,
            sourceBranch: 'feature-1',
            targetBranch: 'main',
          }),
      );

      const allTasks = [...issueTasks, ...prTasks];

      const { results, duration } = await measureConcurrentExecution(allTasks);

      // 验证所有请求都成功完成（无死锁）
      expect(results.length).toBe(50);

      // 验证性能
      expect(duration).toBeLessThan(5000); // 5秒内完成

      console.log(
        `✅ Heavy mixed load (50 concurrent creates) completed in ${duration}ms without deadlocks`,
      );
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete 100 concurrent creates in under 10 seconds', async () => {
      const tasks = Array.from(
        { length: 100 },
        (_, i) => () =>
          createIssue(app, context.authToken, context.projectId, {
            title: `Benchmark Issue ${i}`,
          }),
      );

      const { duration } = await measureConcurrentExecution(tasks);

      expect(duration).toBeLessThan(10000);

      console.log(`✅ 100 concurrent creates completed in ${duration}ms`);
      console.log(
        `   Average time per create: ${(duration / 100).toFixed(2)}ms`,
      );
    });

    it('should verify database consistency after all tests', async () => {
      const [issueCount, prCount] = await Promise.all([
        prisma.issue.count({
          where: { projectId: context.projectId },
        }),
        prisma.pullRequest.count({
          where: { projectId: context.projectId },
        }),
      ]);

      // 获取最大编号
      const [maxIssue, maxPR] = await Promise.all([
        prisma.issue.findFirst({
          where: { projectId: context.projectId },
          orderBy: { number: 'desc' },
          select: { number: true },
        }),
        prisma.pullRequest.findFirst({
          where: { projectId: context.projectId },
          orderBy: { number: 'desc' },
          select: { number: true },
        }),
      ]);

      // 验证最大编号 = 总数（编号从1开始）
      expect(maxIssue?.number).toBe(issueCount);
      expect(maxPR?.number).toBe(prCount);

      console.log(`✅ Database consistency verified:`);
      console.log(
        `   Total Issues: ${issueCount}, Max Number: ${maxIssue?.number}`,
      );
      console.log(`   Total PRs: ${prCount}, Max Number: ${maxPR?.number}`);
    });
  });
});
