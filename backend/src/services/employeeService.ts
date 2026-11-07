import {
  currencyFor,
  toMajorUnits,
  toMinorUnits,
  type Employee,
  type EmployeeDetail,
  type EmployeeInput,
  type EmployeeListResponse,
  type EmployeeSortField,
  type SortOrder,
} from '@hr/shared';
import { NotFoundError } from '../errors';
import type {
  EmployeeFilter,
  EmployeeRecord,
  EmployeeRepository,
  NewEmployee,
} from '../repositories/employeeRepository';

export interface EmployeeListParams extends EmployeeFilter {
  page: number;
  pageSize: number;
  sortBy: EmployeeSortField;
  sortOrder: SortOrder;
}

interface Dependencies {
  repository: EmployeeRepository;
  /** Today's date as YYYY-MM-DD; injected so salary-change dates are testable. */
  today: () => string;
}

/** API input (major units, no currency) -> stored record (minor units in the country's currency). */
function toNewEmployee(input: EmployeeInput): NewEmployee {
  const currencyCode = currencyFor(input.countryCode);
  return {
    fullName: input.fullName,
    email: input.email,
    jobTitle: input.jobTitle,
    department: input.department,
    countryCode: input.countryCode,
    currencyCode,
    salaryMinor: toMinorUnits(input.salary, currencyCode),
    startDate: input.startDate,
  };
}

export function toEmployee({ salaryMinor, ...record }: EmployeeRecord): Employee {
  return { ...record, salary: toMajorUnits(salaryMinor, record.currencyCode) };
}

function isSalaryChange(current: NewEmployee, next: NewEmployee): boolean {
  return current.salaryMinor !== next.salaryMinor || current.currencyCode !== next.currencyCode;
}

export function createEmployeeService({ repository, today }: Dependencies) {
  function get(id: number): EmployeeDetail {
    const record = repository.findById(id);
    if (!record) throw new NotFoundError('Employee', id);

    const salaryHistory = repository.findSalaryHistory(id).map((entry) => ({
      salary: toMajorUnits(entry.salaryMinor, entry.currencyCode),
      currencyCode: entry.currencyCode,
      effectiveFrom: entry.effectiveFrom,
    }));
    return { ...toEmployee(record), salaryHistory };
  }

  function create(input: EmployeeInput): EmployeeDetail {
    const { id } = repository.insert(toNewEmployee(input));
    return get(id);
  }

  /** Full replacement. A changed salary or currency is recorded in history, effective today. */
  function update(id: number, input: EmployeeInput): EmployeeDetail {
    const current = repository.findById(id);
    if (!current) throw new NotFoundError('Employee', id);

    const next = toNewEmployee(input);
    repository.update(id, next, isSalaryChange(current, next) ? { salaryChangedOn: today() } : {});
    return get(id);
  }

  function remove(id: number): void {
    if (!repository.delete(id)) throw new NotFoundError('Employee', id);
  }

  function list({ page, pageSize, ...rest }: EmployeeListParams): EmployeeListResponse {
    const { items, total } = repository.list({
      ...rest,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return { items: items.map(toEmployee), total, page, pageSize };
  }

  return { get, create, update, remove, list };
}

export type EmployeeService = ReturnType<typeof createEmployeeService>;
