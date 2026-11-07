import type { Employee, EmployeeListResponse } from '@hr/shared';
import { vi } from 'vitest';

export interface RecordedRequest {
  method: string;
  url: URL;
  body: unknown;
}

type Reply = { status?: number; body?: unknown };
type Handler = (request: RecordedRequest) => Reply | Promise<Reply>;

/** Stubs fetch, the network boundary: every request is recorded and answered by `handler`. */
export function mockApi(handler: Handler) {
  const requests: RecordedRequest[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request: RecordedRequest = {
        method: (init?.method ?? 'GET').toUpperCase(),
        url: new URL(String(input), 'http://localhost'),
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      };
      requests.push(request);
      const { status = 200, body } = await handler(request);
      return new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );

  const matching = (method: string, path: string) =>
    requests.filter((r) => r.method === method && r.url.pathname === path);

  return {
    requests,
    matching,
    /** Query params of every employee list request, in order. */
    listQueries: () => matching('GET', '/api/employees').map((r) => r.url.searchParams),
    lastListQuery: () => matching('GET', '/api/employees').at(-1)?.url.searchParams,
  };
}

export function anEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    countryCode: 'US',
    currencyCode: 'USD',
    salary: 120_000,
    startDate: '2024-03-01',
    ...overrides,
  };
}

export function aPage(
  items: Employee[],
  overrides: Partial<EmployeeListResponse> = {},
): EmployeeListResponse {
  return { items, total: items.length, page: 1, pageSize: 25, ...overrides };
}
