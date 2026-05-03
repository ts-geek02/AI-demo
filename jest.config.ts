import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  transform: {
    // Transform TypeScript and JavaScript files with ts-jest
    // The JS transform is needed for @faker-js/faker which ships as pure ESM
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json', allowJs: true }],
  },
  // Allow @faker-js/faker to be transformed (it ships as pure ESM)
  transformIgnorePatterns: ['node_modules/(?!(@faker-js/faker)/)'],
};

export default config;
