/** API contract shared by backend and frontend. Money is always in major units (e.g. 85000.5). */

export interface HealthResponse {
  status: 'ok';
}

/** Used for both create (POST) and full replacement (PUT). Currency is derived from the country. */
export interface EmployeeInput {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  salary: number;
  /** ISO date, YYYY-MM-DD. */
  startDate: string;
}

export type CreateEmployeeRequest = EmployeeInput;
export type UpdateEmployeeRequest = EmployeeInput;

export interface Employee {
  id: number;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  currencyCode: string;
  salary: number;
  startDate: string;
}

export interface SalaryHistoryEntry {
  salary: number;
  currencyCode: string;
  effectiveFrom: string;
}

export interface EmployeeDetail extends Employee {
  /** Newest first. */
  salaryHistory: SalaryHistoryEntry[];
}

/** `added` is insertion order (newest last ascending), used for "most recently added first". */
export const EMPLOYEE_SORT_FIELDS = ['name', 'salary', 'startDate', 'added'] as const;
export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[number];
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface EmployeeListQuery {
  page?: number;
  pageSize?: number;
  /** Case-insensitive substring match on name or email. */
  search?: string;
  countryCode?: string;
  department?: string;
  jobTitle?: string;
  /** `salary` sorts by USD equivalent so currencies compare fairly. */
  sortBy?: EmployeeSortField;
  sortOrder?: SortOrder;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type EmployeeListResponse = Page<Employee>;

export type ApiErrorCode = 'VALIDATION_FAILED' | 'NOT_FOUND' | 'DUPLICATE_EMAIL' | 'INTERNAL_ERROR';

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field name -> human-readable messages. Present for VALIDATION_FAILED. */
    fields?: Record<string, string[]>;
  };
}
