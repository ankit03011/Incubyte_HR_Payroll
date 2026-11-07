import type {
  ApiError,
  CountryInsightsResponse,
  EmployeeDetail,
  EmployeeInput,
  EmployeeListQuery,
  EmployeeListResponse,
  InsightsSummary,
  JobTitleInsightsResponse,
  OutliersResponse,
  SalaryDistribution,
} from '@hr/shared';

export interface InsightsFilters {
  countryCode?: string;
  department?: string;
}

/** A form submission as typed; the server validates it (salary may be missing). */
export type EmployeeDraft = Omit<EmployeeInput, 'salary'> & { salary?: number };

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly details: ApiError['error'] | undefined,
  ) {
    super(details?.message ?? `Request failed with status ${status}`);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as ApiError | undefined;
    throw new ApiRequestError(response.status, body?.error);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Drops empty values so "All" filters are simply absent from the URL. */
function toSearchParams(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export const api = {
  listEmployees: (query: EmployeeListQuery, signal?: AbortSignal) =>
    request<EmployeeListResponse>(`/employees?${toSearchParams(query)}`, {
      signal: signal ?? null,
    }),

  getEmployee: (id: number, signal?: AbortSignal) =>
    request<EmployeeDetail>(`/employees/${id}`, { signal: signal ?? null }),

  createEmployee: (draft: EmployeeDraft) =>
    request<EmployeeDetail>('/employees', { method: 'POST', body: JSON.stringify(draft) }),

  updateEmployee: (id: number, draft: EmployeeDraft) =>
    request<EmployeeDetail>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(draft) }),

  insightsSummary: (signal?: AbortSignal) =>
    request<InsightsSummary>('/insights/summary', { signal: signal ?? null }),

  insightsByCountry: (signal?: AbortSignal) =>
    request<CountryInsightsResponse>('/insights/by-country', { signal: signal ?? null }),

  insightsByJobTitle: (filters: Pick<InsightsFilters, 'countryCode'>, signal?: AbortSignal) =>
    request<JobTitleInsightsResponse>(`/insights/by-job-title?${toSearchParams(filters)}`, {
      signal: signal ?? null,
    }),

  insightsDistribution: (filters: InsightsFilters, signal?: AbortSignal) =>
    request<SalaryDistribution>(`/insights/distribution?${toSearchParams(filters)}`, {
      signal: signal ?? null,
    }),

  insightsOutliers: (paging: { page: number; pageSize: number }, signal?: AbortSignal) =>
    request<OutliersResponse>(`/insights/outliers?${toSearchParams(paging)}`, {
      signal: signal ?? null,
    }),

  deleteEmployee: (id: number) => request<undefined>(`/employees/${id}`, { method: 'DELETE' }),
};
