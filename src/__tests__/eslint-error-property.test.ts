// Feature: nodejs-express-setup, Property 3: ESLint exits non-zero for any error-level violation

import * as fc from 'fast-check';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Property 3: ESLint exits non-zero for any error-level violation
 * Validates: Requirements 3.2, 3.5, 3.6
 *
 * For any TypeScript source file containing a use of the `any` type
 * (triggering @typescript-eslint/no-explicit-any as an error), running ESLint
 * on that file SHALL exit with a non-zero code and include the file path and
 * line number in its output.
 */

const eslintBin = path.resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  'eslint' + (process.platform === 'win32' ? '.cmd' : ''),
);

const projectRoot = process.cwd();

describe('Property: ESLint exits non-zero for any error-level violation', () => {
  it('exits non-zero and reports file path and line number for any `any` type usage', () => {
    fc.assert(
      fc.property(
        // Generate safe identifier names: start with a letter, followed by alphanumeric chars
        fc.stringMatching(/^[a-z][a-z0-9]{0,19}$/),
        (name) => {
          // Create a TypeScript snippet that uses `any` type — triggers @typescript-eslint/no-explicit-any
          const snippet = `const ${name}: any = 42;\n`;

          // Write temp file inside src/ so ESLint picks up the config
          const tempFileName = `__eslint_prop_test_${Date.now()}_${Math.random().toString(36).slice(2)}.ts`;
          const tempFilePath = path.join(projectRoot, 'src', tempFileName);

          try {
            fs.writeFileSync(tempFilePath, snippet, 'utf8');

            const result = spawnSync(eslintBin, [tempFilePath], {
              cwd: projectRoot,
              encoding: 'utf8',
              shell: process.platform === 'win32',
            });

            const output = (result.stdout ?? '') + (result.stderr ?? '');

            // ESLint should exit non-zero (exit code 1) when there are errors
            expect(result.status).not.toBe(0);

            // Output should include the file path (basename is sufficient since full path is in output)
            expect(output).toContain(tempFileName);

            // Output should include a line number reference in the format "filename.ts:1:" or "1:1"
            // ESLint outputs violations as "  1:7  error  ..." or includes "line 1"
            const hasLineNumber = /\b1:\d+\b/.test(output) || /line\s+1\b/i.test(output);
            expect(hasLineNumber).toBe(true);
          } finally {
            // Clean up temp file
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 120000);
});
