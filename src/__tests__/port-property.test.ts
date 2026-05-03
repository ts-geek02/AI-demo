// Feature: nodejs-express-setup, Property 2: Port resolution uses environment variable when set

import * as fc from 'fast-check';
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';

/**
 * Property 2: Port resolution uses environment variable when set
 * Validates: Requirements 2.3
 *
 * For any valid port number P assigned to the PORT environment variable before
 * server startup, the server SHALL bind to port P and not to the default port 3000.
 */

function startServer(port: number): Promise<{ kill: () => void }> {
  return new Promise((resolve, reject) => {
    const tsxBin = path.resolve(
      process.cwd(),
      'node_modules',
      '.bin',
      'tsx' + (process.platform === 'win32' ? '.cmd' : ''),
    );
    const proc = spawn(tsxBin, ['src/index.ts'], {
      env: { ...process.env, PORT: String(port) },
      shell: process.platform === 'win32',
    });

    let resolved = false;

    proc.stdout?.on('data', (data: Buffer) => {
      if (!resolved && data.toString().includes('Server running on port')) {
        resolved = true;
        resolve({ kill: () => proc.kill() });
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(data.toString()));
      }
    });

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        reject(new Error(`Server start timeout on port ${port}`));
      }
    }, 5000);
  });
}

function httpGet(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error(`HTTP request to port ${port} timed out`));
    });
  });
}

describe('Property: Port resolution uses environment variable when set', () => {
  it('binds to the port specified in the PORT environment variable', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3001, max: 9999 }), async (port) => {
        let server: { kill: () => void } | null = null;
        try {
          server = await startServer(port);
          const statusCode = await httpGet(port);
          expect(statusCode).toBe(200);
        } finally {
          if (server) {
            server.kill();
            // Give the OS a moment to release the port
            await new Promise((r) => setTimeout(r, 100));
          }
        }
      }),
      { numRuns: 5 },
    );
  }, 60000);
});
