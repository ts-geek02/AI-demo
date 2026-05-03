// Feature: nodejs-express-setup, Property 6: TypeScript compilation rejects type errors

/**
 * Validates: Requirements 1.5
 *
 * Property 6: TypeScript compilation rejects type errors
 *
 * For any TypeScript source file containing a type error, running `tsc` SHALL
 * exit with a non-zero code and include the file path and line number in its
 * error output.
 */

import fc from 'fast-check';
import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

const TSC_BIN = resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  'tsc' + (process.platform === 'win32' ? '.cmd' : ''),
);

/**
 * Writes a TypeScript snippet to a temp file, runs tsc on it (no-emit, strict),
 * and returns the result.
 */
function runTscOnSnippet(snippet: string): { exitCode: number; output: string } {
  const dir = tmpdir();
  const fileName = `tsc-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`;
  const filePath = join(dir, fileName);

  try {
    writeFileSync(filePath, snippet, 'utf8');

    const result = spawnSync(
      TSC_BIN,
      [
        '--noEmit',
        '--strict',
        '--target',
        'ES2022',
        '--module',
        'CommonJS',
        '--skipLibCheck',
        '--ignoreConfig',
        filePath,
      ],
      { encoding: 'utf8', timeout: 15000, shell: process.platform === 'win32' },
    );

    const output = (result.stdout ?? '') + (result.stderr ?? '');
    const exitCode = result.status ?? 1;

    return { exitCode, output };
  } finally {
    try {
      unlinkSync(filePath);
    } catch {
      // ignore cleanup errors
    }
  }
}

// ---------------------------------------------------------------------------
// Generators for TypeScript snippets with deliberate type errors
// ---------------------------------------------------------------------------

/**
 * Generates a variable name safe for use in TypeScript.
 */
const safeIdentifier = fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/).filter((s) => s.length >= 2);

/**
 * Generates snippets that assign a string literal to a variable declared as
 * `number`. This is always a type error under strict mode.
 */
const stringToNumberError = fc
  .tuple(safeIdentifier, fc.string({ maxLength: 20 }))
  .map(([varName, strVal]) => `const ${varName}: number = ${JSON.stringify(strVal)};\n`);

/**
 * Generates snippets that assign a number literal to a variable declared as
 * `string`. Always a type error.
 */
const numberToStringError = fc
  .tuple(safeIdentifier, fc.integer({ min: -1000, max: 1000 }))
  .map(([varName, num]) => `const ${varName}: string = ${num};\n`);

/**
 * Generates snippets that call a function with the wrong number of arguments.
 * e.g. `function f(x: number): number { return x; } f();`
 */
const wrongArgCountError = safeIdentifier.map(
  (fnName) => `function ${fnName}(x: number): number { return x; }\n${fnName}();\n`,
);

/**
 * Generates snippets that access a property that does not exist on a type.
 * e.g. `const x: { a: number } = { a: 1 }; x.nonExistent;`
 */
const nonExistentPropertyError = fc
  .tuple(safeIdentifier, safeIdentifier)
  .filter(([a, b]) => a !== b)
  .map(
    ([varName, propName]) =>
      `const ${varName}: { a: number } = { a: 1 };\n${varName}.${propName};\n`,
  );

/**
 * Combined arbitrary: pick one of the four error categories.
 */
const typeErrorSnippet = fc.oneof(
  stringToNumberError,
  numberToStringError,
  wrongArgCountError,
  nonExistentPropertyError,
);

// ---------------------------------------------------------------------------
// Property test
// ---------------------------------------------------------------------------

test('tsc exits non-zero for any TypeScript snippet containing a type error', () => {
  fc.assert(
    fc.property(typeErrorSnippet, (snippet) => {
      const { exitCode, output } = runTscOnSnippet(snippet);

      // tsc must exit non-zero
      expect(exitCode).not.toBe(0);

      // tsc output must reference the temp file path (file path in error)
      // and include a line number (pattern: filename.ts:line:col or filename.ts(line,col))
      expect(output).toMatch(/\.ts[:(]\d+/);
    }),
    { numRuns: 100 },
  );
}, 60000); // generous timeout: 100 runs × ~150ms each = ~15s; allow 60s
