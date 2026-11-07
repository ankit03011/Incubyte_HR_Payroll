import {
  DEFAULT_PAGE_SIZE,
  EMPLOYEE_SORT_FIELDS,
  MAX_PAGE_SIZE,
  SORT_ORDERS,
  type EmployeeListQuery,
  type EmployeeSortField,
  type SortOrder,
} from '@hr/shared';

/** Everything that defines what the employee list shows; it lives in the URL query string. */
export interface ListView {
  search: string;
  countryCode: string;
  department: string;
  jobTitle: string;
  sortBy: EmployeeSortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

export const DEFAULT_VIEW: ListView = {
  search: '',
  countryCode: '',
  department: '',
  jobTitle: '',
  // Newest first, so a just-added employee is the first row.
  sortBy: 'added',
  sortOrder: 'desc',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const TEXT_KEYS = ['search', 'countryCode', 'department', 'jobTitle'] as const;

function positiveInt(
  value: string | null,
  fallback: number,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= max ? number : fallback;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((option) => option === value) ?? fallback;
}

/** Reads a view from the URL, ignoring anything hand-edited into an invalid value. */
export function readView(params: URLSearchParams): ListView {
  return {
    search: params.get('search') ?? '',
    countryCode: params.get('countryCode') ?? '',
    department: params.get('department') ?? '',
    jobTitle: params.get('jobTitle') ?? '',
    sortBy: oneOf(params.get('sortBy'), EMPLOYEE_SORT_FIELDS, DEFAULT_VIEW.sortBy),
    sortOrder: oneOf(params.get('sortOrder'), SORT_ORDERS, DEFAULT_VIEW.sortOrder),
    page: positiveInt(params.get('page'), DEFAULT_VIEW.page),
    pageSize: positiveInt(params.get('pageSize'), DEFAULT_VIEW.pageSize, MAX_PAGE_SIZE),
  };
}

/** Writes only what differs from the defaults, so a fresh list has a clean /employees URL. */
export function writeView(view: ListView): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of TEXT_KEYS) if (view[key]) params.set(key, view[key]);
  if (view.sortBy !== DEFAULT_VIEW.sortBy || view.sortOrder !== DEFAULT_VIEW.sortOrder) {
    params.set('sortBy', view.sortBy);
    params.set('sortOrder', view.sortOrder);
  }
  if (view.page !== DEFAULT_VIEW.page) params.set('page', String(view.page));
  if (view.pageSize !== DEFAULT_VIEW.pageSize) params.set('pageSize', String(view.pageSize));
  return params;
}

export function toListQuery({ search, ...view }: ListView): EmployeeListQuery {
  return { ...view, ...(search ? { search } : {}) };
}
