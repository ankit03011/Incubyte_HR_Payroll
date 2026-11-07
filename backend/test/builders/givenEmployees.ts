import type { Db } from '../../src/db/createDb';
import {
  createEmployeeRepository,
  type NewEmployee,
} from '../../src/repositories/employeeRepository';
import { aNewEmployee } from './aNewEmployee';

/** Arranges fixtures directly through the repository, giving each a unique email. */
export function givenEmployees(db: Db, ...employees: Partial<NewEmployee>[]): void {
  const repository = createEmployeeRepository(db);
  employees.forEach((overrides, index) =>
    repository.insert(aNewEmployee({ email: `employee${index}@example.com`, ...overrides })),
  );
}

/** Salary fixtures in major units, so tests read in the same terms as HR. */
export const paidInUsd = (amount: number): Partial<NewEmployee> => ({
  countryCode: 'US',
  currencyCode: 'USD',
  salaryMinor: amount * 100,
});

export const paidInInr = (amount: number): Partial<NewEmployee> => ({
  countryCode: 'IN',
  currencyCode: 'INR',
  salaryMinor: amount * 100,
});
