import type { Db } from '../db/createDb';
import { createEmployeeRepository } from '../repositories/employeeRepository';
import { generateEmployees } from './generateEmployees';
import { seedDatabase } from './seedDatabase';

/** Seeds a fresh database (e.g. on an ephemeral disk); never touches existing data. Returns true if it seeded. */
export function seedIfEmpty(db: Db, options: { seed: number; count: number }): boolean {
  if (createEmployeeRepository(db).count() > 0) return false;
  seedDatabase(db, generateEmployees(options));
  return true;
}
