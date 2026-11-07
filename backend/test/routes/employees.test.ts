import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateEmployeeRequest, EmployeeDetail, EmployeeListResponse } from '@hr/shared';
import { createApp } from '../../src/app';
import { createDb, type Db } from '../../src/db/createDb';
import {
  createEmployeeRepository,
  type NewEmployee,
} from '../../src/repositories/employeeRepository';
import { aNewEmployee } from '../builders/aNewEmployee';

const TODAY = '2026-11-07';

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = createDb(':memory:');
  app = createApp({ db, today: () => TODAY });
});

function aCreateRequest(overrides: Partial<CreateEmployeeRequest> = {}): CreateEmployeeRequest {
  return {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    countryCode: 'US',
    salary: 120_000,
    startDate: '2024-03-01',
    ...overrides,
  };
}

async function createEmployee(
  overrides: Partial<CreateEmployeeRequest> = {},
): Promise<EmployeeDetail> {
  const response = await request(app)
    .post('/employees')
    .send(aCreateRequest(overrides))
    .expect(201);
  return response.body as EmployeeDetail;
}

/** Arranges list fixtures directly through the repository; the list endpoint is what's under test. */
function givenEmployees(...employees: Partial<NewEmployee>[]): void {
  const repository = createEmployeeRepository(db);
  employees.forEach((overrides, index) =>
    repository.insert(aNewEmployee({ email: `employee${index}@example.com`, ...overrides })),
  );
}

async function list(query: string): Promise<EmployeeListResponse> {
  const response = await request(app).get(`/employees${query}`).expect(200);
  return response.body as EmployeeListResponse;
}

function salaryMinorInDb(id: number): number {
  const row = db.prepare('SELECT salary_minor FROM employees WHERE id = ?').get(id) as {
    salary_minor: number;
  };
  return row.salary_minor;
}

describe('POST /employees', () => {
  it('creates an employee, deriving the currency from the country', async () => {
    const employee = await createEmployee({ countryCode: 'IN', salary: 2_500_000 });

    expect(employee).toMatchObject({
      id: expect.any(Number),
      fullName: 'Ada Lovelace',
      countryCode: 'IN',
      currencyCode: 'INR',
      salary: 2_500_000,
      startDate: '2024-03-01',
      salaryHistory: [{ salary: 2_500_000, currencyCode: 'INR', effectiveFrom: '2024-03-01' }],
    });
  });

  it.each([
    ['US', 85_000.5, 8_500_050],
    ['JP', 4_500_000, 4_500_000],
  ])('stores a %s salary of %d as %d minor units', async (countryCode, salary, expectedMinor) => {
    const employee = await createEmployee({ countryCode, salary });

    expect(salaryMinorInDb(employee.id)).toBe(expectedMinor);
  });

  it('normalises the email to trimmed lower case', async () => {
    const employee = await createEmployee({ email: '  Ada@Example.COM ' });

    expect(employee.email).toBe('ada@example.com');
  });

  it('rejects invalid input with a message for every invalid field', async () => {
    const response = await request(app).post('/employees').send({
      fullName: ' ',
      email: 'not-an-email',
      jobTitle: '',
      department: '',
      countryCode: 'XX',
      salary: -1,
      startDate: '2024-13-01',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(response.body.error.fields).sort()).toEqual(
      ['countryCode', 'department', 'email', 'fullName', 'jobTitle', 'salary', 'startDate'].sort(),
    );
  });

  it('reports missing fields as required', async () => {
    const response = await request(app).post('/employees').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toMatchObject({
      fullName: ['Required'],
      jobTitle: ['Required'],
      department: ['Required'],
      email: ['Required'],
      startDate: ['Required'],
      countryCode: ['Required'],
      salary: ['Required'],
    });
  });

  it('rejects a malformed JSON body with 400 instead of a server error', async () => {
    const response = await request(app)
      .post('/employees')
      .set('Content-Type', 'application/json')
      .send('{"fullName": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a salary with more decimals than the currency allows', async () => {
    const response = await request(app)
      .post('/employees')
      .send(aCreateRequest({ countryCode: 'JP', salary: 100.5 }));

    expect(response.status).toBe(400);
    expect(response.body.error.fields.salary).toEqual([expect.stringMatching(/decimal/)]);
  });

  it('rejects a duplicate email, ignoring case', async () => {
    await createEmployee({ email: 'ada@example.com' });

    const response = await request(app)
      .post('/employees')
      .send(aCreateRequest({ email: 'ADA@example.com' }));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
  });
});

describe('GET /employees/:id', () => {
  it('returns the employee with salary history, newest first', async () => {
    const { id } = await createEmployee({ salary: 120_000 });
    await request(app)
      .put(`/employees/${id}`)
      .send(aCreateRequest({ salary: 130_000 }));

    const response = await request(app).get(`/employees/${id}`).expect(200);

    expect((response.body as EmployeeDetail).salaryHistory).toEqual([
      { salary: 130_000, currencyCode: 'USD', effectiveFrom: TODAY },
      { salary: 120_000, currencyCode: 'USD', effectiveFrom: '2024-03-01' },
    ]);
  });

  it('responds 404 for an unknown id', async () => {
    const response = await request(app).get('/employees/999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('responds 400 for an id that is not a positive integer', async () => {
    const response = await request(app).get('/employees/abc');

    expect(response.status).toBe(400);
    expect(response.body.error.fields.id).toBeDefined();
  });
});

describe('PUT /employees/:id', () => {
  it('updates the employee without new salary history when the salary is unchanged', async () => {
    const { id } = await createEmployee();

    const response = await request(app)
      .put(`/employees/${id}`)
      .send(aCreateRequest({ jobTitle: 'Senior Software Engineer' }))
      .expect(200);

    expect(response.body.jobTitle).toBe('Senior Software Engineer');
    expect(response.body.salaryHistory).toHaveLength(1);
  });

  it('records a salary change effective today and updates the current salary', async () => {
    const { id } = await createEmployee({ salary: 120_000 });

    const response = await request(app)
      .put(`/employees/${id}`)
      .send(aCreateRequest({ salary: 130_000 }))
      .expect(200);

    expect(response.body.salary).toBe(130_000);
    expect(response.body.salaryHistory[0]).toEqual({
      salary: 130_000,
      currencyCode: 'USD',
      effectiveFrom: TODAY,
    });
  });

  it('records a salary history entry when relocation changes the currency', async () => {
    const { id } = await createEmployee({ countryCode: 'US', salary: 100_000 });

    const response = await request(app)
      .put(`/employees/${id}`)
      .send(aCreateRequest({ countryCode: 'DE', salary: 100_000 }))
      .expect(200);

    expect(response.body.currencyCode).toBe('EUR');
    expect(response.body.salaryHistory[0]).toMatchObject({
      currencyCode: 'EUR',
      effectiveFrom: TODAY,
    });
  });

  it('responds 404 for an unknown id', async () => {
    const response = await request(app).put('/employees/999').send(aCreateRequest());

    expect(response.status).toBe(404);
  });

  it("responds 409 when taking another employee's email", async () => {
    await createEmployee({ email: 'grace@example.com' });
    const { id } = await createEmployee({ email: 'ada@example.com' });

    const response = await request(app)
      .put(`/employees/${id}`)
      .send(aCreateRequest({ email: 'grace@example.com' }));

    expect(response.status).toBe(409);
  });

  it('responds 400 for invalid input', async () => {
    const { id } = await createEmployee();

    const response = await request(app)
      .put(`/employees/${id}`)
      .send(aCreateRequest({ salary: 0 }));

    expect(response.status).toBe(400);
    expect(response.body.error.fields.salary).toBeDefined();
  });
});

describe('DELETE /employees/:id', () => {
  it('deletes the employee', async () => {
    const { id } = await createEmployee();

    await request(app).delete(`/employees/${id}`).expect(204);

    await request(app).get(`/employees/${id}`).expect(404);
  });

  it('responds 404 for an unknown id', async () => {
    await request(app).delete('/employees/999').expect(404);
  });
});

describe('GET /employees', () => {
  it('returns the first page with default page size, total count and major-unit salaries', async () => {
    givenEmployees({
      fullName: 'Ada',
      countryCode: 'US',
      currencyCode: 'USD',
      salaryMinor: 8_500_050,
    });

    const body = await list('');

    expect(body).toMatchObject({ page: 1, pageSize: 25, total: 1 });
    expect(body.items).toEqual([expect.objectContaining({ fullName: 'Ada', salary: 85_000.5 })]);
  });

  it('returns the requested page', async () => {
    givenEmployees(
      { fullName: 'Alice' },
      { fullName: 'Bob' },
      { fullName: 'Carol' },
      { fullName: 'Dave' },
      { fullName: 'Erin' },
    );

    const body = await list('?page=2&pageSize=2&sortBy=name');

    expect(body.items.map((e) => e.fullName)).toEqual(['Carol', 'Dave']);
    expect(body).toMatchObject({ page: 2, pageSize: 2, total: 5 });
  });

  it('rejects a page size above 100', async () => {
    const response = await request(app).get('/employees?pageSize=101');

    expect(response.status).toBe(400);
    expect(response.body.error.fields.pageSize).toBeDefined();
  });

  it('searches by name or email, ignoring case', async () => {
    givenEmployees(
      { fullName: 'Grace Hopper', email: 'grace@navy.example' },
      { fullName: 'Alan Turing', email: 'alan@bletchley.example' },
      { fullName: 'Ada Lovelace', email: 'ada@example.com' },
    );

    expect((await list('?search=HOPPER')).items.map((e) => e.fullName)).toEqual(['Grace Hopper']);
    expect((await list('?search=bletchley')).items.map((e) => e.fullName)).toEqual(['Alan Turing']);
  });

  it('treats SQL wildcards in the search term as literal text', async () => {
    givenEmployees({ email: 'a_b@example.com' }, { email: 'axb@example.com' });

    const body = await list('?search=a_b');

    expect(body.items.map((e) => e.email)).toEqual(['a_b@example.com']);
  });

  it('filters by country, department and job title together', async () => {
    givenEmployees(
      {
        fullName: 'Match',
        countryCode: 'IN',
        currencyCode: 'INR',
        department: 'Engineering',
        jobTitle: 'QA Engineer',
      },
      {
        fullName: 'Wrong country',
        countryCode: 'US',
        currencyCode: 'USD',
        department: 'Engineering',
        jobTitle: 'QA Engineer',
      },
      {
        fullName: 'Wrong department',
        countryCode: 'IN',
        currencyCode: 'INR',
        department: 'Sales',
        jobTitle: 'QA Engineer',
      },
      {
        fullName: 'Wrong title',
        countryCode: 'IN',
        currencyCode: 'INR',
        department: 'Engineering',
        jobTitle: 'Recruiter',
      },
    );

    const body = await list('?countryCode=IN&department=Engineering&jobTitle=QA%20Engineer');

    expect(body.items.map((e) => e.fullName)).toEqual(['Match']);
  });

  it('sorts by salary using the USD equivalent across currencies', async () => {
    givenEmployees(
      {
        fullName: 'India ~60k USD',
        countryCode: 'IN',
        currencyCode: 'INR',
        salaryMinor: 500_000_000,
      },
      { fullName: 'US 70k USD', countryCode: 'US', currencyCode: 'USD', salaryMinor: 7_000_000 },
      { fullName: 'UK ~63k USD', countryCode: 'GB', currencyCode: 'GBP', salaryMinor: 5_000_000 },
    );

    const body = await list('?sortBy=salary&sortOrder=desc');

    expect(body.items.map((e) => e.fullName)).toEqual([
      'US 70k USD',
      'UK ~63k USD',
      'India ~60k USD',
    ]);
  });

  it('sorts by start date, newest first', async () => {
    givenEmployees(
      { fullName: 'Joined 2020', startDate: '2020-01-15' },
      { fullName: 'Joined 2024', startDate: '2024-06-01' },
      { fullName: 'Joined 2022', startDate: '2022-09-30' },
    );

    const body = await list('?sortBy=startDate&sortOrder=desc');

    expect(body.items.map((e) => e.fullName)).toEqual([
      'Joined 2024',
      'Joined 2022',
      'Joined 2020',
    ]);
  });
});
