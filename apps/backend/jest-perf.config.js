/**
 * Jest配置 - 性能测试
 * 用于运行性能基准测试
 */

module.exports = {
  displayName: 'backend-performance',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/performance'],
  testMatch: ['**/*.perf.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageDirectory: '../../coverage/backend-performance',
  testTimeout: 120000, // 120秒超时，性能测试需要更长时间
  maxWorkers: 1, // 性能测试应该串行运行，避免干扰
  verbose: true,
  bail: false, // 继续运行所有测试，即使某些失败
};
