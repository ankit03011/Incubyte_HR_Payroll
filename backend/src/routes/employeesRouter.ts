import { Router } from 'express';
import {
  employeeInputSchema,
  idParamsSchema,
  listQuerySchema,
  parseOrThrow,
} from '../http/validation';
import type { EmployeeService } from '../services/employeeService';

/** HTTP only: parse and validate, call the service, pick the status code. */
export function employeesRouter(service: EmployeeService): Router {
  const router = Router();
  const idOf = (params: unknown): number => parseOrThrow(idParamsSchema, params).id;

  router.get('/', (req, res) => {
    res.json(service.list(parseOrThrow(listQuerySchema, req.query)));
  });

  router.get('/:id', (req, res) => {
    res.json(service.get(idOf(req.params)));
  });

  router.post('/', (req, res) => {
    res.status(201).json(service.create(parseOrThrow(employeeInputSchema, req.body)));
  });

  router.put('/:id', (req, res) => {
    const id = idOf(req.params);
    res.json(service.update(id, parseOrThrow(employeeInputSchema, req.body)));
  });

  router.delete('/:id', (req, res) => {
    service.remove(idOf(req.params));
    res.status(204).end();
  });

  return router;
}
