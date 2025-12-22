module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\.(t|j)s$': 'ts-jest',
  },
  // 使用 V8 覆盖率提供器，避免 babel-plugin-istanbul/test-exclude 兼容性问题
  coverageProvider: 'v8',
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
  // 超时设置
  testTimeout: 10000,
  // 更详细的错误输出
  verbose: true,
}
