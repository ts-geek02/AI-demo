import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// ---------------------------------------------------------------------------
// Shared rule sets — applied to all TypeScript files unless overridden below
// ---------------------------------------------------------------------------

/** Rules that apply everywhere (src + scripts) */
const sharedRules = {
  // --- Correctness -----------------------------------------------------------
  'no-var': 'error', // always use const/let
  'prefer-const': 'error', // use const when variable is never reassigned
  'no-param-reassign': 'error', // reassigning params causes subtle bugs
  'no-shadow': 'off', // disabled in favour of the TS-aware version below
  'no-use-before-define': 'off', // disabled in favour of the TS-aware version below
  'no-duplicate-imports': 'error', // merge imports from the same module
  'no-promise-executor-return': 'error', // returning a value from a Promise executor is a bug
  'no-constructor-return': 'error', // constructors must not return values
  'no-self-compare': 'error', // x === x is always a bug
  'no-template-curly-in-string': 'error', // catch `"Hello ${name}"` (missing backtick)
  'require-atomic-updates': 'error', // prevent race conditions in async code
  'no-await-in-loop': 'warn', // prefer Promise.all() over sequential awaits

  // --- Code quality ----------------------------------------------------------
  eqeqeq: ['error', 'always'], // always use === / !==
  curly: ['error', 'all'], // always use braces, even for single-line blocks
  'no-else-return': 'error', // remove unnecessary else after return
  'no-lonely-if': 'error', // merge lonely if into else-if
  'no-nested-ternary': 'error', // nested ternaries are unreadable
  'no-unneeded-ternary': 'error', // `x ? true : false` → `Boolean(x)`
  'prefer-template': 'error', // use template literals instead of string concat
  'object-shorthand': 'error', // `{ foo: foo }` → `{ foo }`
  'prefer-destructuring': [
    'error',
    {
      // destructure arrays and objects where possible
      array: false, // array destructuring can hurt readability
      object: true,
    },
  ],
  'prefer-rest-params': 'error', // use rest params instead of `arguments`
  'prefer-spread': 'error', // use spread instead of `.apply()`
  'no-useless-rename': 'error', // `import { a as a }` → `import { a }`
  'no-useless-return': 'error', // remove pointless `return;` at end of function
  'no-useless-concat': 'error', // `'a' + 'b'` → `'ab'`
  'no-implicit-coercion': 'error', // ban `!!x`, `+x`, `"" + x` coercions
  'spaced-comment': ['error', 'always'], // enforce space after `//` and `/*`
  yoda: 'error', // `if (42 === x)` → `if (x === 42)`

  // --- TypeScript-specific ---------------------------------------------------
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    {
      allowExpressions: true, // allow `const fn = () => value` without annotation
      allowHigherOrderFunctions: true, // allow HOF callbacks without annotation
      allowTypedFunctionExpressions: true, // allow typed function expressions
    },
  ],
  '@typescript-eslint/explicit-member-accessibility': [
    'error',
    {
      accessibility: 'explicit', // all class members must have an explicit access modifier
    },
  ],
  '@typescript-eslint/no-shadow': 'error', // TS-aware variable shadowing check
  '@typescript-eslint/no-use-before-define': [
    'error',
    {
      functions: false, // hoisted functions are fine
      classes: true,
      variables: true,
    },
  ],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    {
      prefer: 'type-imports', // use `import type` for type-only imports
      fixStyle: 'inline-type-imports',
    },
  ],
  '@typescript-eslint/consistent-type-exports': [
    'error',
    {
      fixMixedExportsWithInlineTypeSpecifier: true,
    },
  ],
  '@typescript-eslint/no-unnecessary-condition': 'error', // remove always-true/false conditions
  '@typescript-eslint/no-unnecessary-type-assertion': 'error', // remove redundant `as` casts
  '@typescript-eslint/no-non-null-assertion': 'error', // ban `!` non-null assertions
  '@typescript-eslint/prefer-nullish-coalescing': 'error', // `||` → `??` for null/undefined checks
  '@typescript-eslint/prefer-optional-chain': 'error', // `a && a.b` → `a?.b`
  '@typescript-eslint/no-floating-promises': 'error', // every Promise must be awaited or handled
  '@typescript-eslint/await-thenable': 'error', // ban `await` on non-Promise values
  '@typescript-eslint/no-misused-promises': 'error', // ban Promises in boolean positions
  '@typescript-eslint/require-await': 'error', // async functions must contain await
  '@typescript-eslint/return-await': ['error', 'in-try-catch'], // return await inside try/catch
  '@typescript-eslint/no-redundant-type-constituents': 'error', // `string | any` → `any`
  '@typescript-eslint/no-useless-empty-export': 'error', // remove empty `export {}`
  '@typescript-eslint/prefer-as-const': 'error', // `'foo' as 'foo'` → `'foo' as const`
  '@typescript-eslint/array-type': ['error', { default: 'array-simple' }], // T[] for simple, Array<T> for complex
  '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'], // use Record<K,V>
  '@typescript-eslint/no-import-type-side-effects': 'error', // ban `import type` with side effects
};

/** Extra rules for src/ — stricter about console and side effects */
const srcOnlyRules = {
  'no-console': 'error', // use a proper logger in application code
};

/** Relaxed overrides for scripts/ — console output is intentional */
const scriptsOnlyRules = {
  'no-console': 'off',
  // Scripts use dynamic require() for CJS compat checks — allow it
  '@typescript-eslint/no-require-imports': 'off',
  // Scripts may need to catch unknown errors without a typed variable
  '@typescript-eslint/no-unsafe-member-access': 'off',
};

/** Relaxed overrides for test files */
const testOnlyRules = {
  'no-console': 'off',
  '@typescript-eslint/no-explicit-any': 'warn', // mocks sometimes need any
  '@typescript-eslint/no-non-null-assertion': 'off', // common in test assertions
  '@typescript-eslint/no-floating-promises': 'off', // Jest handles promise resolution
  '@typescript-eslint/require-await': 'off', // async test helpers may not await
  '@typescript-eslint/explicit-function-return-type': 'off', // test callbacks are verbose enough
  '@typescript-eslint/explicit-member-accessibility': 'off',
  '@typescript-eslint/no-unnecessary-condition': 'off', // test guards are intentional
};

// ---------------------------------------------------------------------------
// Config export
// ---------------------------------------------------------------------------

export default tseslint.config(
  // Base recommended rule sets
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked, // type-aware rules (requires parserOptions.project)
  prettier, // disable formatting rules handled by Prettier

  // Parser options — required for type-aware rules.
  // eslint.config.js itself is a plain JS file (not in any tsconfig), so we
  // must exclude it from typed linting to avoid the "not included in project"
  // parse error that blocks the pre-commit hook.
  {
    ignores: ['eslint.config.js'],
  },
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.scripts.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Application source files
  {
    files: ['src/**/*.ts'],
    ignores: ['src/__tests__/**'],
    rules: {
      ...sharedRules,
      ...srcOnlyRules,
    },
  },

  // Test files
  {
    files: ['src/__tests__/**/*.ts'],
    rules: {
      ...sharedRules,
      ...testOnlyRules,
    },
  },

  // Build / utility scripts
  {
    files: ['scripts/**/*.ts'],
    rules: {
      ...sharedRules,
      ...scriptsOnlyRules,
    },
  },

  // Global ignores
  {
    ignores: ['dist/**', 'dist-scripts/**', 'node_modules/**', 'coverage/**'],
  },
);
