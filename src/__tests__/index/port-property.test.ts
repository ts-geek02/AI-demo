// Feature: nodejs-express-setup, Property 2: Port resolution uses environment variable when set

import * as fc from 'fast-check';
import { faker } from '@faker-js/faker/locale/en';
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';

/**
 * Property 2: Port resolution uses environment variable when set
 * Validates: Requirements 2.3
 *
 * For any valid port number P assigned to the PORT environment variable before
 * server startup, the server SHALL bind to port P and not to the default port 3000.
 *
 * Faker generates the port numbers; fast-check drives the property assertion.
 */

function startServer(port: number): Promise<{ kill: () => void }> {
  return new Promise((resolve, reject) => {
    const tsxBin = path.resolve(
      process.cwd(),
      'node_modules',
      '.bin',
      `tsx${process.platform === 'win32' ? '.cmd' : ''}`,
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
      fc.asyncProperty(
        // fast-check picks the iteration count; Faker generates the port value
        fc.constant(null),
        async () => {
          // Faker generates a random high port (3001–9999) to avoid conflicts
          const port = faker.internet.port();
          // Clamp to safe range: avoid well-known ports and port 3000
          let safePort = port;
          if (safePort < 3001) {
            safePort = safePort + 3001;
          } else if (safePort > 9999) {
            safePort = 9999;
          }

          let server: { kill: () => void } | null = null;
          try {
            server = await startServer(safePort);
            const statusCode = await httpGet(safePort);
            expect(statusCode).toBe(200);
          } finally {
            if (server) {
              server.kill();
              await new Promise<void>((r) => {
                setTimeout(r, 100);
              });
            }
          }
        },
      ),
      { numRuns: 5 },
    );
  }, 60000);
});
