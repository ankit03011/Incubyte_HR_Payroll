import type { NewEmployee } from '../../src/repositories/employeeRepository.js';

export function aNewEmployee(overrides: Partial<NewEmployee> = {}): NewEmployee {
  return {
    fullName: 'Ada Lovelace',
    email: 'ada.lovelace@example.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    countryCode: 'DE',
    currencyCode: 'EUR',
    salaryMinor: 6_500_000,
    startDate: '2026-11-01',
    ...overrides,
  };
}
