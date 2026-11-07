import express, { type Express } from 'express';
import type { HealthResponse } from '@hr/shared';

export function createApp(): Express {
  const app = express();

  app.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.json(body);
  });

  return app;
}
