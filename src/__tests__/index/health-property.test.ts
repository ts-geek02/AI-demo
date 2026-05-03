// Feature: nodejs-express-setup, Property 1: Health endpoint always returns the correct shape

import * as fc from 'fast-check';
import { faker } from '@faker-js/faker/locale/en';
import request from 'supertest';
import { app } from '../../index';

/**
 * Property 1: Health endpoint always returns the correct shape
 * Validates: Requirements 2.2
 *
 * For any arbitrary query string parameters or headers, the /health endpoint
 * must always respond with HTTP 200 and body { status: 'ok' }.
 *
 * Faker generates realistic-looking data (UUIDs, words, numbers) to exercise
 * the endpoint with varied but meaningful inputs.
 * fast-check drives the property assertion across 100 iterations.
 */
describe('Property: Health endpoint shape invariant', () => {
  it('always returns { status: "ok" } with HTTP 200 regardless of query parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        // fast-check generates the structure; Faker fills in realistic values
        fc.array(fc.constant(null), { minLength: 0, maxLength: 5 }),
        async () => {
          // Build a random set of query params using Faker
          const paramCount = faker.number.int({ min: 0, max: 4 });
          const queryParams: Record<string, string> = {};
          for (let i = 0; i < paramCount; i++) {
            queryParams[faker.string.alphanumeric({ length: { min: 1, max: 12 } })] =
              faker.lorem.word();
          }

          const response = await request(app).get('/health').query(queryParams);

          expect(response.status).toBe(200);
          expect(response.body).toEqual({ status: 'ok' });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('always returns { status: "ok" } with HTTP 200 regardless of request headers', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.constant(null), { minLength: 0, maxLength: 3 }), async () => {
        const req = request(app).get('/health');

        // Add random custom headers using Faker
        const headerCount = faker.number.int({ min: 0, max: 3 });
        for (let i = 0; i < headerCount; i++) {
          req.set(`X-${faker.string.alphanumeric(6)}`, faker.string.alphanumeric(16));
        }

        const response = await req;
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
      }),
      { numRuns: 100 },
    );
  });
});
