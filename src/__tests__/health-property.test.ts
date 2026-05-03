// Feature: nodejs-express-setup, Property 1: Health endpoint always returns the correct shape

import * as fc from 'fast-check';
import request from 'supertest';
import { app } from '../index';

/**
 * Property 1: Health endpoint always returns the correct shape
 * Validates: Requirements 2.2
 *
 * For any arbitrary query string parameters, the /health endpoint must always
 * respond with HTTP 200 and body { status: 'ok' }.
 */
describe('Property: Health endpoint shape invariant', () => {
  it('always returns { status: "ok" } with HTTP 200 regardless of query parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme-ascii' }),
          fc.string({ maxLength: 50, unit: 'grapheme-ascii' }),
        ),
        async (queryParams) => {
          const response = await request(app).get('/health').query(queryParams);

          expect(response.status).toBe(200);
          expect(response.body).toEqual({ status: 'ok' });
        },
      ),
      { numRuns: 100 },
    );
  });
});
