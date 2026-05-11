#!/usr/bin/env tsx
/**
 * generate-tests.ts
 *
 * Analyses TypeScript source files changed in the current push, calls the
 * configured AI provider to generate unit tests, writes them under
 * src/__tests__/<module>/<file>.test.ts, then commits the new files so they
 * travel with the push.
 *
 * Configuration: ai.config.json at the project root.
 * Provider:      set "provider" in ai.config.json (grok | openai | anthropic).
 * API key:       set the matching env var (XAI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY).
 *
 * Usage (called automatically by the pre-push hook):
 *   npx tsx scripts/generate-tests.ts
 *
 * Skip for a single push (e.g. CI):
 *   SKIP_AI_TESTS=1 git push
 */

import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createProvider } from './providers/index.js';
import type { AIConfig } from './providers/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = process.cwd();

function log(msg: string): void {
  process.stdout.write(`[generate-tests] ${msg}\n`);
}

function warn(msg: string): void {
  process.stderr.write(`[generate-tests] WARN: ${msg}\n`);
}

/** Load and validate ai.config.json */
function loadConfig(): AIConfig {
  const configPath = path.join(ROOT, 'ai.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`ai.config.json not found at ${configPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<AIConfig>;

  return {
    provider: raw.provider ?? 'grok',
    model: raw.model ?? 'grok-3-mini',
    testDir: raw.testDir ?? 'src/__tests__',
    sourceDir: raw.sourceDir ?? 'src',
    sourceExtensions: raw.sourceExtensions ?? ['.ts'],
    excludePatterns: raw.excludePatterns ?? [
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/styles/**',
    ],
    maxTokens: raw.maxTokens ?? 4096,
    temperature: raw.temperature ?? 0.2,
  };
}

/**
 * Returns the list of TypeScript source files that were changed between the
 * remote tracking branch and HEAD (i.e. what this push adds).
 * Falls back to all source files if the remote branch doesn't exist yet.
 */
function getChangedSourceFiles(config: AIConfig): string[] {
  let diffOutput: string;

  try {
    // Try to diff against the remote tracking branch
    const remote = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    diffOutput = execSync(`git diff --name-only ${remote}..HEAD`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // No upstream set — diff against the previous commit, or list all tracked files
    try {
      diffOutput = execSync('git diff --name-only HEAD~1..HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      // First commit — list all staged/tracked source files
      diffOutput = execSync('git ls-files', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }
  }

  const allChanged = diffOutput
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);

  return allChanged.filter((file) => isSourceFile(file, config));
}

/** Returns true if the file is a source file we should generate tests for */
function isSourceFile(filePath: string, config: AIConfig): boolean {
  const ext = path.extname(filePath);
  if (!config.sourceExtensions.includes(ext)) {
    return false;
  }

  // Must be inside sourceDir
  const normalised = filePath.replace(/\\/g, '/');
  if (!normalised.startsWith(`${config.sourceDir.replace(/\\/g, '/')}/`)) {
    return false;
  }

  // Must not match any exclude pattern
  for (const pattern of config.excludePatterns) {
    if (matchesGlob(normalised, pattern)) {
      return false;
    }
  }

  return true;
}

/** Minimal glob matcher supporting ** and * wildcards */
function matchesGlob(filePath: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '§DOUBLE§')
    .replace(/\*/g, '[^/]*')
    .replace(/§DOUBLE§/g, '.*');
  return new RegExp(`^${regexStr}$`).test(filePath);
}

/**
 * Derives the test file path for a given source file.
 * src/foo/bar.ts  →  src/__tests__/foo/bar.test.ts
 */
function testFilePath(sourceFile: string, config: AIConfig): string {
  const relative = path.relative(config.sourceDir, sourceFile);
  const parsed = path.parse(relative);
  const testFileName = `${parsed.name}.test${parsed.ext}`;
  return path.join(config.testDir, parsed.dir, testFileName);
}

/** Build the prompt sent to the AI */
function buildPrompt(sourceFile: string, sourceCode: string, testFileDest: string): string {
  const moduleName = path.basename(sourceFile, path.extname(sourceFile));
  const importPath = path
    .relative(path.dirname(testFileDest), sourceFile)
    .replace(/\\/g, '/')
    .replace(/\.ts$/, '');

  return `You are an expert TypeScript developer. Generate comprehensive Jest unit tests for the following TypeScript module.

## Source file: ${sourceFile}

\`\`\`typescript
${sourceCode}
\`\`\`

## Requirements

1. Use Jest with TypeScript (ts-jest). Import from \`'${importPath}'\`.
2. Use \`@faker-js/faker\` to generate ALL test data — strings, numbers, IDs, emails, URLs, etc.
   Import it as: \`import { faker } from '@faker-js/faker/locale/en';\`
   Never use hardcoded literals like \`'test'\`, \`123\`, or \`'foo@bar.com'\` — always use Faker.
3. Cover every exported function, class, and constant.
4. Include happy-path tests, edge cases, and error/boundary conditions.
5. Use \`describe\` blocks to group related tests.
6. Use \`supertest\` for any Express route tests (import \`app\` from the module if it exports one).
7. Do NOT test private/internal implementation details — only the public API.
8. Each test must have a clear, descriptive name.
9. Do NOT include any markdown fences or explanation — output ONLY the raw TypeScript test file content.
10. The file must compile with strict TypeScript (no implicit any, proper types).
11. Module: \`${moduleName}\`

Output only the TypeScript source code of the test file, starting with the imports.`;
}

/** Extract a TypeScript code block from the AI response (handles markdown fences) */
function extractCode(response: string): string {
  // Strip markdown code fences if the AI included them despite instructions
  const fenceMatch = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
  if (fenceMatch?.[1] !== undefined) {
    return fenceMatch[1].trim();
  }
  return response.trim();
}

/** Commit newly generated test files */
function commitGeneratedTests(files: string[]): void {
  if (files.length === 0) {
    return;
  }

  for (const f of files) {
    spawnSync('git', ['add', f], { stdio: 'inherit' });
  }

  const message = `chore: add AI-generated unit tests for ${files.length} module(s)\n\nGenerated by scripts/generate-tests.ts`;
  const result = spawnSync('git', ['commit', '-m', message, '--no-verify'], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    warn('git commit failed — generated test files are staged but not committed.');
  } else {
    log(`Committed ${files.length} generated test file(s).`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Allow skipping (e.g. in CI where tests are run separately)
  if (process.env['SKIP_AI_TESTS'] === '1') {
    log('SKIP_AI_TESTS=1 — skipping test generation.');
    return;
  }

  const config = loadConfig();
  log(`Provider: ${config.provider} | Model: ${config.model}`);

  const changedFiles = getChangedSourceFiles(config);

  if (changedFiles.length === 0) {
    log('No source files changed — nothing to generate.');
    return;
  }

  log(`Changed source files: ${changedFiles.join(', ')}`);

  // Filter out files that already have a test file (duplicate prevention)
  const filesToProcess = changedFiles.filter((sourceFile) => {
    const dest = testFilePath(sourceFile, config);
    if (fs.existsSync(dest)) {
      log(`Skipping ${sourceFile} — test file already exists at ${dest}`);
      return false;
    }
    return true;
  });

  if (filesToProcess.length === 0) {
    log('All changed files already have test files — nothing to generate.');
    return;
  }

  // Initialise the AI provider
  let provider;
  try {
    provider = await createProvider(config.provider);
  } catch (err) {
    warn(`Could not initialise AI provider: ${(err as Error).message}`);
    warn('Skipping test generation. Set the required API key env var to enable it.');
    return;
  }

  const generatedFiles: string[] = [];

  // Process files sequentially — parallel requests would hammer the AI API
  // rate limits and make error attribution harder.
  for (const sourceFile of filesToProcess) {
    const absSource = path.join(ROOT, sourceFile);
    if (!fs.existsSync(absSource)) {
      warn(`Source file not found: ${absSource} — skipping.`);
      continue;
    }

    const sourceCode = fs.readFileSync(absSource, 'utf8');
    const dest = testFilePath(sourceFile, config);
    const absDest = path.join(ROOT, dest);

    log(`Generating tests for ${sourceFile} → ${dest}`);

    let generatedCode: string;
    try {
      const prompt = buildPrompt(sourceFile, sourceCode, dest);
      // Sequential awaits are intentional here — see comment above the loop
      // eslint-disable-next-line no-await-in-loop
      const raw = await provider.complete(prompt, {
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });
      generatedCode = extractCode(raw);
    } catch (err) {
      warn(`AI generation failed for ${sourceFile}: ${(err as Error).message}`);
      continue;
    }

    // Write the test file
    fs.mkdirSync(path.dirname(absDest), { recursive: true });
    fs.writeFileSync(absDest, `${generatedCode}\n`, 'utf8');
    log(`Written: ${dest}`);
    generatedFiles.push(dest);
  }

  // Commit all generated files in one commit
  commitGeneratedTests(generatedFiles);
}

main().catch((err: unknown) => {
  process.stderr.write(`[generate-tests] Fatal error: ${(err as Error).message}\n`);
  // Exit 0 so a missing API key doesn't block the push
  process.exit(0);
});
