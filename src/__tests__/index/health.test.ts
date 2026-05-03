import request from 'supertest';
import { faker } from '@faker-js/faker/locale/en';
import { app } from '../../index';

describe('GET /health', () => {
  it('returns status 200 and body { status: "ok" }', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('ignores arbitrary query parameters and still returns { status: "ok" }', async () => {
    // Use Faker to generate realistic-looking but arbitrary query params
    const query = {
      [faker.database.column()]: faker.lorem.word(),
      [faker.string.alphanumeric(8)]: faker.number.int({ min: 1, max: 999 }).toString(),
    };
    const response = await request(app).get('/health').query(query);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('ignores arbitrary request headers and still returns { status: "ok" }', async () => {
    const response = await request(app)
      .get('/health')
      .set('X-Request-Id', faker.string.uuid())
      .set('X-Correlation-Id', faker.string.uuid())
      .set('Accept-Language', faker.helpers.arrayElement(['en-US', 'fr-FR', 'de-DE', 'ja-JP']));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
