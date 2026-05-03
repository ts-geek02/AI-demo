// Feature: nodejs-express-setup, Property 8: Jest reports failure details for any failing test

import * as fc from 'fast-check';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Property 8: Jest reports failure details for any failing test
 * Validates: Requirements 5.5
 *
 * For any test that fails with a known expected value and received value,
 * Jest's output SHALL include the test name, the expected value, and the
 * received value, and Jest SHALL exit with a non-zero code.
 */

const jestBin = path.resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  'jest' + (process.platform === 'win32' ? '.cmd' : ''),
);

const projectRoot = process.cwd();
const testsDir = path.join(projectRoot, 'src', '__tests__');

describe('Property: Jest reports failure details for any failing test', () => {
  it('jest output includes test name, expected value, received value, and exits non-zero', () => {
    fc.assert(
      fc.property(
        // Generate pairs of distinct integers for expected/received
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/),
        (expected, received, testNameSuffix) => {
          // Ensure expected !== received so the assertion actually fails
          fc.pre(expected !== received);

          const testName = `failing-test-${testNameSuffix}`;
          const fileName = `__jest_failure_prop_${testNameSuffix}_${Date.now()}.test.ts`;
          const tempFile = path.join(testsDir, fileName);

          const testContent = `test('${testName}', () => {\n  expect(${received}).toBe(${expected});\n});\n`;

          try {
            fs.writeFileSync(tempFile, testContent, 'utf8');

            const result = spawnSync(
              jestBin,
              [
                '--testPathPatterns',
                fileName.replace(/\./g, '\\.'),
                '--no-coverage',
                '--forceExit',
              ],
              {
                cwd: projectRoot,
                encoding: 'utf8',
                shell: process.platform === 'win32',
                timeout: 30000,
              },
            );

            const output = (result.stdout ?? '') + (result.stderr ?? '');

            // Jest must exit non-zero because the test fails
            if (result.status === 0) {
              return false;
            }

            // Output must contain the test name
            if (!output.includes(testName)) {
              return false;
            }

            // Output must contain "Expected" and "Received" labels (Jest's diff output)
            if (!output.includes('Expected') || !output.includes('Received')) {
              return false;
            }

            // Output must contain the actual expected and received values
            if (!output.includes(String(expected)) || !output.includes(String(received))) {
              return false;
            }

            return true;
          } finally {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          }
        },
      ),
      { numRuns: 5 },
    );
  }, 180000);
});
