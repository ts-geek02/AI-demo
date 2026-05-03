import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok' });
});

export { app };

// Only start the server when this file is run directly, not when imported by tests.
// Uses a try/catch to support both CJS (require.main === module) and ESM environments
// where require is not defined (e.g. when tsx runs the file with "type": "module").
function isRunDirectly(): boolean {
  try {
    // CJS environment: require and module are available
    return require.main === require.cache[require.resolve('./index')] || require.main === module;
  } catch {
    // ESM environment: require is not defined; check argv instead
    return process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js') || false;
  }
}

if (isRunDirectly()) {
  const server = app.listen(PORT, (): void => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException): void => {
    process.stderr.write(`Failed to start server: ${err.message}\n`);
    process.exit(1);
  });
}
