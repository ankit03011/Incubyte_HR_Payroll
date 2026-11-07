import { extname, join, sep } from 'node:path';
import express, { Router, type Express } from 'express';
import type { ApiError, HealthResponse } from '@hr/shared';
import type { Db } from './db/createDb.js';
import { errorHandler } from './http/errorHandler.js';
import { createEmployeeRepository } from './repositories/employeeRepository.js';
import { createInsightsRepository } from './repositories/insightsRepository.js';
import { employeesRouter } from './routes/employeesRouter.js';
import { insightsRouter } from './routes/insightsRouter.js';
import { createEmployeeService } from './services/employeeService.js';
import { createInsightsService } from './services/insightsService.js';

export interface AppDependencies {
  db: Db;
  /** Today's date as YYYY-MM-DD. Defaults to the current UTC date. */
  today?: () => string;
  /** The built frontend (vite build output). When set, the app also serves the UI. */
  staticDir?: string | undefined;
}

const utcToday = (): string => new Date().toISOString().slice(0, 10);

function apiRouter(db: Db, today: () => string): Router {
  const api = Router();

  api.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.json(body);
  });

  const employeeService = createEmployeeService({
    repository: createEmployeeRepository(db),
    today,
  });
  api.use('/employees', employeesRouter(employeeService));
  api.use('/insights', insightsRouter(createInsightsService(createInsightsRepository(db))));

  // Unknown API paths get a JSON 404, never the SPA's index.html.
  api.use((req, res) => {
    const body: ApiError = {
      error: { code: 'NOT_FOUND', message: `No API route for ${req.method} ${req.path}` },
    };
    res.status(404).json(body);
  });

  return api;
}

/**
 * Serves the built SPA: hashed assets with long-lived caching, and index.html for any other GET
 * without a file extension, so client-side routes like /insights survive a refresh.
 */
function frontend(staticDir: string): Router {
  const web = Router();
  web.use(
    express.static(staticDir, {
      setHeaders: (res, filePath) => {
        // Vite fingerprints everything it emits into assets/, so those files never change.
        const isHashedAsset = filePath.includes(`${sep}assets${sep}`);
        res.setHeader(
          'Cache-Control',
          isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    }),
  );
  web.use((req, res, next) => {
    const isPageRequest =
      (req.method === 'GET' || req.method === 'HEAD') && extname(req.path) === '';
    if (!isPageRequest) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(join(staticDir, 'index.html'));
  });
  return web;
}

/** Builds the app without listening, so tests can inject an in-memory DB and a fixed clock. */
export function createApp({ db, today = utcToday, staticDir }: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api', apiRouter(db, today));
  if (staticDir) app.use(frontend(staticDir));

  app.use(errorHandler);
  return app;
}
