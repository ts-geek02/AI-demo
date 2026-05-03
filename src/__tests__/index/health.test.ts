import request from 'supertest';
import { app } from '../../index';

describe('GET /health', () => {
  it('returns status 200 and body { status: "ok" }', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
