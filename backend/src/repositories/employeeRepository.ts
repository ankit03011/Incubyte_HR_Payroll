import type { Db } from '../db/createDb';

export interface NewEmployee {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  currencyCode: string;
  salaryMinor: number;
  effectiveFrom: string;
}

export function createEmployeeRepository(db: Db) {
  const insertEmployee = db.prepare<NewEmployee>(
    `INSERT INTO employees
       (full_name, email, job_title, department, country_code, currency_code, salary_minor)
     VALUES
       (@fullName, @email, @jobTitle, @department, @countryCode, @currencyCode, @salaryMinor)`,
  );
  const insertSalaryHistory = db.prepare<NewEmployee & { employeeId: number }>(
    `INSERT INTO salary_history (employee_id, salary_minor, currency_code, effective_from)
     VALUES (@employeeId, @salaryMinor, @currencyCode, @effectiveFrom)`,
  );

  return {
    insert(employee: NewEmployee): { id: number } {
      const id = Number(insertEmployee.run(employee).lastInsertRowid);
      insertSalaryHistory.run({ ...employee, employeeId: id });
      return { id };
    },
  };
}
