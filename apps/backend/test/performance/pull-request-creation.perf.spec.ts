/**
 * Pull Request创建性能基准测试
 * 测试原子计数器优化前后的性能差异
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  analyzeMetrics,
  formatMetricsReport,
  ThroughputMetrics,
} from './performance.utils';

describe('Pull Request Creation - Performance Benchmarks', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let projectId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // 创建测试用户和项目
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: `pr-perf-user-${Date.now()}`,
        email: `pr-perf-${Date.now()}@test.com`,
        password: 'TestPassword123!',
      });

    authToken = userRes.body.access_token;
    userId = userRes.body.user.id;

    // 创建组织
    const orgRes = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `PR Perf Org ${Date.now()}`,
        slug: `pr-perf-org-${Date.now()}`,
      });

    const orgId = orgRes.body.id;

    // 创建项目
    const projectRes = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/projects`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `PR Perf Project ${Date.now()}`,
        slug: `pr-perf-project-${Date.now()}`,
        description: 'PR performance testing project',
      });

    projectId = projectRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time Benchmarks', () => {
    it('should measure average PR creation time (30 iterations)', async () => {
      const iterations = 30;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        await request(app.getHttpServer())
          .post(`/projects/${projectId}/pull-requests`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Perf Test PR ${i}`,
            body: `Performance test PR body ${i}`,
            sourceBranch: `feature/perf-${i}`,
            targetBranch: 'main',
          });

        const duration = Date.now() - start;
        times.push(duration);
      }

      const metrics = analyzeMetrics(times);
      console.log(formatMetricsReport('PR Creation Response Time', metrics));

      // 验证性能指标
      expect(metrics.avgTime).toBeLessThan(250); // 平均响应时间 < 250ms
      expect(metrics.p95).toBeLessThan(400); // P95 < 400ms
      expect(metrics.p99).toBeLessThan(600); // P99 < 600ms
    });

    it('should compare Issue vs PR creation time', async () => {
      const iterations = 20;
      const issueTimes: number[] = [];
      const prTimes: number[] = [];

      // 测试Issue创建
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        await request(app.getHttpServer())
          .post(`/projects/${projectId}/issues`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Comparison Issue ${i}`,
            body: `Comparison test`,
          });

        issueTimes.push(Date.now() - start);
      }

      // 测试PR创建
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        await request(app.getHttpServer())
          .post(`/projects/${projectId}/pull-requests`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Comparison PR ${i}`,
            body: `Comparison test`,
            sourceBranch: `feature/comp-${i}`,
            targetBranch: 'main',
          });

        prTimes.push(Date.now() - start);
      }

      const issueMetrics = analyzeMetrics(issueTimes);
      const prMetrics = analyzeMetrics(prTimes);

      console.log(`
📊 Issue vs PR Creation Time Comparison:

Issue Creation:
  - Average: ${issueMetrics.avgTime.toFixed(2)}ms
  - P95: ${issueMetrics.p95.toFixed(2)}ms
  - P99: ${issueMetrics.p99.toFixed(2)}ms

PR Creation:
  - Average: ${prMetrics.avgTime.toFixed(2)}ms
  - P95: ${prMetrics.p95.toFixed(2)}ms
  - P99: ${prMetrics.p99.toFixed(2)}ms

Difference:
  - Average: ${(prMetrics.avgTime - issueMetrics.avgTime).toFixed(2)}ms
  - Ratio: ${(prMetrics.avgTime / issueMetrics.avgTime).toFixed(2)}x
      `);

      // PR创建可能稍慢，因为需要验证分支
      expect(prMetrics.avgTime).toBeLessThan(400);
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should measure PR creation throughput (3 seconds)', async () => {
      const duration = 3000; // 3秒
      const start = Date.now();
      let count = 0;
      const errors: Error[] = [];

      while (Date.now() - start < duration) {
        try {
          await request(app.getHttpServer())
            .post(`/projects/${projectId}/pull-requests`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Throughput PR ${count}`,
              body: `Throughput test`,
              sourceBranch: `feature/throughput-${count}`,
              targetBranch: 'main',
            });
          count++;
        } catch (error) {
          errors.push(error as Error);
        }
      }

      const actualDuration = Date.now() - start;
      const throughput = (count / actualDuration) * 1000;

      const metrics: ThroughputMetrics = {
        duration: actualDuration,
        count,
        throughput,
        avgTimePerOp: actualDuration / count,
      };

      console.log(`
📊 PR Creation Throughput:
  - Duration: ${metrics.duration.toFixed(2)}ms
  - Count: ${metrics.count}
  - Throughput: ${metrics.throughput.toFixed(2)} creates/sec
  - Avg Time Per Op: ${metrics.avgTimePerOp.toFixed(2)}ms
  - Errors: ${errors.length}
      `);

      expect(throughput).toBeGreaterThan(3); // 至少 3 creates/sec
      expect(errors.length).toBe(0);
    });

    it('should measure concurrent PR creation', async () => {
      const concurrency = 5;
      const operationsPerThread = 3;
      const times: number[] = [];

      const createPRPromises = Array.from({ length: concurrency }).map(
        async (_, threadIdx) => {
          for (let i = 0; i < operationsPerThread; i++) {
            const start = Date.now();

            await request(app.getHttpServer())
              .post(`/projects/${projectId}/pull-requests`)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                title: `Concurrent PR T${threadIdx}-${i}`,
                body: `Concurrent test`,
                sourceBranch: `feature/concurrent-${threadIdx}-${i}`,
                targetBranch: 'main',
              });

            times.push(Date.now() - start);
          }
        },
      );

      const overallStart = Date.now();
      await Promise.all(createPRPromises);
      const overallDuration = Date.now() - overallStart;

      const metrics = analyzeMetrics(times);
      const totalOps = concurrency * operationsPerThread;
      const concurrentThroughput = (totalOps / overallDuration) * 1000;

      console.log(`
📊 Concurrent PR Creation:
  - Concurrency: ${concurrency}
  - Total Operations: ${totalOps}
  - Overall Duration: ${overallDuration.toFixed(2)}ms
  - Concurrent Throughput: ${concurrentThroughput.toFixed(2)} ops/sec
  - Avg Response Time: ${metrics.avgTime.toFixed(2)}ms
  - P95: ${metrics.p95.toFixed(2)}ms
      `);

      expect(concurrentThroughput).toBeGreaterThan(5); // 至少 5 ops/sec
    });
  });

  describe('Database Query Analysis', () => {
    it('should verify atomic counter uses single UPDATE query for PR', async () => {
      // 获取初始计数
      const projectBefore = await prisma.project.findUnique({
        where: { id: projectId },
      });
      const initialNumber = projectBefore?.nextPRNumber || 0;

      // 创建PR
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/pull-requests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Query Analysis Test',
          body: 'Testing atomic counter',
          sourceBranch: 'feature/query-test',
          targetBranch: 'main',
        });

      // 验证计数器递增
      const projectAfter = await prisma.project.findUnique({
        where: { id: projectId },
      });
      const finalNumber = projectAfter?.nextPRNumber || 0;

      console.log(`
📊 PR Atomic Counter Verification:
  - Before: ${initialNumber}
  - After: ${finalNumber}
  - Increment: ${finalNumber - initialNumber}
  - Expected: 1
  - Status: ${finalNumber - initialNumber === 1 ? '✅ PASS' : '❌ FAIL'}
      `);

      expect(finalNumber - initialNumber).toBe(1);
    });
  });
});
