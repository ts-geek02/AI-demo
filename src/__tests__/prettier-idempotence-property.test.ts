// Feature: nodejs-express-setup, Property 5: Prettier format-check is idempotent

import * as fc from 'fast-check';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Property 5: Prettier format-check is idempotent
 * Validates: Requirements 4.4, 4.5
 *
 * For any source file that has been processed by prettier --write, running
 * prettier --check on that same file SHALL exit with code 0 — i.e., Prettier's
 * formatting is stable and applying it twice produces the same result as
 * applying it once.
 */

const prettierBin = path.resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  'prettier' + (process.platform === 'win32' ? '.cmd' : ''),
);

const projectRoot = process.cwd();

describe('Property: Prettier format-check is idempotent', () => {
  it('prettier formatting is idempotent for any TypeScript source', () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const tempFileName = `__prettier_prop_test_${Date.now()}_${Math.random().toString(36).slice(2)}.ts`;
        const tempFilePath = path.join(projectRoot, 'src', tempFileName);

        try {
          fs.writeFileSync(tempFilePath, source, 'utf8');

          // Step 1: Format the file with prettier --write
          const writeResult = spawnSync(prettierBin, ['--write', tempFilePath], {
            cwd: projectRoot,
            encoding: 'utf8',
            shell: process.platform === 'win32',
          });

          // If prettier --write fails (e.g. unparseable content), skip this case
          if (writeResult.status !== 0) {
            return true;
          }

          // Step 2: Run prettier --check on the now-formatted file
          const checkResult = spawnSync(prettierBin, ['--check', tempFilePath], {
            cwd: projectRoot,
            encoding: 'utf8',
            shell: process.platform === 'win32',
          });

          // prettier --check must exit 0 (file is already formatted)
          return checkResult.status === 0;
        } finally {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      }),
      { numRuns: 100 },
    );
  }, 120000);
});
