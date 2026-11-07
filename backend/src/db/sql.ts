import { CURRENCIES } from '@hr/shared';

/**
 * Annual salary in USD major units. Built from the static FX table (never from user input), so
 * interpolating it into SQL is safe. Used wherever salaries in different currencies are compared
 * or aggregated together.
 */
export const SALARY_IN_USD = `(salary_minor * CASE currency_code ${CURRENCIES.map(
  (c) => `WHEN '${c.code}' THEN ${1 / (c.unitsPerUsd * 10 ** c.minorUnits)}`,
).join(' ')} END)`;

/** Employee columns aliased to EmployeeRecord's property names. */
export function employeeColumns(table = 'employees'): string {
  return `
    ${table}.id, ${table}.full_name AS fullName, ${table}.email, ${table}.job_title AS jobTitle,
    ${table}.department, ${table}.country_code AS countryCode,
    ${table}.currency_code AS currencyCode, ${table}.salary_minor AS salaryMinor,
    ${table}.start_date AS startDate`;
}
