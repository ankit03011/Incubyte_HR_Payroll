import { describe, expect, it } from 'vitest';
import { createDb, type Db } from '../../src/db/createDb.js';
import { createEmployeeRepository } from '../../src/repositories/employeeRepository.js';
import { seedIfEmpty } from '../../src/seed/seedIfEmpty.js';
import { aNewEmployee } from '../builders/aNewEmployee.js';

function employeeCount(db: Db): number {
  return createEmployeeRepository(db).count();
}

describe('seedIfEmpty', () => {
  it('seeds the requested number of employees into an empty database', () => {
    const db = createDb(':memory:');

    seedIfEmpty(db, { seed: 42, count: 30 });

    expect(employeeCount(db)).toBe(30);
  });

  it('leaves a database that already has employees untouched', () => {
    const db = createDb(':memory:');
    createEmployeeRepository(db).insert(aNewEmployee());

    seedIfEmpty(db, { seed: 42, count: 30 });

    expect(employeeCount(db)).toBe(1);
  });
});
