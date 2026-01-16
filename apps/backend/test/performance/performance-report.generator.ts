/**
 * 性能基准测试报告生成器
 * 生成完整的性能测试报告和分析
 */

import { PerformanceMetrics, ThroughputMetrics } from './performance.utils';
import * as os from 'os';

export interface BenchmarkReport {
  timestamp: string;
  testName: string;
  environment: {
    nodeVersion: string;
    platform: string;
    cpuCount: number;
  };
  results: {
    responseTime?: PerformanceMetrics;
    throughput?: ThroughputMetrics;
    comparison?: {
      before: PerformanceMetrics;
      after: PerformanceMetrics;
      improvement: number;
    };
  };
  recommendations: string[];
  status: 'PASS' | 'FAIL' | 'WARNING';
}

export class PerformanceReportGenerator {
  /**
   * 生成完整的性能报告
   */
  static generateReport(
    testName: string,
    metrics: PerformanceMetrics | ThroughputMetrics,
    thresholds?: {
      avgTime?: number;
      p95?: number;
      p99?: number;
      throughput?: number;
    },
  ): BenchmarkReport {
    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      testName,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cpuCount: os.cpus().length,
      },
      results: {},
      recommendations: [],
      status: 'PASS',
    };

    // 分析响应时间指标
    if ('avgTime' in metrics) {
      const perfMetrics = metrics;
      report.results.responseTime = perfMetrics;

      if (thresholds?.avgTime && perfMetrics.avgTime > thresholds.avgTime) {
        report.recommendations.push(
          `Average response time (${perfMetrics.avgTime.toFixed(2)}ms) exceeds threshold (${thresholds.avgTime}ms)`,
        );
        report.status = 'WARNING';
      }

      if (thresholds?.p95 && perfMetrics.p95 > thresholds.p95) {
        report.recommendations.push(
          `P95 response time (${perfMetrics.p95.toFixed(2)}ms) exceeds threshold (${thresholds.p95}ms)`,
        );
        report.status = 'WARNING';
      }

      if (thresholds?.p99 && perfMetrics.p99 > thresholds.p99) {
        report.recommendations.push(
          `P99 response time (${perfMetrics.p99.toFixed(2)}ms) exceeds threshold (${thresholds.p99}ms)`,
        );
        report.status = 'WARNING';
      }
    }

    // 分析吞吐量指标
    if ('throughput' in metrics) {
      const throughputMetrics = metrics;
      report.results.throughput = throughputMetrics;

      if (
        thresholds?.throughput &&
        throughputMetrics.throughput < thresholds.throughput
      ) {
        report.recommendations.push(
          `Throughput (${throughputMetrics.throughput.toFixed(2)} ops/sec) below threshold (${thresholds.throughput} ops/sec)`,
        );
        report.status = 'WARNING';
      }
    }

    return report;
  }

  /**
   * 生成对比报告
   */
  static generateComparisonReport(
    testName: string,
    before: PerformanceMetrics,
    after: PerformanceMetrics,
    expectedImprovement: number = 30, // 期望改进百分比
  ): BenchmarkReport {
    const improvement =
      ((before.avgTime - after.avgTime) / before.avgTime) * 100;

    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      testName: `${testName} - Comparison`,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cpuCount: os.cpus().length,
      },
      results: {
        comparison: {
          before,
          after,
          improvement,
        },
      },
      recommendations: [],
      status: 'PASS',
    };

    if (improvement < expectedImprovement) {
      report.recommendations.push(
        `Performance improvement (${improvement.toFixed(2)}%) below expected (${expectedImprovement}%)`,
      );
      report.status = 'WARNING';
    }

    if (improvement < 0) {
      report.recommendations.push(
        `Performance regression detected: ${Math.abs(improvement).toFixed(2)}% slower`,
      );
      report.status = 'FAIL';
    }

    return report;
  }

  /**
   * 格式化报告为Markdown
   */
  static formatAsMarkdown(report: BenchmarkReport): string {
    let markdown = `# Performance Benchmark Report

**Test**: ${report.testName}
**Timestamp**: ${report.timestamp}
**Status**: ${report.status}

## Environment
- Node Version: ${report.environment.nodeVersion}
- Platform: ${report.environment.platform}
- CPU Count: ${report.environment.cpuCount}

## Results

`;

    if (report.results.responseTime) {
      const rt = report.results.responseTime;
      markdown += `### Response Time Metrics
| Metric | Value |
|--------|-------|
| Count | ${rt.count} |
| Average | ${rt.avgTime.toFixed(2)}ms |
| Min | ${rt.minTime.toFixed(2)}ms |
| Max | ${rt.maxTime.toFixed(2)}ms |
| P50 | ${rt.p50.toFixed(2)}ms |
| P95 | ${rt.p95.toFixed(2)}ms |
| P99 | ${rt.p99.toFixed(2)}ms |
| StdDev | ${rt.stdDev.toFixed(2)}ms |

`;
    }

    if (report.results.throughput) {
      const tp = report.results.throughput;
      markdown += `### Throughput Metrics
| Metric | Value |
|--------|-------|
| Duration | ${tp.duration.toFixed(2)}ms |
| Count | ${tp.count} |
| Throughput | ${tp.throughput.toFixed(2)} ops/sec |
| Avg Time Per Op | ${tp.avgTimePerOp.toFixed(2)}ms |

`;
    }

    if (report.results.comparison) {
      const comp = report.results.comparison;
      markdown += `### Performance Comparison
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Average | ${comp.before.avgTime.toFixed(2)}ms | ${comp.after.avgTime.toFixed(2)}ms | ${comp.improvement.toFixed(2)}% |
| P95 | ${comp.before.p95.toFixed(2)}ms | ${comp.after.p95.toFixed(2)}ms | ${(((comp.before.p95 - comp.after.p95) / comp.before.p95) * 100).toFixed(2)}% |
| P99 | ${comp.before.p99.toFixed(2)}ms | ${comp.after.p99.toFixed(2)}ms | ${(((comp.before.p99 - comp.after.p99) / comp.before.p99) * 100).toFixed(2)}% |

`;
    }

    if (report.recommendations.length > 0) {
      markdown += `## Recommendations
${report.recommendations.map((rec) => `- ${rec}`).join('\n')}

`;
    }

    return markdown;
  }

  /**
   * 格式化报告为JSON
   */
  static formatAsJSON(report: BenchmarkReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * 生成性能基准测试总结
   */
  static generateSummary(reports: BenchmarkReport[]): string {
    const passCount = reports.filter((r) => r.status === 'PASS').length;
    const warningCount = reports.filter((r) => r.status === 'WARNING').length;
    const failCount = reports.filter((r) => r.status === 'FAIL').length;

    return `
# Performance Benchmark Summary

**Total Tests**: ${reports.length}
**Passed**: ${passCount} ✅
**Warnings**: ${warningCount} ⚠️
**Failed**: ${failCount} ❌

## Test Results
${reports
  .map(
    (r) =>
      `- ${r.testName}: ${r.status} ${r.status === 'PASS' ? '✅' : r.status === 'WARNING' ? '⚠️' : '❌'}`,
  )
  .join('\n')}

## Key Findings
${reports
  .filter((r) => r.recommendations.length > 0)
  .map(
    (r) =>
      `### ${r.testName}
${r.recommendations.map((rec) => `- ${rec}`).join('\n')}`,
  )
  .join('\n\n')}
`;
  }
}
