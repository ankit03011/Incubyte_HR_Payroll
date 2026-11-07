import { Router } from 'express';
import { insightsFilterSchema, outliersQuerySchema, parseOrThrow } from '../http/validation';
import type { InsightsService } from '../services/insightsService';

export function insightsRouter(service: InsightsService): Router {
  const router = Router();

  router.get('/summary', (_req, res) => {
    res.json(service.summary());
  });

  router.get('/by-country', (_req, res) => {
    res.json(service.byCountry());
  });

  router.get('/by-job-title', (req, res) => {
    res.json(service.byJobTitle(parseOrThrow(insightsFilterSchema, req.query)));
  });

  router.get('/distribution', (req, res) => {
    res.json(service.distribution(parseOrThrow(insightsFilterSchema, req.query)));
  });

  router.get('/outliers', (req, res) => {
    res.json(service.outliers(parseOrThrow(outliersQuerySchema, req.query)));
  });

  return router;
}
