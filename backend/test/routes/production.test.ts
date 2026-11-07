import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/createDb.js';

/** A stand-in for `vite build` output: index.html plus one hashed asset. */
let staticDir: string;

beforeAll(() => {
  staticDir = mkdtempSync(join(tmpdir(), 'hr-static-'));
  writeFileSync(join(staticDir, 'index.html'), '<!doctype html><div id="root">SPA shell</div>');
  mkdirSync(join(staticDir, 'assets'));
  writeFileSync(join(staticDir, 'assets', 'app-abc123.js'), 'console.log("app");');
});

afterAll(() => rmSync(staticDir, { recursive: true, force: true }));

const productionApp = () => createApp({ db: createDb(':memory:'), staticDir });

describe('serving the built frontend', () => {
  it('serves static assets', async () => {
    const response = await request(productionApp()).get('/assets/app-abc123.js');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.text).toContain('console.log("app")');
  });

  it('serves index.html at the root', async () => {
    const response = await request(productionApp()).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('SPA shell');
  });

  it('serves index.html for client-side routes, so a refresh on /insights works', async () => {
    for (const path of ['/insights', '/employees/42', '/employees?countryCode=IN']) {
      const response = await request(productionApp()).get(path);

      expect(response.status, path).toBe(200);
      expect(response.headers['content-type'], path).toMatch(/html/);
      expect(response.text, path).toContain('SPA shell');
    }
  });

  it('routes /api to the API rather than the frontend', async () => {
    const response = await request(productionApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('answers unknown /api paths with a JSON 404, not index.html', async () => {
    const response = await request(productionApp()).get('/api/payslips');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('does not serve index.html for missing assets', async () => {
    const response = await request(productionApp()).get('/assets/missing.js');

    expect(response.status).toBe(404);
  });
});

describe('without a built frontend (development and tests)', () => {
  it('serves only the API', async () => {
    const app = createApp({ db: createDb(':memory:') });

    expect((await request(app).get('/insights')).status).toBe(404);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });

  it('still answers unknown /api paths with a JSON 404', async () => {
    const response = await request(createApp({ db: createDb(':memory:') })).get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
