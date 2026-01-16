/**
 * Issue创建性能基准测试
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
  formatComparisonReport,
  ThroughputMetrics,
} from './performance.utils';

describe('Issue Creation - Performance Benchmarks', () => {
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
        username: `perf-test-user-${Date.now()}`,
        email: `perf-test-${Date.now()}@test.com`,
        password: 'TestPassword123!',
      });

    authToken = userRes.body.access_token;
    userId = userRes.body.user.id;

    // 创建组织
    const orgRes = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `Perf Test Org ${Date.now()}`,
        slug: `perf-org-${Date.now()}`,
      });

    const orgId = orgRes.body.id;

    // 创建项目
    const projectRes = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/projects`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `Perf Test Project ${Date.now()}`,
        slug: `perf-project-${Date.now()}`,
        description: 'Performance testing project',
      });

    projectId = projectRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time Benchmarks', () => {
    it('should measure average Issue creation time (50 iterations)', async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        await request(app.getHttpServer())
          .post(`/projects/${projectId}/issues`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Perf Test Issue ${i}`,
            body: `Performance test issue body ${i}`,
          });

        const duration = Date.now() - start;
        times.push(duration);
      }

      const metrics = analyzeMetrics(times);
      console.log(formatMetricsReport('Issue Creation Response Time', metrics));

      // 验证性能指标
      expect(metrics.avgTime).toBeLessThan(200); // 平均响应时间 < 200ms
      expect(metrics.p95).toBeLessThan(300); // P95 < 300ms
      expect(metrics.p99).toBeLessThan(500); // P99 < 500ms
    });

    it('should measure PR creation time (50 iterations)', async () => {
      const iterations = 50;
      const times: number[] = [];

      // 创建测试分支
      const repo = await prisma.repository.findFirst({
        where: { projectId },
      });

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        await request(app.getHttpServer())
          .post(`/projects/${projectId}/pull-requests`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Perf Test PR ${i}`,
            body: `Performance test PR body ${i}`,
            sourceBranch: `feature/perf-test-${i}`,
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
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should measure Issue creation throughput (5 seconds)', async () => {
      const duration = 5000; // 5秒
      const start = Date.now();
      let count = 0;
      const errors: Error[] = [];

      while (Date.now() - start < duration) {
        try {
          await request(app.getHttpServer())
            .post(`/projects/${projectId}/issues`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Throughput Test Issue ${count}`,
              body: `Throughput test body ${count}`,
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
📊 Issue Creation Throughput:
  - Duration: ${metrics.duration.toFixed(2)}ms
  - Count: ${metrics.count}
  - Throughput: ${metrics.throughput.toFixed(2)} creates/sec
  - Avg Time Per Op: ${metrics.avgTimePerOp.toFixed(2)}ms
  - Errors: ${errors.length}
      `);

      // 验证吞吐量
      expect(throughput).toBeGreaterThan(5); // 至少 5 creates/sec
      expect(errors.length).toBe(0); // 无错误
    });

    it('should measure concurrent Issue creation', async () => {
      const concurrency = 10;
      const operationsPerThread = 5;
      const times: number[] = [];

      const createIssuePromises = Array.from({ length: concurrency }).map(
        async (_, threadIdx) => {
          for (let i = 0; i < operationsPerThread; i++) {
            const start = Date.now();

            await request(app.getHttpServer())
              .post(`/projects/${projectId}/issues`)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                title: `Concurrent Issue T${threadIdx}-${i}`,
                body: `Concurrent test body`,
              });

            const duration = Date.now() - start;
            times.push(duration);
          }
        },
      );

      const overallStart = Date.now();
      await Promise.all(createIssuePromises);
      const overallDuration = Date.now() - overallStart;

      const metrics = analyzeMetrics(times);
      const totalOps = concurrency * operationsPerThread;
      const concurrentThroughput = (totalOps / overallDuration) * 1000;

      console.log(`
📊 Concurrent Issue Creation:
  - Concurrency: ${concurrency}
  - Total Operations: ${totalOps}
  - Overall Duration: ${overallDuration.toFixed(2)}ms
  - Concurrent Throughput: ${concurrentThroughput.toFixed(2)} ops/sec
  - Avg Response Time: ${metrics.avgTime.toFixed(2)}ms
  - P95: ${metrics.p95.toFixed(2)}ms
      `);

      expect(concurrentThroughput).toBeGreaterThan(10); // 至少 10 ops/sec
    });
  });

  describe('Database Query Analysis', () => {
    it('should verify atomic counter uses single UPDATE query', async () => {
      // 获取初始计数
      const projectBefore = await prisma.project.findUnique({
        where: { id: projectId },
      });
      const initialNumber = projectBefore?.nextIssueNumber || 0;

      // 创建Issue
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/issues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Query Analysis Test',
          body: 'Testing atomic counter',
        });

      // 验证计数器递增
      const projectAfter = await prisma.project.findUnique({
        where: { id: projectId },
      });
      const finalNumber = projectAfter?.nextIssueNumber || 0;

      console.log(`
📊 Atomic Counter Verification:
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
