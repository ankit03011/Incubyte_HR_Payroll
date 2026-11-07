import type { Db } from '../db/createDb.js';
import { SALARY_IN_USD, employeeColumns } from '../db/sql.js';
import type { EmployeeRecord } from './employeeRepository.js';

export interface InsightsFilter {
  countryCode?: string | undefined;
  department?: string | undefined;
}

/** Raw statistics; amounts are in whatever unit the query aggregated (minor units or USD). */
export interface StatsRow {
  headcount: number;
  min: number | null;
  median: number | null;
  mean: number | null;
  max: number | null;
  totalPayrollUsd: number;
}

export type OutlierRecord = EmployeeRecord & {
  salaryUsd: number;
  peerMedianSalaryUsd: number;
  ratioToPeerMedian: number;
};

/** The two ways a salary can be aggregated without mixing currencies. */
const AMOUNT = { localMinor: 'salary_minor', usd: SALARY_IN_USD } as const;

const GROUP_COLUMNS = {
  countryCode: 'country_code',
  currencyCode: 'currency_code',
  jobTitle: 'job_title',
} as const;
type GroupKey = keyof typeof GROUP_COLUMNS;

function buildWhere(filter: InsightsFilter): { sql: string; params: Record<string, string> } {
  const conditions: string[] = [];
  const params: Record<string, string> = {};
  if (filter.countryCode) {
    conditions.push('country_code = @countryCode');
    params.countryCode = filter.countryCode;
  }
  if (filter.department) {
    conditions.push('department = @department');
    params.department = filter.department;
  }
  return { sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

/**
 * Median: rank rows within each group, then average the middle one (odd count) or two (even
 * count). For n rows the middle positions are (n+1)/2 and (n+2)/2 in integer division.
 */
const MEDIAN_OF_AMOUNT = 'AVG(CASE WHEN position IN ((n + 1) / 2, (n + 2) / 2) THEN amount END)';

export function createInsightsRepository(db: Db) {
  function salaryStatistics<K extends GroupKey>(
    groupBy: readonly K[],
    amount: string,
    filter: InsightsFilter = {},
  ): (StatsRow & Record<K, string>)[] {
    const columns = groupBy.map((key) => GROUP_COLUMNS[key]);
    const partition = columns.length ? `PARTITION BY ${columns.join(', ')}` : '';
    const where = buildWhere(filter);

    const sql = `
      WITH scoped AS (
        SELECT ${[...columns, `${amount} AS amount`, `${SALARY_IN_USD} AS usd`].join(', ')}
          FROM employees ${where.sql}
      ),
      ranked AS (
        SELECT *, ROW_NUMBER() OVER (${partition} ORDER BY amount) AS position,
               COUNT(*) OVER (${partition}) AS n
          FROM scoped
      )
      SELECT ${groupBy.map((key) => `${GROUP_COLUMNS[key]} AS ${key}, `).join('')}
             COUNT(*) AS headcount, MIN(amount) AS min, MAX(amount) AS max,
             AVG(amount) AS mean, ${MEDIAN_OF_AMOUNT} AS median,
             COALESCE(SUM(usd), 0) AS totalPayrollUsd
        FROM ranked
       ${columns.length ? `GROUP BY ${columns.join(', ')}` : ''}
       ORDER BY ${['headcount DESC', ...groupBy].join(', ')}`;

    return db.prepare<Record<string, string>, StatsRow & Record<K, string>>(sql).all(where.params);
  }

  const outliersCte = `
    WITH scoped AS (
      SELECT id, country_code, job_title, ${SALARY_IN_USD} AS amount FROM employees
    ),
    ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY country_code, job_title ORDER BY amount) AS position,
             COUNT(*) OVER (PARTITION BY country_code, job_title) AS n
        FROM scoped
    ),
    peer_medians AS (
      SELECT country_code, job_title, ${MEDIAN_OF_AMOUNT} AS median
        FROM ranked GROUP BY country_code, job_title
    ),
    outliers AS (
      SELECT scoped.id, scoped.amount AS salaryUsd, peer_medians.median AS peerMedianSalaryUsd
        FROM scoped JOIN peer_medians USING (country_code, job_title)
       WHERE scoped.amount > @above * peer_medians.median
          OR scoped.amount < @below * peer_medians.median
    )`;

  return {
    /** Organisation-wide, in USD. */
    summary(): StatsRow {
      const [row] = salaryStatistics([], AMOUNT.usd);
      if (!row) throw new Error('An aggregate without GROUP BY always returns one row');
      return row;
    },

    /** Per country, in local minor units. Grouped by currency too, so currencies never mix. */
    byCountry() {
      return salaryStatistics(['countryCode', 'currencyCode'], AMOUNT.localMinor);
    },

    /** Per job title across all countries, in USD. */
    byJobTitleInUsd() {
      return salaryStatistics(['jobTitle'], AMOUNT.usd);
    },

    /** Per job title within one country, in local minor units. */
    byJobTitleInCountry(countryCode: string) {
      return salaryStatistics(['jobTitle', 'currencyCode'], AMOUNT.localMinor, { countryCode });
    },

    /** Headcount per USD bucket index (salary / bucketSize), occupied buckets only. */
    usdBucketCounts(
      bucketSize: number,
      filter: InsightsFilter,
    ): { bucket: number; headcount: number }[] {
      const where = buildWhere(filter);
      // Rounding to cents first stops float noise (e.g. 39999.999999) landing in the wrong bucket.
      return db
        .prepare<Record<string, string | number>, { bucket: number; headcount: number }>(
          `SELECT CAST(ROUND(${SALARY_IN_USD}, 2) / @bucketSize AS INTEGER) AS bucket,
                  COUNT(*) AS headcount
             FROM employees ${where.sql}
            GROUP BY bucket ORDER BY bucket`,
        )
        .all({ ...where.params, bucketSize });
    },

    outliers(options: { above: number; below: number; limit: number; offset: number }): {
      items: OutlierRecord[];
      total: number;
    } {
      const items = db
        .prepare<typeof options, OutlierRecord>(
          `${outliersCte}
           SELECT ${employeeColumns('employees')}, outliers.salaryUsd, outliers.peerMedianSalaryUsd,
                  outliers.salaryUsd / outliers.peerMedianSalaryUsd AS ratioToPeerMedian
             FROM outliers JOIN employees ON employees.id = outliers.id
            ORDER BY ratioToPeerMedian DESC, employees.id
            LIMIT @limit OFFSET @offset`,
        )
        .all(options);
      const total = db
        .prepare<{ above: number; below: number }, { count: number }>(
          `${outliersCte} SELECT COUNT(*) AS count FROM outliers`,
        )
        .get({ above: options.above, below: options.below });

      return { items, total: total?.count ?? 0 };
    },
  };
}

export type InsightsRepository = ReturnType<typeof createInsightsRepository>;
