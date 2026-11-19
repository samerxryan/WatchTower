import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { attachErrorHandlers, createApp } from '../src/app.js';

function buildTestApp() {
  const app = createApp();
  attachErrorHandlers(app);
  return app;
}

describe('WatchTower Foundation API (Phase 0 & Phase 1)', () => {
  it('GET /api/v1/health returns structured status payload without leaking secrets', async () => {
    const app = buildTestApp();
    const res = await request(app).get('/api/v1/health');

    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('data.service', 'WatchTower API');
    expect(res.body).toHaveProperty('data.database');
    expect(typeof res.body.data.database.connected).toBe('boolean');
  });

  it('returns uniform 404 JSON error on unknown API endpoint', async () => {
    const app = buildTestApp();
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('Endpoint introuvable'),
        details: [],
      },
    });
  });

  it('returns uniform 400 JSON error on malformed JSON body', async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: expect.any(String),
        details: [],
      },
    });
  });

  it('sets Helmet security headers on API responses', async () => {
    const app = buildTestApp();
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
