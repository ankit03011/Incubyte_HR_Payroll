import {
  DISTRIBUTION_BUCKET_SIZE_USD,
  OUTLIER_THRESHOLDS,
  toMajorUnits,
  type CountryInsightsResponse,
  type InsightsSummary,
  type JobTitleInsightsResponse,
  type OutliersResponse,
  type SalaryDistribution,
  type SalaryStatistics,
} from '@hr/shared';
import type {
  InsightsFilter,
  InsightsRepository,
  StatsRow,
} from '../repositories/insightsRepository';
import { toEmployee } from './employeeService';

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** USD amounts are rounded to cents only here, after aggregating, never per row. */
const roundUsd = (value: number): number => roundTo(value, 2);

/** Converts an aggregate in local minor units (e.g. a mean of 1234.5 cents) to major units. */
const toLocal = (currencyCode: string) => (minor: number) =>
  toMajorUnits(Math.round(minor), currencyCode);

/** Statistics rows always have at least one employee, so the aggregates are never null. */
function toStatistics(
  row: StatsRow,
  currencyCode: string,
  convert: (amount: number) => number,
): SalaryStatistics {
  const value = (amount: number | null): number => convert(amount ?? 0);
  return {
    currencyCode,
    headcount: row.headcount,
    minSalary: value(row.min),
    medianSalary: value(row.median),
    meanSalary: value(row.mean),
    maxSalary: value(row.max),
    totalPayrollUsd: roundUsd(row.totalPayrollUsd),
  };
}

export function createInsightsService(repository: InsightsRepository) {
  return {
    summary(): InsightsSummary {
      const row = repository.summary();
      const usdOrNull = (amount: number | null) => (amount === null ? null : roundUsd(amount));
      return {
        headcount: row.headcount,
        totalPayrollUsd: roundUsd(row.totalPayrollUsd),
        meanSalaryUsd: usdOrNull(row.mean),
        medianSalaryUsd: usdOrNull(row.median),
      };
    },

    byCountry(): CountryInsightsResponse {
      return {
        items: repository.byCountry().map(({ countryCode, currencyCode, ...row }) => ({
          countryCode,
          ...toStatistics(row, currencyCode, toLocal(currencyCode)),
        })),
      };
    },

    byJobTitle({ countryCode }: { countryCode?: string | undefined }): JobTitleInsightsResponse {
      const items = countryCode
        ? repository.byJobTitleInCountry(countryCode).map(({ jobTitle, currencyCode, ...row }) => ({
            jobTitle,
            ...toStatistics(row, currencyCode, toLocal(currencyCode)),
          }))
        : repository.byJobTitleInUsd().map(({ jobTitle, ...row }) => ({
            jobTitle,
            ...toStatistics(row, 'USD', roundUsd),
          }));
      return { items };
    },

    distribution(filter: InsightsFilter): SalaryDistribution {
      const bucketSize = DISTRIBUTION_BUCKET_SIZE_USD;
      const counts = repository.usdBucketCounts(bucketSize, filter);
      const first = counts[0]?.bucket;
      const last = counts.at(-1)?.bucket;
      if (first === undefined || last === undefined) {
        return { currencyCode: 'USD', bucketSize, buckets: [] };
      }

      const headcountByBucket = new Map(counts.map((c) => [c.bucket, c.headcount]));
      const buckets = Array.from({ length: last - first + 1 }, (_, offset) => {
        const bucket = first + offset;
        return {
          minSalary: bucket * bucketSize,
          maxSalary: (bucket + 1) * bucketSize,
          headcount: headcountByBucket.get(bucket) ?? 0,
        };
      });
      return { currencyCode: 'USD', bucketSize, buckets };
    },

    outliers({ page, pageSize }: { page: number; pageSize: number }): OutliersResponse {
      const { items, total } = repository.outliers({
        ...OUTLIER_THRESHOLDS,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      return {
        items: items.map(({ salaryUsd, peerMedianSalaryUsd, ratioToPeerMedian, ...record }) => ({
          ...toEmployee(record),
          salaryUsd: roundUsd(salaryUsd),
          peerMedianSalaryUsd: roundUsd(peerMedianSalaryUsd),
          ratioToPeerMedian: roundTo(ratioToPeerMedian, 2),
        })),
        total,
        page,
        pageSize,
      };
    },
  };
}

export type InsightsService = ReturnType<typeof createInsightsService>;
