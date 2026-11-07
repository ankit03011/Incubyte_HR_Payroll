import { describe, expect, it } from 'vitest';
import { createDb, type Db } from '../../src/db/createDb';
import { DuplicateEmailError } from '../../src/errors';
import { generateEmployees } from '../../src/seed/generateEmployees';
import { seedDatabase } from '../../src/seed/seedDatabase';
import { aNewEmployee } from '../builders/aNewEmployee';

function countRows(db: Db, table: 'employees' | 'salary_history'): number {
  return (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

describe('seedDatabase', () => {
  it('stores every employee together with their starting salary history', () => {
    const db = createDb(':memory:');

    seedDatabase(db, generateEmployees({ seed: 42, count: 50 }));

    expect(countRows(db, 'employees')).toBe(50);
    expect(countRows(db, 'salary_history')).toBe(50);
  });

  it('stores nothing when any employee in the batch is rejected', () => {
    const db = createDb(':memory:');
    const batch = [
      aNewEmployee({ email: 'ada@example.com' }),
      aNewEmployee({ email: 'ADA@example.com' }),
    ];

    expect(() => seedDatabase(db, batch)).toThrow(DuplicateEmailError);
    expect(countRows(db, 'employees')).toBe(0);
    expect(countRows(db, 'salary_history')).toBe(0);
  });

  it('seeds 10,000 employees in under two seconds', () => {
    const db = createDb(':memory:');
    const employees = generateEmployees({ seed: 42, count: 10_000 });

    const startedAt = performance.now();
    seedDatabase(db, employees);

    expect(performance.now() - startedAt).toBeLessThan(2_000);
    expect(countRows(db, 'employees')).toBe(10_000);
  });
});
