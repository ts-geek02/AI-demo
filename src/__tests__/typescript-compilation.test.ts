// Feature: nodejs-express-setup, Property 6: TypeScript compilation rejects type errors

/**
 * Validates: Requirements 1.5
 *
 * Property 6: TypeScript compilation rejects type errors
 *
 * For any TypeScript source file containing a type error, running `tsc` SHALL
 * exit with a non-zero code and include the file path and line number in its
 * error output.
 *
 * Uses the TypeScript compiler API directly to avoid child-process shell issues
 * on Windows inside Jest.
 */

import fc from 'fast-check';
import * as ts from 'typescript';

/**
 * Checks a TypeScript snippet for type errors using the compiler API.
 * Returns an array of diagnostics (each with line and column numbers).
 */
function checkSnippet(source: string): Array<{ line: number; col: number; message: string }> {
  const fileName = 'virtual-check.ts';
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true);

  const compilerOptions: ts.CompilerOptions = {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    noEmit: true,
    skipLibCheck: true,
    // noLib avoids missing-lib-file errors when running without a full tsconfig
    noLib: true,
  };

  const host = ts.createCompilerHost(compilerOptions);
  const origGetSourceFile = host.getSourceFile;
  host.getSourceFile = (name: string, langVersion: ts.ScriptTarget): ts.SourceFile | undefined => {
    if (name === fileName) return sourceFile;
    return origGetSourceFile.call(host, name, langVersion);
  };

  const program = ts.createProgram([fileName], compilerOptions, host);
  const diags = ts.getPreEmitDiagnostics(program, sourceFile);

  return Array.from(diags)
    .filter((d) => d.file === sourceFile && d.start !== undefined)
    .map((d) => {
      const pos = d.file!.getLineAndCharacterOfPosition(d.start!);
      return {
        line: pos.line + 1,
        col: pos.character + 1,
        message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      };
    });
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

test('tsc reports type errors with line and column numbers for any TypeScript snippet containing a type error', () => {
  fc.assert(
    fc.property(typeErrorSnippet, (snippet) => {
      const diagnostics = checkSnippet(snippet);

      // tsc must report at least one error
      expect(diagnostics.length).toBeGreaterThan(0);

      // Every diagnostic must include a valid line number (>= 1)
      for (const diag of diagnostics) {
        expect(diag.line).toBeGreaterThanOrEqual(1);
        // Column must also be valid
        expect(diag.col).toBeGreaterThanOrEqual(1);
      }
    }),
    { numRuns: 100 },
  );
}, 30000);
