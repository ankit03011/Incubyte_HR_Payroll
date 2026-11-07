import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CountryInsightsResponse,
  InsightsSummary,
  JobTitleInsightsResponse,
  OutliersResponse,
  SalaryDistribution,
} from '@hr/shared';
import { createApp } from '../../src/app';
import { createDb, type Db } from '../../src/db/createDb';
import { generateEmployees } from '../../src/seed/generateEmployees';
import { seedDatabase } from '../../src/seed/seedDatabase';
import { givenEmployees, paidInInr, paidInUsd } from '../builders/givenEmployees';

// Static FX: 83 INR = 1 USD, so 8,300,000 INR is exactly 100,000 USD.
const INR_100K_USD = 8_300_000;

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = createDb(':memory:');
  app = createApp({ db });
});

async function get<T>(path: string): Promise<T> {
  const response = await request(app).get(path).expect(200);
  return response.body as T;
}

describe('GET /insights/summary', () => {
  it('reports zero headcount and payroll, and no average, for an empty organisation', async () => {
    expect(await get<InsightsSummary>('/insights/summary')).toEqual({
      headcount: 0,
      totalPayrollUsd: 0,
      meanSalaryUsd: null,
      medianSalaryUsd: null,
    });
  });

  it.each([
    ['an odd number of salaries', [10_000, 30_000, 20_000], 20_000],
    ['an even number of salaries', [10_000, 40_000, 20_000, 30_000], 25_000],
    ['a single salary', [50_000], 50_000],
  ])('finds the median of %s', async (_case, salaries, median) => {
    givenEmployees(db, ...salaries.map(paidInUsd));

    expect((await get<InsightsSummary>('/insights/summary')).medianSalaryUsd).toBe(median);
  });

  it('converts every salary to USD before totalling and averaging', async () => {
    givenEmployees(db, paidInUsd(100_000), paidInInr(INR_100K_USD), paidInUsd(40_000));

    expect(await get<InsightsSummary>('/insights/summary')).toEqual({
      headcount: 3,
      totalPayrollUsd: 240_000,
      meanSalaryUsd: 80_000,
      medianSalaryUsd: 100_000,
    });
  });
});

describe('GET /insights/by-country', () => {
  it('reports headcount and min/median/mean/max in local currency, largest country first', async () => {
    givenEmployees(
      db,
      ...[50_000, 70_000, 90_000, 110_000].map(paidInUsd),
      ...[1_000_000, 2_000_000, 3_000_000].map(paidInInr),
    );

    const { items } = await get<CountryInsightsResponse>('/insights/by-country');

    expect(items).toMatchObject([
      {
        countryCode: 'US',
        currencyCode: 'USD',
        headcount: 4,
        minSalary: 50_000,
        medianSalary: 80_000,
        meanSalary: 80_000,
        maxSalary: 110_000,
      },
      {
        countryCode: 'IN',
        currencyCode: 'INR',
        headcount: 3,
        minSalary: 1_000_000,
        medianSalary: 2_000_000,
        meanSalary: 2_000_000,
        maxSalary: 3_000_000,
      },
    ]);
  });

  it("totals each country's payroll in USD", async () => {
    givenEmployees(db, paidInInr(INR_100K_USD), paidInInr(INR_100K_USD), paidInUsd(50_000));

    const { items } = await get<CountryInsightsResponse>('/insights/by-country');

    expect(
      items.map(({ countryCode, totalPayrollUsd }) => ({ countryCode, totalPayrollUsd })),
    ).toEqual([
      { countryCode: 'IN', totalPayrollUsd: 200_000 },
      { countryCode: 'US', totalPayrollUsd: 50_000 },
    ]);
  });
});

describe('GET /insights/by-job-title', () => {
  it('reports statistics in USD when job titles span countries', async () => {
    givenEmployees(
      db,
      { jobTitle: 'Software Engineer', ...paidInUsd(100_000) },
      { jobTitle: 'Software Engineer', ...paidInInr(INR_100K_USD) },
      { jobTitle: 'Recruiter', ...paidInUsd(60_000) },
    );

    const { items } = await get<JobTitleInsightsResponse>('/insights/by-job-title');

    expect(items).toEqual([
      {
        jobTitle: 'Software Engineer',
        currencyCode: 'USD',
        headcount: 2,
        minSalary: 100_000,
        medianSalary: 100_000,
        meanSalary: 100_000,
        maxSalary: 100_000,
        totalPayrollUsd: 200_000,
      },
      {
        jobTitle: 'Recruiter',
        currencyCode: 'USD',
        headcount: 1,
        minSalary: 60_000,
        medianSalary: 60_000,
        meanSalary: 60_000,
        maxSalary: 60_000,
        totalPayrollUsd: 60_000,
      },
    ]);
  });

  it('reports statistics in local currency when filtered by country', async () => {
    givenEmployees(
      db,
      { jobTitle: 'Software Engineer', ...paidInInr(2_000_000) },
      { jobTitle: 'Software Engineer', ...paidInInr(3_000_000) },
      { jobTitle: 'Software Engineer', ...paidInUsd(100_000) },
    );

    const { items } = await get<JobTitleInsightsResponse>('/insights/by-job-title?countryCode=IN');

    expect(items).toMatchObject([
      {
        jobTitle: 'Software Engineer',
        currencyCode: 'INR',
        headcount: 2,
        minSalary: 2_000_000,
        medianSalary: 2_500_000,
        maxSalary: 3_000_000,
      },
    ]);
  });
});

describe('GET /insights/distribution', () => {
  it('counts employees per 20,000 USD bucket, including empty buckets in between', async () => {
    givenEmployees(db, paidInUsd(10_000), paidInUsd(15_000), paidInUsd(65_000));

    expect(await get<SalaryDistribution>('/insights/distribution')).toEqual({
      currencyCode: 'USD',
      bucketSize: 20_000,
      buckets: [
        { minSalary: 0, maxSalary: 20_000, headcount: 2 },
        { minSalary: 20_000, maxSalary: 40_000, headcount: 0 },
        { minSalary: 40_000, maxSalary: 60_000, headcount: 0 },
        { minSalary: 60_000, maxSalary: 80_000, headcount: 1 },
      ],
    });
  });

  it('converts salaries to USD before bucketing', async () => {
    givenEmployees(db, paidInInr(2_490_000)); // 30,000 USD

    const { buckets } = await get<SalaryDistribution>('/insights/distribution');

    expect(buckets).toEqual([{ minSalary: 20_000, maxSalary: 40_000, headcount: 1 }]);
  });

  it('filters by country and department', async () => {
    givenEmployees(
      db,
      { department: 'Sales', ...paidInUsd(50_000) },
      { department: 'Engineering', ...paidInUsd(50_000) },
      { department: 'Sales', ...paidInInr(INR_100K_USD) },
    );

    const { buckets } = await get<SalaryDistribution>(
      '/insights/distribution?countryCode=US&department=Sales',
    );

    expect(buckets).toEqual([{ minSalary: 40_000, maxSalary: 60_000, headcount: 1 }]);
  });

  it('returns no buckets when nobody matches', async () => {
    expect((await get<SalaryDistribution>('/insights/distribution')).buckets).toEqual([]);
  });
});

describe('GET /insights/outliers', () => {
  it('lists employees paid above 1.5x or below 0.5x the median of their job title in their country', async () => {
    givenEmployees(
      db,
      { fullName: 'Peer 1', ...paidInUsd(100_000) },
      { fullName: 'Peer 2', ...paidInUsd(100_000) },
      { fullName: 'Peer 3', ...paidInUsd(100_000) },
      { fullName: 'High', ...paidInUsd(200_000) },
      { fullName: 'Low', ...paidInUsd(40_000) },
    );

    const body = await get<OutliersResponse>('/insights/outliers');

    expect(body).toMatchObject({ total: 2, page: 1, pageSize: 50 });
    expect(body.items).toMatchObject([
      { fullName: 'High', salaryUsd: 200_000, peerMedianSalaryUsd: 100_000, ratioToPeerMedian: 2 },
      { fullName: 'Low', salaryUsd: 40_000, peerMedianSalaryUsd: 100_000, ratioToPeerMedian: 0.4 },
    ]);
  });

  it('compares employees only with peers in the same country', async () => {
    givenEmployees(
      db,
      ...[100_000, 100_000, 100_000].map(paidInUsd),
      ...[2_490_000, 2_490_000, 2_490_000].map(paidInInr), // 30,000 USD each: low vs US, normal locally
    );

    expect((await get<OutliersResponse>('/insights/outliers')).total).toBe(0);
  });

  it('finds the deliberate outliers in the seeded data', async () => {
    seedDatabase(db, generateEmployees({ seed: 42, count: 10_000 }));

    expect((await get<OutliersResponse>('/insights/outliers')).total).toBeGreaterThan(0);
  });

  it('rejects a page size above 50', async () => {
    const response = await request(app).get('/insights/outliers?pageSize=51');

    expect(response.status).toBe(400);
    expect(response.body.error.fields.pageSize).toBeDefined();
  });
});

describe('insights performance', () => {
  it.each([
    '/insights/summary',
    '/insights/by-country',
    '/insights/by-job-title',
    '/insights/by-job-title?countryCode=IN',
    '/insights/distribution',
    '/insights/outliers',
  ])('answers %s for 10,000 employees in well under a second', async (path) => {
    seedDatabase(db, generateEmployees({ seed: 42, count: 10_000 }));

    const startedAt = performance.now();
    await request(app).get(path).expect(200);

    expect(performance.now() - startedAt).toBeLessThan(500);
  });
});
