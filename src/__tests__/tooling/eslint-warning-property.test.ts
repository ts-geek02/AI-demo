// Feature: nodejs-express-setup, Property 4: ESLint reports warnings for rule violations classified as warnings

import * as fc from 'fast-check';
import { ESLint } from 'eslint';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

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
 *
 * Uses the ESLint Node.js API with an inline config to avoid dynamic import
 * issues in Jest's CommonJS transform mode.
 */

// Shared ESLint instance — created once, reused across all property runs.
// overrideConfigFile: true disables auto-discovery of eslint.config.js so we
// can supply the config inline without triggering a dynamic import() call.
let eslint: ESLint;

beforeAll(() => {
  // tseslint.config() returns a type incompatible with ESLint's overrideConfig parameter.
  // The `as any` cast is unavoidable until typescript-eslint aligns these types.
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
  eslint = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: true,
    overrideConfig: tseslint.config(
      js.configs.recommended,
      ...tseslint.configs.recommended,
      prettier,
      {
        files: ['src/**/*.ts'],
        rules: {
          '@typescript-eslint/no-explicit-any': 'error',
          '@typescript-eslint/explicit-function-return-type': 'warn',
          'no-console': 'warn',
        },
      },
    ) as any,
  });
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
});

/** Arbitrary that generates a `no-console` warning snippet */
const noConsoleSnippet = fc
  .constantFrom('log', 'warn', 'error', 'info', 'debug')
  .map((method) => ({ snippet: `console.${method}("hello");\n`, rule: 'no-console' }));

/** Arbitrary that generates an `explicit-function-return-type` warning snippet.
 *  The function is exported to avoid triggering `@typescript-eslint/no-unused-vars` (an error).
 */
const missingReturnTypeSnippet = fc.stringMatching(/^[a-z][a-z0-9]{0,19}$/).map((name) => ({
  snippet: `export function ${name}() { return 42; }\n`,
  rule: '@typescript-eslint/explicit-function-return-type',
}));

describe('Property: ESLint reports warnings for rule violations classified as warnings', () => {
  it('reports a warning with line number, and zero errors, for any warning-level violation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(noConsoleSnippet, missingReturnTypeSnippet),
        async ({ snippet, rule }) => {
          // Lint the text directly using the ESLint API (no child process needed)
          const results = await eslint.lintText(snippet, {
            // Provide a virtual file path inside src/ so the file-scoped rules apply
            filePath: `src/__eslint_warn_prop_virtual.ts`,
          });

          const result = results[0];

          // Must have zero errors (warnings only)
          expect(result.errorCount).toBe(0);

          // Must have at least one warning
          expect(result.warningCount).toBeGreaterThan(0);

          // Must have a message for the expected warning rule
          const warning = result.messages.find((m) => m.ruleId === rule);
          expect(warning).toBeDefined();

          // The warning must include a valid line number
          expect(warning!.line).toBeGreaterThanOrEqual(1);

          // The warning must include a valid column number
          expect(warning!.column).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);
});
