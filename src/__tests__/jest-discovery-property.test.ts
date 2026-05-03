// Feature: nodejs-express-setup, Property 7: Jest discovers and runs all matching test files

import * as fc from 'fast-check';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Property 7: Jest discovers and runs all matching test files
 * Validates: Requirements 5.3
 *
 * For any test file placed under src/ whose name matches *.test.ts or *.spec.ts,
 * running jest SHALL discover and execute that file, and the test results SHALL
 * include the file's test names.
 */

const jestBin = path.resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  'jest' + (process.platform === 'win32' ? '.cmd' : ''),
);

const projectRoot = process.cwd();
const testsDir = path.join(projectRoot, 'src', '__tests__');

const MINIMAL_TEST_CONTENT = `test('placeholder', () => { expect(true).toBe(true); });\n`;

describe('Property: Jest discovers and runs all matching test files', () => {
  it('jest discovers and executes any *.test.ts file placed under src/__tests__/', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/),
        fc.constantFrom('.test.ts', '.spec.ts'),
        (baseName, suffix) => {
          const fileName = `__jest_prop_${baseName}${suffix}`;
          const filePath = path.join(testsDir, fileName);

          try {
            fs.writeFileSync(filePath, MINIMAL_TEST_CONTENT, 'utf8');

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

            // Jest must exit with code 0 (test discovered and passed)
            if (result.status !== 0) {
              return false;
            }

            // Jest output must reference the test file name (without extension for robustness)
            const baseWithoutExt = fileName.replace(/\.(test|spec)\.ts$/, '');
            return output.includes(baseWithoutExt) || output.includes(fileName);
          } finally {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        },
      ),
      { numRuns: 5 },
    );
  }, 180000);
});
