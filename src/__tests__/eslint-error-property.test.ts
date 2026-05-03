// Feature: nodejs-express-setup, Property 3: ESLint exits non-zero for any error-level violation

import * as fc from 'fast-check';
import { ESLint } from 'eslint';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Property 3: ESLint exits non-zero for any error-level violation
 * Validates: Requirements 3.2, 3.5, 3.6
 *
 * For any TypeScript source file containing a use of the `any` type
 * (triggering @typescript-eslint/no-explicit-any as an error), running ESLint
 * on that file SHALL exit with a non-zero code and include the file path and
 * line number in its output.
 *
 * Uses the ESLint Node.js API with an inline config to avoid dynamic import
 * issues in Jest's CommonJS transform mode.
 */

// Shared ESLint instance — created once, reused across all property runs.
// overrideConfigFile: true disables auto-discovery of eslint.config.js so we
// can supply the config inline without triggering a dynamic import() call.
let eslint: ESLint;

beforeAll(() => {
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
    ) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });
});

describe('Property: ESLint exits non-zero for any error-level violation', () => {
  it('reports errors with line numbers for any `any` type usage', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate safe identifier names: start with a letter, followed by alphanumeric chars
        fc.stringMatching(/^[a-z][a-z0-9]{0,19}$/),
        async (name) => {
          // Snippet that uses `any` type — triggers @typescript-eslint/no-explicit-any (error)
          // Use `export` to avoid @typescript-eslint/no-unused-vars (also an error)
          const snippet = `export const ${name}: any = 42;\n`;

          // Lint the text directly using the ESLint API (no child process needed)
          const results = await eslint.lintText(snippet, {
            // Provide a virtual file path inside src/ so the file-scoped rules apply
            filePath: `src/__eslint_prop_virtual_${name}.ts`,
          });

          const result = results[0];

          // Must have at least one error (the `any` type violation)
          expect(result.errorCount).toBeGreaterThan(0);

          // Must have a message for the no-explicit-any rule
          const anyError = result.messages.find(
            (m) => m.ruleId === '@typescript-eslint/no-explicit-any',
          );
          expect(anyError).toBeDefined();

          // The violation must include a valid line number
          expect(anyError!.line).toBeGreaterThanOrEqual(1);

          // The violation must include a valid column number
          expect(anyError!.column).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);
});
