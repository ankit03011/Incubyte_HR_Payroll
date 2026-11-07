import type { Db } from '../db/createDb';
import { createEmployeeRepository, type NewEmployee } from '../repositories/employeeRepository';

/**
 * Inserts all employees in one transaction: all or nothing, and one fsync instead of
 * one per row. Each repository insert nests as a savepoint inside this transaction.
 */
export function seedDatabase(db: Db, employees: readonly NewEmployee[]): void {
  const repository = createEmployeeRepository(db);
  db.transaction(() => {
    for (const employee of employees) repository.insert(employee);
  })();
}
