# AI Demo

A production-ready Node.js + Express scaffold with TypeScript, ESLint, Prettier, Jest, Tailwind CSS, and Husky git hooks. Includes an AI-powered test generation pipeline that automatically writes unit tests for changed source files on every push.

## Prerequisites

- [Node.js 18 LTS](https://nodejs.org/) or later (Node 20+ recommended)
- An API key for at least one supported AI provider (see [AI Test Generation](#ai-test-generation))

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server (watches for file changes)
npm run dev
```

The server listens on port `3000` by default. Override with the `PORT` environment variable:

```bash
PORT=8080 npm run dev
```

## Available Scripts

| Script             | Command                      | Description                                                                |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------- |
| Build              | `npm run build`              | Compiles TypeScript from `src/` to `dist/`                                 |
| Start              | `npm start`                  | Runs the compiled app from `dist/index.js`                                 |
| Dev                | `npm run dev`                | Runs the app in watch mode via `tsx`                                       |
| Test               | `npm test`                   | Runs the full Jest test suite                                              |
| Test Coverage      | `npm run test:coverage`      | Runs Jest and writes a coverage report to `coverage/`                      |
| Lint               | `npm run lint`               | Runs ESLint on `src/` and `scripts/`                                       |
| Lint Fix           | `npm run lint:fix`           | Runs ESLint with auto-fix on `src/` and `scripts/`                         |
| Format             | `npm run format`             | Rewrites all `.ts`, `.js`, `.json`, and `.md` files with Prettier          |
| Format Check       | `npm run format:check`       | Checks formatting without writing — exits non-zero if any file differs     |
| CSS Build          | `npm run css:build`          | Compiles Tailwind CSS from `src/styles/main.css` to `dist/styles/main.css` |
| Generate Tests     | `npm run generate-tests`     | Runs the AI test generation script manually                                |
| Validate Structure | `npm run validate-structure` | Checks that every source module has a corresponding test directory         |

## Project Structure

```
├── src/
│   ├── index.ts              # Express application entry point
│   ├── styles/
│   │   └── main.css          # Tailwind CSS entry file
│   └── __tests__/            # Jest test files (mirrors src/ structure)
│       ├── index/
│       └── tooling/
├── scripts/
│   ├── generate-tests.ts     # AI-powered unit test generator (runs on pre-push)
│   ├── validate-structure.ts # Enforces test coverage structure (runs on pre-push)
│   ├── providers/            # AI provider adapters (Grok, OpenAI, Anthropic)
│   └── deploy/               # Deployment scripts (AWS, GCP, DigitalOcean, Vercel, Docker)
├── dist/                     # Compiled JS output (git-ignored)
├── coverage/                 # Jest coverage report (git-ignored)
├── .husky/                   # Git hooks
│   ├── pre-commit            # Runs lint-staged on staged files
│   └── pre-push              # Generates tests, type-checks, validates structure, runs tests
├── ai.config.json            # AI provider and model configuration
├── eslint.config.js          # ESLint flat config (type-aware, strict rules)
├── .prettierrc               # Prettier formatting rules
├── .prettierignore           # Files excluded from Prettier
├── jest.config.ts            # Jest configuration (ts-jest)
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # Main TypeScript config (strict, targets src/)
├── tsconfig.test.json        # TypeScript config for test files (relaxed for ts-jest)
├── tsconfig.scripts.json     # TypeScript config for scripts/ (no emit, DOM + Node types)
└── package.json
```

## API Endpoints

| Method | Path      | Description                                |
| ------ | --------- | ------------------------------------------ |
| GET    | `/health` | Returns `{ "status": "ok" }` with HTTP 200 |

## Git Hooks

Husky manages two hooks:

**pre-commit** — runs `lint-staged` on staged files only:

- `.ts` / `.js` files → ESLint auto-fix, then Prettier
- `.json` / `.md` files → Prettier

**pre-push** — runs four steps in sequence, blocking the push if any step fails:

1. `generate-tests` — calls the configured AI provider to write unit tests for any changed source files that don't already have them, then commits the generated files
2. `tsc --noEmit` — full type-check across the entire project
3. `validate-structure` — ensures every source module has a corresponding test directory
4. `npm test` — runs the full Jest suite

Skip the AI step for a single push (e.g. in CI):

```bash
SKIP_AI_TESTS=1 git push
```

Skip the structure check:

```bash
SKIP_STRUCTURE_CHECK=1 git push
```

## AI Test Generation

The `scripts/generate-tests.ts` script analyses TypeScript source files changed in the current push, calls an AI provider to generate Jest unit tests, and writes them to `src/__tests__/<module>/<file>.test.ts`.

### Configuration — `ai.config.json`

| Field              | Default           | Description                                          |
| ------------------ | ----------------- | ---------------------------------------------------- |
| `provider`         | `"grok"`          | AI provider to use: `grok`, `openai`, or `anthropic` |
| `model`            | `"grok-3-mini"`   | Model name passed to the provider                    |
| `testDir`          | `"src/__tests__"` | Output directory for generated tests                 |
| `sourceDir`        | `"src"`           | Root directory scanned for source files              |
| `sourceExtensions` | `[".ts"]`         | File extensions to process                           |
| `excludePatterns`  | see file          | Glob patterns excluded from generation               |
| `maxTokens`        | `4096`            | Maximum tokens per AI response                       |
| `temperature`      | `0.2`             | Sampling temperature (lower = more deterministic)    |

### Required Environment Variables

Set the API key for whichever provider is configured in `ai.config.json`:

| Provider   | Environment Variable | Where to get a key                                                  |
| ---------- | -------------------- | ------------------------------------------------------------------- |
| Grok (xAI) | `XAI_API_KEY`        | [console.x.ai](https://console.x.ai/)                               |
| OpenAI     | `OPENAI_API_KEY`     | [platform.openai.com](https://platform.openai.com/account/api-keys) |
| Anthropic  | `ANTHROPIC_API_KEY`  | [console.anthropic.com](https://console.anthropic.com/)             |

Add the key to a `.env` file (git-ignored) or export it in your shell before pushing:

```bash
export XAI_API_KEY=your-key-here
git push
```

If no API key is set, the script logs a warning and exits cleanly — it will not block the push.

## TypeScript Configuration

Three tsconfig files cover different parts of the project:

| File                    | Covers                   | Notes                                                                                  |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `tsconfig.json`         | `src/` (excluding tests) | Strict mode, all correctness flags enabled, emits to `dist/`                           |
| `tsconfig.test.json`    | `src/__tests__/`         | Extends main config, relaxes a few rules impractical in tests, compatible with ts-jest |
| `tsconfig.scripts.json` | `scripts/`               | No emit, adds DOM types for the native `fetch` API                                     |

Notable strict flags enabled in `tsconfig.json`:

- `noUncheckedIndexedAccess` — array and object index access returns `T | undefined`
- `exactOptionalPropertyTypes` — optional properties cannot be explicitly set to `undefined`
- `noImplicitOverride` — subclass overrides must use the `override` keyword
- `noPropertyAccessFromIndexSignature` — index-signature properties require bracket notation

## Linting Rules

ESLint is configured with type-aware rules (`recommendedTypeChecked`) and ~35 additional rules. Key highlights:

- `@typescript-eslint/no-floating-promises` — every Promise must be awaited or handled
- `@typescript-eslint/prefer-nullish-coalescing` — `||` → `??` for null/undefined checks
- `@typescript-eslint/consistent-type-imports` — enforces `import type` for type-only imports
- `@typescript-eslint/explicit-member-accessibility` — all class members need an access modifier
- `no-param-reassign` — function parameters must not be reassigned
- `curly: all` — braces required on all control flow statements

`no-console` is an **error** in `src/` and **off** in `scripts/` (where stdout output is intentional).

## Deployment

Deployment script templates live in `scripts/deploy/`, organised by platform:

| Directory                      | Platform                             |
| ------------------------------ | ------------------------------------ |
| `scripts/deploy/aws/`          | EC2, Elastic Beanstalk, ECS Fargate  |
| `scripts/deploy/gcp/`          | Cloud Run (shell + Cloud Build YAML) |
| `scripts/deploy/digitalocean/` | App Platform, Droplets               |
| `scripts/deploy/vercel/`       | Vercel (CLI + `vercel.json`)         |
| `scripts/deploy/docker/`       | Docker Compose (local or remote)     |

Each script has `# FIXME` markers for required values and a header listing the exact permissions needed on the target platform. See `scripts/deploy/README.md` for full details.

## Environment Variables

| Variable               | Required      | Description                                                  |
| ---------------------- | ------------- | ------------------------------------------------------------ |
| `PORT`                 | No            | Port the server listens on (default: `3000`)                 |
| `NODE_ENV`             | No            | Runtime environment (`production`, `staging`, `development`) |
| `XAI_API_KEY`          | For Grok      | xAI API key for AI test generation                           |
| `OPENAI_API_KEY`       | For OpenAI    | OpenAI API key for AI test generation                        |
| `ANTHROPIC_API_KEY`    | For Anthropic | Anthropic API key for AI test generation                     |
| `SKIP_AI_TESTS`        | No            | Set to `1` to skip AI test generation on push                |
| `SKIP_STRUCTURE_CHECK` | No            | Set to `1` to skip the structure validation on push          |

Copy `.env.example` to `.env` and fill in the values you need:

```bash
cp .env.example .env
```
