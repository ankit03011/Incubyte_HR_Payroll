import express, { type Express } from 'express';
import type { HealthResponse } from '@hr/shared';
import type { Db } from './db/createDb';
import { errorHandler } from './http/errorHandler';
import { createEmployeeRepository } from './repositories/employeeRepository';
import { employeesRouter } from './routes/employeesRouter';
import { createEmployeeService } from './services/employeeService';

export interface AppDependencies {
  db: Db;
  /** Today's date as YYYY-MM-DD. Defaults to the current UTC date. */
  today?: () => string;
}

const utcToday = (): string => new Date().toISOString().slice(0, 10);

/** Builds the app without listening, so tests can inject an in-memory DB and a fixed clock. */
export function createApp({ db, today = utcToday }: AppDependencies): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.json(body);
  });

  const employeeService = createEmployeeService({
    repository: createEmployeeRepository(db),
    today,
  });
  app.use('/employees', employeesRouter(employeeService));

  app.use(errorHandler);
  return app;
}
