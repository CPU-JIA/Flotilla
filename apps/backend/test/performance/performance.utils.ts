/**
 * 性能测试工具函数
 * 用于测量和分析响应时间、吞吐量等性能指标
 */

export interface PerformanceMetrics {
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export interface ThroughputMetrics {
  duration: number;
  count: number;
  throughput: number;
  avgTimePerOp: number;
}

/**
 * 计算百分位数
 */
export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * 计算标准差
 */
export function standardDeviation(arr: number[]): number {
  if (arr.length === 0) return 0;
  const avg = arr.reduce((a, b) => a + b) / arr.length;
  const squareDiffs = arr.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / arr.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * 分析性能指标
 */
export function analyzeMetrics(times: number[]): PerformanceMetrics {
  if (times.length === 0) {
    return {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: 0,
      maxTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
    };
  }

  const totalTime = times.reduce((a, b) => a + b);
  const avgTime = totalTime / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    count: times.length,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
    stdDev: standardDeviation(times),
  };
}

/**
 * 格式化性能报告
 */
export function formatMetricsReport(
  name: string,
  metrics: PerformanceMetrics,
): string {
  return `
📊 ${name}:
  - Count: ${metrics.count}
  - Total Time: ${metrics.totalTime.toFixed(2)}ms
  - Average: ${metrics.avgTime.toFixed(2)}ms
  - Min: ${metrics.minTime.toFixed(2)}ms
  - Max: ${metrics.maxTime.toFixed(2)}ms
  - P50: ${metrics.p50.toFixed(2)}ms
  - P95: ${metrics.p95.toFixed(2)}ms
  - P99: ${metrics.p99.toFixed(2)}ms
  - StdDev: ${metrics.stdDev.toFixed(2)}ms
`;
}

/**
 * 格式化吞吐量报告
 */
export function formatThroughputReport(
  name: string,
  metrics: ThroughputMetrics,
): string {
  return `
📊 ${name}:
  - Duration: ${metrics.duration.toFixed(2)}ms
  - Count: ${metrics.count}
  - Throughput: ${metrics.throughput.toFixed(2)} ops/sec
  - Avg Time Per Op: ${metrics.avgTimePerOp.toFixed(2)}ms
`;
}

/**
 * 性能对比报告
 */
export function formatComparisonReport(
  name: string,
  before: PerformanceMetrics,
  after: PerformanceMetrics,
): string {
  const improvement = ((before.avgTime - after.avgTime) / before.avgTime) * 100;
  const improvementSign = improvement > 0 ? '✅' : '❌';

  return `
📊 ${name} - Performance Comparison:
  Before (Old Approach):
    - Average: ${before.avgTime.toFixed(2)}ms
    - P95: ${before.p95.toFixed(2)}ms
    - P99: ${before.p99.toFixed(2)}ms

  After (New Approach):
    - Average: ${after.avgTime.toFixed(2)}ms
    - P95: ${after.p95.toFixed(2)}ms
    - P99: ${after.p99.toFixed(2)}ms

  ${improvementSign} Improvement: ${Math.abs(improvement).toFixed(2)}%
`;
}

/**
 * 性能基准测试装饰器
 */
export function benchmark(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    const result = await originalMethod.apply(this, args);
    const duration = performance.now() - start;
    console.log(`⏱️ ${propertyKey} took ${duration.toFixed(2)}ms`);
    return result;
  };

  return descriptor;
}
