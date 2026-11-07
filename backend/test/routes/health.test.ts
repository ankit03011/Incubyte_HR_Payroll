import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { createDb } from '../../src/db/createDb';

describe('GET /health', () => {
  it('reports that the service is up', async () => {
    const response = await request(createApp({ db: createDb(':memory:') })).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
