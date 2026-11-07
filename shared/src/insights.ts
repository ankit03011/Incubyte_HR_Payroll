import type { Employee, Page } from './api';

/** Salary statistics in `currencyCode`, major units. Payroll totals are always USD. */
export interface SalaryStatistics {
  currencyCode: string;
  headcount: number;
  minSalary: number;
  medianSalary: number;
  meanSalary: number;
  maxSalary: number;
  totalPayrollUsd: number;
}

export interface InsightsSummary {
  headcount: number;
  totalPayrollUsd: number;
  /** null when there are no employees. */
  meanSalaryUsd: number | null;
  medianSalaryUsd: number | null;
}

/** Local currency: each country pays in one currency, so no conversion is needed. */
export interface CountryInsight extends SalaryStatistics {
  countryCode: string;
}

/** USD across countries; local currency when filtered by `countryCode`. */
export interface JobTitleInsight extends SalaryStatistics {
  jobTitle: string;
}

export interface CountryInsightsResponse {
  items: CountryInsight[];
}

export interface JobTitleInsightsResponse {
  items: JobTitleInsight[];
}

export const DISTRIBUTION_BUCKET_SIZE_USD = 20_000;

/** [minSalary, maxSalary) in USD. */
export interface SalaryBucket {
  minSalary: number;
  maxSalary: number;
  headcount: number;
}

export interface SalaryDistribution {
  currencyCode: 'USD';
  bucketSize: number;
  /** Contiguous from the lowest to the highest occupied bucket; empty when nobody matches. */
  buckets: SalaryBucket[];
}

/** Paid above `above` x or below `below` x the median for the same job title and country. */
export const OUTLIER_THRESHOLDS = { above: 1.5, below: 0.5 } as const;
export const MAX_OUTLIERS_PAGE_SIZE = 50;

export interface SalaryOutlier extends Employee {
  salaryUsd: number;
  peerMedianSalaryUsd: number;
  ratioToPeerMedian: number;
}

/** Most overpaid first, most underpaid last. */
export type OutliersResponse = Page<SalaryOutlier>;
