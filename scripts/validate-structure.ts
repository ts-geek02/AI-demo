#!/usr/bin/env tsx
/**
 * validate-structure.ts
 *
 * Verifies that every TypeScript source module under src/ (excluding __tests__
 * and styles) has a corresponding test directory and at least one test file
 * under src/__tests__/<module>/.
 *
 * Exits non-zero if any module is missing test coverage, blocking the push.
 *
 * Called automatically by the pre-push hook.
 * Skip with: SKIP_STRUCTURE_CHECK=1 git push
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const TEST_DIR = path.join(ROOT, 'src', '__tests__');

/** Directories and patterns inside src/ that don't need test coverage */
const EXCLUDED_DIRS = new Set(['__tests__', 'styles']);
const EXCLUDED_EXTENSIONS = new Set(['.css', '.json', '.html']);

function log(msg: string): void {
  process.stdout.write(`[validate-structure] ${msg}\n`);
}

function error(msg: string): void {
  process.stderr.write(`[validate-structure] ERROR: ${msg}\n`);
}

/**
 * Recursively collect all .ts source files under a directory,
 * returning paths relative to SRC_DIR.
 */
function collectSourceFiles(dir: string, base: string = ''): string[] {
  const results: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      results.push(...collectSourceFiles(path.join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (EXCLUDED_EXTENSIONS.has(ext)) {
        continue;
      }
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) {
        continue;
      }
      if (ext === '.ts') {
        results.push(rel);
      }
    }
  }

  return results;
}

/**
 * For a source file like `index.ts` or `utils/helpers.ts`, returns the
 * expected test directory path: `src/__tests__/index/` or `src/__tests__/utils/helpers/`
 */
function expectedTestDir(sourceRelPath: string): string {
  const parsed = path.parse(sourceRelPath);
  // e.g. "index" or "utils/helpers"
  const moduleKey = parsed.dir ? `${parsed.dir}/${parsed.name}` : parsed.name;
  return path.join(TEST_DIR, moduleKey);
}

/**
 * Returns true if the test directory exists and contains at least one .test.ts file.
 */
function hasTestCoverage(testDir: string): boolean {
  if (!fs.existsSync(testDir)) {
    return false;
  }
  const files = fs.readdirSync(testDir);
  return files.some((f) => f.endsWith('.test.ts') || f.endsWith('.spec.ts'));
}

function main(): void {
  if (process.env['SKIP_STRUCTURE_CHECK'] === '1') {
    log('SKIP_STRUCTURE_CHECK=1 — skipping structure validation.');
    return;
  }

  if (!fs.existsSync(SRC_DIR)) {
    error(`Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  const sourceFiles = collectSourceFiles(SRC_DIR);

  if (sourceFiles.length === 0) {
    log('No source files found — nothing to validate.');
    return;
  }

  const missing: string[] = [];

  for (const sourceFile of sourceFiles) {
    const testDir = expectedTestDir(sourceFile);
    if (!hasTestCoverage(testDir)) {
      missing.push(sourceFile);
    }
  }

  if (missing.length === 0) {
    log(`✓ All ${sourceFiles.length} module(s) have test coverage.`);
    return;
  }

  error(`The following module(s) are missing a test directory with test files:`);
  for (const f of missing) {
    const testDir = expectedTestDir(f);
    const relTestDir = path.relative(ROOT, testDir);
    error(`  src/${f}  →  expected tests in  ${relTestDir}/`);
  }
  error(
    `\nRun 'npm run generate-tests' to generate them, or add SKIP_STRUCTURE_CHECK=1 to bypass.`,
  );

  process.exit(1);
}

main();
