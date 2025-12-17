module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/*.interface.ts',
    '!**/index.ts',
    '!**/main.ts',
    '!**/types.ts',
    '!**/constants.ts',
    '!**/*.module.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.pnpm-store/',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // 禁用 cache 以避免 test-exclude 问题
  cache: false,
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
  // 超时设置
  testTimeout: 10000,
  // 更详细的错误输出
  verbose: true,
}
