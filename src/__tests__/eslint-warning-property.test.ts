// Feature: nodejs-express-setup, Property 4: ESLint reports warnings for rule violations classified as warnings

import * as fc from 'fast-check';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Property 4: ESLint reports warnings for rule violations classified as warnings
 * Validates: Requirements 3.3, 3.4, 3.5
 *
 * For any TypeScript source file containing either:
 *   - a `console.*` call (triggering `no-console` as a warning), or
 *   - a function missing an explicit return type annotation
 *     (triggering `@typescript-eslint/explicit-function-return-type` as a warning),
 * running ESLint on that file SHALL report a warning with the file path and line number.
 * ESLint SHALL exit with code 0 (warnings do not cause a non-zero exit).
 */

const eslintBin = path.resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  'eslint' + (process.platform === 'win32' ? '.cmd' : ''),
);

const projectRoot = process.cwd();

/** Arbitrary that generates a `no-console` warning snippet */
const noConsoleSnippet = fc
  .constantFrom('log', 'warn', 'error', 'info', 'debug')
  .map((method) => `console.${method}("hello");\n`);

/** Arbitrary that generates an `explicit-function-return-type` warning snippet.
 *  The function is exported to avoid triggering `@typescript-eslint/no-unused-vars` (an error).
 */
const missingReturnTypeSnippet = fc
  .stringMatching(/^[a-z][a-z0-9]{0,19}$/)
  .map((name) => `export function ${name}() { return 42; }\n`);

describe('Property: ESLint reports warnings for rule violations classified as warnings', () => {
  it('reports a warning with file path and line number, and exits 0, for any warning-level violation', () => {
    fc.assert(
      fc.property(fc.oneof(noConsoleSnippet, missingReturnTypeSnippet), (snippet) => {
        const tempFileName = `__eslint_warn_prop_test_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.ts`;
        const tempFilePath = path.join(projectRoot, 'src', tempFileName);

        try {
          fs.writeFileSync(tempFilePath, snippet, 'utf8');

          const result = spawnSync(eslintBin, [tempFilePath], {
            cwd: projectRoot,
            encoding: 'utf8',
            shell: process.platform === 'win32',
          });

          const output = (result.stdout ?? '') + (result.stderr ?? '');

          // ESLint exits 0 when there are only warnings (no errors)
          expect(result.status).toBe(0);

          // Output should contain the word "warning" (case-insensitive)
          expect(output.toLowerCase()).toContain('warning');

          // Output should include the file name so the developer can locate the violation
          expect(output).toContain(tempFileName);

          // Output should include a line number reference in ESLint's "row:col" format
          const hasLineNumber = /\b1:\d+\b/.test(output) || /line\s+1\b/i.test(output);
          expect(hasLineNumber).toBe(true);
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
