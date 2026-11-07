import Database from 'better-sqlite3';
import type { EmployeeSortField, SortOrder } from '@hr/shared';
import type { Db } from '../db/createDb';
import { SALARY_IN_USD, employeeColumns } from '../db/sql';
import { DuplicateEmailError } from '../errors';

export interface NewEmployee {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  currencyCode: string;
  salaryMinor: number;
  startDate: string;
}

export interface EmployeeRecord extends NewEmployee {
  id: number;
}

export interface SalaryHistoryRecord {
  salaryMinor: number;
  currencyCode: string;
  effectiveFrom: string;
}

export interface EmployeeFilter {
  search?: string | undefined;
  countryCode?: string | undefined;
  department?: string | undefined;
  jobTitle?: string | undefined;
}

export interface EmployeeListOptions extends EmployeeFilter {
  sortBy: EmployeeSortField;
  sortOrder: SortOrder;
  limit: number;
  offset: number;
}

const EMPLOYEE_COLUMNS = employeeColumns();

const SORT_EXPRESSIONS: Record<EmployeeSortField, string> = {
  name: 'full_name COLLATE NOCASE',
  salary: SALARY_IN_USD,
  startDate: 'start_date',
};

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function buildWhere(filter: EmployeeFilter): { sql: string; params: Record<string, string> } {
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filter.search) {
    conditions.push(`(full_name LIKE @search ESCAPE '\\' OR email LIKE @search ESCAPE '\\')`);
    params.search = `%${escapeLike(filter.search)}%`;
  }
  for (const [column, value] of [
    ['country_code', filter.countryCode],
    ['department', filter.department],
    ['job_title', filter.jobTitle],
  ] as const) {
    if (value) {
      conditions.push(`${column} = @${column}`);
      params[column] = value;
    }
  }

  return { sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Database.SqliteError && error.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

function rejectingDuplicateEmail<T>(email: string, write: () => T): T {
  try {
    return write();
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateEmailError(email);
    throw error;
  }
}

export function createEmployeeRepository(db: Db) {
  const insertEmployee = db.prepare<NewEmployee>(
    `INSERT INTO employees
       (full_name, email, job_title, department, country_code, currency_code, salary_minor, start_date)
     VALUES
       (@fullName, @email, @jobTitle, @department, @countryCode, @currencyCode, @salaryMinor, @startDate)`,
  );
  const updateEmployee = db.prepare<NewEmployee & { id: number }>(
    `UPDATE employees
        SET full_name = @fullName, email = @email, job_title = @jobTitle,
            department = @department, country_code = @countryCode,
            currency_code = @currencyCode, salary_minor = @salaryMinor,
            start_date = @startDate, updated_at = datetime('now')
      WHERE id = @id`,
  );
  const insertSalaryHistory = db.prepare<SalaryHistoryRecord & { employeeId: number }>(
    `INSERT INTO salary_history (employee_id, salary_minor, currency_code, effective_from)
     VALUES (@employeeId, @salaryMinor, @currencyCode, @effectiveFrom)`,
  );
  const selectById = db.prepare<[number], EmployeeRecord>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE id = ?`,
  );
  const selectSalaryHistory = db.prepare<[number], SalaryHistoryRecord>(
    `SELECT salary_minor AS salaryMinor, currency_code AS currencyCode,
            effective_from AS effectiveFrom
       FROM salary_history WHERE employee_id = ?
      ORDER BY effective_from DESC, id DESC`,
  );
  const deleteById = db.prepare<[number]>('DELETE FROM employees WHERE id = ?');
  const countAll = db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM employees');

  const insertTransaction = db.transaction((employee: NewEmployee): { id: number } => {
    const id = Number(insertEmployee.run(employee).lastInsertRowid);
    insertSalaryHistory.run({ ...employee, employeeId: id, effectiveFrom: employee.startDate });
    return { id };
  });

  const updateTransaction = db.transaction(
    (id: number, employee: NewEmployee, salaryChangedOn: string | undefined): boolean => {
      if (updateEmployee.run({ ...employee, id }).changes === 0) return false;
      if (salaryChangedOn) {
        insertSalaryHistory.run({ ...employee, employeeId: id, effectiveFrom: salaryChangedOn });
      }
      return true;
    },
  );

  return {
    /** Inserts the employee and their starting salary atomically. */
    insert(employee: NewEmployee): { id: number } {
      return rejectingDuplicateEmail(employee.email, () => insertTransaction(employee));
    },

    /**
     * Replaces the employee's fields. With `salaryChangedOn`, also appends a salary history
     * entry effective that day, in the same transaction. Returns false for an unknown id.
     */
    update(
      id: number,
      employee: NewEmployee,
      { salaryChangedOn }: { salaryChangedOn?: string } = {},
    ): boolean {
      return rejectingDuplicateEmail(employee.email, () =>
        updateTransaction(id, employee, salaryChangedOn),
      );
    },

    findById(id: number): EmployeeRecord | undefined {
      return selectById.get(id);
    },

    /** Newest first. */
    findSalaryHistory(employeeId: number): SalaryHistoryRecord[] {
      return selectSalaryHistory.all(employeeId);
    },

    list(options: EmployeeListOptions): { items: EmployeeRecord[]; total: number } {
      const where = buildWhere(options);
      const direction = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
      const items = db
        .prepare<Record<string, string | number>, EmployeeRecord>(
          `SELECT ${EMPLOYEE_COLUMNS} FROM employees ${where.sql}
            ORDER BY ${SORT_EXPRESSIONS[options.sortBy]} ${direction}, id ASC
            LIMIT @limit OFFSET @offset`,
        )
        .all({ ...where.params, limit: options.limit, offset: options.offset });
      const total = db
        .prepare<Record<string, string>, { count: number }>(
          `SELECT COUNT(*) AS count FROM employees ${where.sql}`,
        )
        .get(where.params);

      return { items, total: total?.count ?? 0 };
    },

    /** Returns false for an unknown id. Salary history is removed by ON DELETE CASCADE. */
    delete(id: number): boolean {
      return deleteById.run(id).changes > 0;
    },

    count(): number {
      return countAll.get()?.count ?? 0;
    },
  };
}

export type EmployeeRepository = ReturnType<typeof createEmployeeRepository>;
