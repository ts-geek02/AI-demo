# AI Demo

A production-ready Node.js Express scaffold with TypeScript, ESLint, Prettier, Jest, Tailwind CSS, and Husky git hooks.

## Getting Started

### Prerequisites

- [Node.js 22 LTS](https://nodejs.org/) or later

### Installation

```bash
npm install
```

### First Run

```bash
npm run dev
```

This starts the development server with file watching. The app listens on port `3000` by default (override with the `PORT` environment variable).

## Available Scripts

| Script        | Command                 | Description                                                                |
| ------------- | ----------------------- | -------------------------------------------------------------------------- |
| Build         | `npm run build`         | Compiles TypeScript source from `src/` to `dist/`                          |
| Start         | `npm start`             | Runs the compiled application from `dist/`                                 |
| Dev           | `npm run dev`           | Runs the application in watch/development mode using `tsx`                 |
| Lint          | `npm run lint`          | Runs ESLint on `src/` and reports violations                               |
| Lint Fix      | `npm run lint:fix`      | Runs ESLint with auto-fix on `src/`                                        |
| Format        | `npm run format`        | Runs Prettier to rewrite all `.ts`, `.js`, `.json`, and `.md` files        |
| Format Check  | `npm run format:check`  | Runs Prettier in check mode — exits non-zero if any file needs formatting  |
| Test          | `npm test`              | Runs the Jest test suite                                                   |
| Test Coverage | `npm run test:coverage` | Runs Jest and generates a coverage report in `coverage/`                   |
| CSS Build     | `npm run css:build`     | Compiles Tailwind CSS from `src/styles/main.css` to `dist/styles/main.css` |

## Project Structure

```
├── src/
│   ├── index.ts          # Express application entry point
│   ├── styles/
│   │   └── main.css      # Tailwind CSS entry file
│   └── __tests__/        # Test files
├── dist/                 # Compiled output (git-ignored)
├── coverage/             # Jest coverage report (git-ignored)
├── .husky/               # Git hooks (pre-commit, pre-push)
├── eslint.config.js      # ESLint flat config
├── .prettierrc           # Prettier formatting rules
├── .prettierignore       # Files excluded from Prettier
├── jest.config.ts        # Jest configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript compiler options
└── package.json
```

## Git Hooks

Husky manages two hooks:

- **pre-commit** — runs `lint-staged`, applying ESLint and Prettier to staged files only
- **pre-push** — runs the full Jest test suite before allowing a push
